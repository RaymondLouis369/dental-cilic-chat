# Phase 10.3 Implementation Notes — Human Escalation & Staff Reply Workflow

## 1. Overview & Objectives
Phase 10.3 introduces the **Human Escalation & Staff Reply Workflow** for the Dental Clinic & Center Management Platform (Egypt). It allows medical or unresolved patient AI questions to seamlessly escalate to human clinic staff without generating unauthorized prescriptions or definitive medical diagnoses.

## 2. Delivered Components & Schema

### Database Migration (`/supabase/migrations/20260912000010_phase10_3_human_escalation_schema.sql`)
- **`public.human_escalations`**:
  - Columns: `id`, `organization_id`, `branch_id`, `patient_id`, `chat_message_id`, `category`, `priority`, `status`, `assigned_staff_id`, `assigned_staff_name`, `assigned_staff_role`, `subject`, `original_prompt`, `ai_response_summary`, `medical_disclaimer`, `created_at`, `updated_at`, `resolved_at`, `resolved_by_id`.
  - Multi-tenant RLS policies for staff role authorization (`center_manager`, `branch_manager`, `doctor`, `receptionist`) and patient privacy isolation.
- **`public.escalation_replies`**:
  - Columns: `id`, `escalation_id`, `sender_type`, `sender_id`, `sender_name`, `sender_role`, `message`, `created_at`.

### Core Storage & Logic (`/src/lib/escalationStorage.ts`)
- **Duplicate Active Responder Prevention**: Prevents two active staff members from claiming or replying to the same active escalation simultaneously. If Staff B attempts to claim or reply to an escalation active for Staff A, it is rejected with a clear error.
- **Medical Safety Disclaimer**: Automatically attaches `MEDICAL_SAFETY_DISCLAIMER` to all escalation items and reminds staff during reply entry.
- **Role Authorization**: Restricts staff management to Medical Managers, Reception Manager, Center Manager, and Dentists (`AUTHORIZED_STAFF_RECIPIENT_ROLES`).
- **State Machine Transitions**: `pending` → `claimed` → `resolved` (or `reopened` / `released`).
- **Notification Engine Integrations**: Emits notifications on escalation creation (`escalation_created`), staff replies (`escalation_reply`), resolution (`escalation_resolved`), and reopening (`escalation_reopened`).

### API Endpoints (`/server.ts`)
- `POST /api/escalations/create`
- `GET /api/escalations/list`
- Express endpoints validate token identity and organization context via `validateServerAuthorization`.

### User Interface & Controls
- **`PatientAIChat.tsx`**: Adds "طلب رد مباشر من مسؤول العيادة" escalation button on assistant messages and medical symptom warnings. Displays escalation status badges and staff replies inline. Does NOT store chat history in `localStorage`.
- **`HumanEscalationsModal.tsx`**: Staff interface for viewing escalations, filtering by status, searching, claiming, releasing, replying, and resolving/reopening.
- **`Header.tsx`**: Staff navigation trigger for opening the Human Escalation modal.
- **`Phase10_3AcceptanceTestRunner.tsx`**: In-app automated test suite runner for Phase 10.3 requirements.

## 3. Verification & Compliance
- **Vitest Suite**: `/tests/phase10-3-human-escalation.test.ts`
- **Security**: No new `admin` or `super_admin` roles added. Server auth, Gemini provider, and RLS policies preserved intact.
