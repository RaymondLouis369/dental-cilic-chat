-- Migration: 20260912000004_allow_shared_mobile_patient_accounts.sql
-- Description: Allow multiple patients to share the same mobile number within the same organization.
-- Removes the UNIQUE(organization_id, mobile_number) constraint on public.patient_accounts
-- and replaces it with a per-patient unique constraint on patient_id.

-- 1. Remove the unique constraint on (organization_id, mobile_number)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.patient_accounts'::regclass
          AND contype = 'u'
          AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.patient_accounts'::regclass AND attname = 'organization_id'),
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.patient_accounts'::regclass AND attname = 'mobile_number')
          ]
    ) LOOP
        EXECUTE 'ALTER TABLE public.patient_accounts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.patient_accounts
DROP CONSTRAINT IF EXISTS patient_accounts_organization_id_mobile_number_key;

-- 2. Ensure a non-unique index exists for high-performance mobile number lookups
CREATE INDEX IF NOT EXISTS idx_patient_accounts_org_mobile
ON public.patient_accounts(organization_id, mobile_number);

-- 3. Ensure each patient record has at most one discrete account (unique on patient_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_patient_accounts_patient_id'
           OR (conrelid = 'public.patient_accounts'::regclass AND contype = 'u' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.patient_accounts'::regclass AND attname = 'patient_id')])
    ) THEN
        ALTER TABLE public.patient_accounts
        ADD CONSTRAINT uq_patient_accounts_patient_id UNIQUE (patient_id);
    END IF;
END $$;
