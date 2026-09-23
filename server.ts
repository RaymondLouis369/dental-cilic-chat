import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { routeAIQuery } from './src/lib/ai/aiRouter';
import { validateServerAuthorization } from './src/lib/ai/serverAuth';
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
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
