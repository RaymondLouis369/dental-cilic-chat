import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { routeAIQuery } from './src/lib/ai/aiRouter';
import { validateServerAuthorization, validateAppointmentAuthorization } from './src/lib/ai/serverAuth';
import {
  generateDoctorSlots,
  createAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  getFilteredAppointments,
  getPatientAppointments,
  checkAppointmentConflict,
} from './src/lib/appointmentService';
import {
  createHumanEscalation,
  getEscalationsForUser,
  getEscalationWithReplies,
  claimHumanEscalation,
  releaseHumanEscalation,
  addEscalationReply,
  resolveHumanEscalation,
  reopenHumanEscalation,
} from './src/lib/escalationStorage';
import { getStoredPatients } from './src/lib/patientStorage';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // In-memory sliding-window rate limiter for sensitive API routes
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const createRateLimiter = (maxRequests: number, windowMs: number) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown_ip';
      const now = Date.now();
      const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
      } else {
        record.count += 1;
      }

      rateLimitMap.set(ip, record);

      if (record.count > maxRequests) {
        res.status(429).json({
          error: 'Rate limit exceeded: Too many requests. Please try again later.',
          text: 'تم تجاوز حد الطلبات المسموح به. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.',
        });
        return;
      }
      next();
    };
  };

  const apiRateLimiter = createRateLimiter(60, 60 * 1000); // 60 requests per minute
  const aiRateLimiter = createRateLimiter(30, 60 * 1000); // 30 AI queries per minute

  app.use('/api/', apiRateLimiter);
  app.use('/api/ai/', aiRateLimiter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Dental Clinic & Dental Center Management Platform',
      version: '1.0.0-wave5',
      environment: process.env.NODE_ENV || 'development',
      hasGeminiPrimary: Boolean(process.env.GEMINI_API_KEY),
      hasGeminiFallback: Boolean(process.env.GEMINI_API_KEY2),
      timestamp: new Date().toISOString(),
    });
  });

  // AI Router Endpoint (Server-Side Proxy for AI calls)
  app.post('/api/ai/query', async (req, res) => {
    try {
      const { prompt, patientId, targetPatientId, requesterPatientId, organizationId } = req.body || {};

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required and must be a string' });
        return;
      }

      // Server-side authorization validation (Token-derived identity + RLS relationship check)
      const authResult = await validateServerAuthorization({
        authorizationHeader: req.headers.authorization,
        requesterPatientIdBody: requesterPatientId || patientId,
        targetPatientIdBody: targetPatientId || patientId,
        organizationIdBody: organizationId,
      });

      if (!authResult.authorized || !authResult.context) {
        res.status(authResult.statusCode).json({
          error: authResult.error || 'Access Denied',
          source: 'fallback_system',
        });
        return;
      }

      // Construct verified server context
      const userContext = {
        organizationId: authResult.context.organizationId,
        patientId: authResult.context.targetPatientId,
        isAuthenticated: authResult.context.isAuthenticated,
      };

      const result = await routeAIQuery({
        prompt,
        context: userContext,
      });

      // Ensure API keys and sensitive tokens are NEVER returned in response
      const sanitizedResponse = {
        text: result.text,
        source: result.source,
        isMedicalEscalation: result.isMedicalEscalation,
        language: result.language,
        category: result.category,
        error: result.error,
      };

      res.json(sanitizedResponse);
    } catch (err: any) {
      console.error('Error in /api/ai/query:', err);
      res.status(500).json({
        error: 'Internal server error processing AI query',
        text: 'حدث خطأ في معالجة طلبك، يرجى المحاولة مرة أخرى لاحقاً.',
        source: 'fallback_system',
        language: 'ar',
      });
    }
  });

  // Escalation API Endpoints
  app.post('/api/escalations/create', async (req, res) => {
    try {
      const { patientId, targetPatientId, organizationId, branchId, subject, originalPrompt, category, priority } = req.body || {};

      const authResult = await validateServerAuthorization({
        authorizationHeader: req.headers.authorization,
        targetPatientIdBody: targetPatientId || patientId,
        organizationIdBody: organizationId,
      });

      if (!authResult.authorized || !authResult.context) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const escalation = createHumanEscalation({
        organization_id: authResult.context.organizationId,
        branch_id: branchId,
        patient_id: authResult.context.targetPatientId!,
        subject: subject || 'استفسار مرفوع لمسؤول العيادة',
        original_prompt: originalPrompt || subject,
        category,
        priority,
      });

      res.json({ success: true, escalation });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error creating escalation' });
    }
  });

  app.get('/api/escalations/list', async (req, res) => {
    try {
      const { patientId, organizationId } = req.query as any;

      const authResult = await validateServerAuthorization({
        authorizationHeader: req.headers.authorization,
        targetPatientIdBody: patientId,
        organizationIdBody: organizationId,
      });

      if (!authResult.authorized || !authResult.context) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const patients = getStoredPatients();
      const pat = patients.find((p) => p.id === authResult.context!.targetPatientId);

      if (!pat) {
        res.status(404).json({ error: 'Patient context not found' });
        return;
      }

      const list = getEscalationsForUser({
        kind: 'patient',
        patient: pat,
        organization_id: authResult.context.organizationId,
      });

      res.json({ success: true, escalations: list });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error listing escalations' });
    }
  });

  // ==========================================
  // Phase 11.1: Appointment & Scheduling APIs
  // ==========================================

  // 1. Generate available slots from doctor working schedules
  app.get('/api/appointments/slots', async (req, res) => {
    try {
      const { doctorId, branchId, date, durationMinutes } = req.query as any;

      if (!doctorId || !branchId || !date) {
        res.status(400).json({ error: 'doctorId, branchId, and date are required parameters' });
        return;
      }

      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: req.headers.authorization,
        organizationIdHeader: req.headers['x-organization-id'] as string,
        branchId,
      });

      if (!authResult.authorized || !authResult.caller) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const slots = generateDoctorSlots(
        doctorId,
        branchId,
        date,
        durationMinutes ? parseInt(durationMinutes, 10) : 30
      );

      res.json({ success: true, slots });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error generating slots' });
    }
  });

  // 2. Filtered Appointments List (Staff & Patient authorized RLS)
  app.get('/api/appointments/list', async (req, res) => {
    try {
      const { branch_id, doctor_id, date, start_date, end_date, status, appointment_type, search, patient_id } = req.query as any;

      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: req.headers.authorization,
        organizationIdHeader: req.headers['x-organization-id'] as string,
        targetPatientId: patient_id,
        branchId: branch_id,
      });

      if (!authResult.authorized || !authResult.caller) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const appointments = getFilteredAppointments(
        {
          branch_id,
          doctor_id,
          date,
          start_date,
          end_date,
          status,
          appointment_type,
          search,
          patient_id,
        },
        authResult.caller
      );

      res.json({ success: true, appointments });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error listing appointments' });
    }
  });

  // 3. Patient Appointments (Upcoming & Previous for Patient or Authorized Guardian)
  app.get('/api/appointments/patient', async (req, res) => {
    try {
      const { patientId } = req.query as any;

      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: req.headers.authorization,
        organizationIdHeader: req.headers['x-organization-id'] as string,
        targetPatientId: patientId,
      });

      if (!authResult.authorized || !authResult.caller) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const targetId = patientId || authResult.caller.patientId;
      if (!targetId) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      const result = getPatientAppointments(targetId, authResult.caller);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error getting patient appointments' });
    }
  });

  // 4. Create Appointment with Server Conflict Validation
  app.post('/api/appointments/create', async (req, res) => {
    try {
      const {
        branch_id,
        patient_id,
        doctor_id,
        date,
        start_time,
        end_time,
        duration_minutes,
        appointment_type,
        service_id,
        treatment_plan_id,
        treatment_service_id,
        notes,
      } = req.body || {};

      if (!branch_id || !patient_id || !doctor_id || !date || !start_time) {
        res.status(400).json({
          error: 'Missing required fields: branch_id, patient_id, doctor_id, date, start_time are mandatory',
        });
        return;
      }

      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: req.headers.authorization,
        organizationIdHeader: req.headers['x-organization-id'] as string,
        targetPatientId: patient_id,
        branchId: branch_id,
      });

      if (!authResult.authorized || !authResult.caller) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const result = createAppointment(
        {
          branch_id,
          patient_id,
          doctor_id,
          date,
          start_time,
          end_time,
          duration_minutes,
          appointment_type,
          service_id,
          treatment_plan_id,
          treatment_service_id,
          notes,
        },
        authResult.caller
      );

      if (!result.success) {
        const statusCode = result.error?.includes('ERR_APPOINTMENT_CONFLICT') ? 409 : 400;
        res.status(statusCode).json({ error: result.error });
        return;
      }

      res.status(201).json({ success: true, appointment: result.appointment });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error creating appointment' });
    }
  });

  // 5. Reschedule Appointment with Conflict Validation
  app.post('/api/appointments/reschedule', async (req, res) => {
    try {
      const { appointment_id, new_date, new_start_time, new_end_time, reason } = req.body || {};

      if (!appointment_id || !new_date || !new_start_time) {
        res.status(400).json({
          error: 'Missing required fields: appointment_id, new_date, and new_start_time are required',
        });
        return;
      }

      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: req.headers.authorization,
        organizationIdHeader: req.headers['x-organization-id'] as string,
      });

      if (!authResult.authorized || !authResult.caller) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const result = rescheduleAppointment(
        {
          appointment_id,
          new_date,
          new_start_time,
          new_end_time,
          reason,
        },
        authResult.caller
      );

      if (!result.success) {
        const statusCode = result.error?.includes('ERR_APPOINTMENT_CONFLICT') ? 409 : 400;
        res.status(statusCode).json({ error: result.error });
        return;
      }

      res.json({ success: true, appointment: result.appointment });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error rescheduling appointment' });
    }
  });

  // 6. Update Status (Confirm, Cancel, Check-in, Complete, No-Show)
  app.post('/api/appointments/status', async (req, res) => {
    try {
      const { appointment_id, status, cancellation_reason } = req.body || {};

      if (!appointment_id || !status) {
        res.status(400).json({ error: 'appointment_id and status are required' });
        return;
      }

      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: req.headers.authorization,
        organizationIdHeader: req.headers['x-organization-id'] as string,
      });

      if (!authResult.authorized || !authResult.caller) {
        res.status(authResult.statusCode).json({ error: authResult.error || 'Unauthorized' });
        return;
      }

      const result = updateAppointmentStatus(
        appointment_id,
        status,
        cancellation_reason,
        authResult.caller
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, appointment: result.appointment });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error updating appointment status' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
      }
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
