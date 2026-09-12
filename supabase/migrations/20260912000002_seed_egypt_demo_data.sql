-- ========================================================================
-- DENTAL CLINIC & DENTAL CENTER SAAS — EGYPT
-- Seed Data Migration: Egyptian Demo Organization, Branches, Roles & Staff
-- ========================================================================

-- 1. INSERT THE 7 REQUIRED INTERNAL ROLES
INSERT INTO public.roles (id, key, name_en, name_ar, description_en, description_ar, is_org_wide)
VALUES
('role_center_manager', 'center_manager', 'Center Manager', 'مدير المركز / المؤسسة', 'Organization-wide administrative authority across all Egyptian branches', 'صلاحيات إدارية شاملة على مستوى المركز وفروعه في مصر', true),
('role_branch_manager', 'branch_manager', 'Branch Manager', 'مدير الفرع / العيادة', 'Branch-scoped operational and staff management for assigned dental branches', 'إدارة تشغيلية للموظفين والفرع ضمن نطاق الفروع المخصصة فقط', false),
('role_receptionist', 'receptionist', 'Receptionist', 'موظف الاستقبال', 'Front desk reception access strictly isolated to assigned dental branch', 'صلاحيات مكتب الاستقبال محصورة بالفرع المعين فيه فقط', false),
('role_doctor', 'doctor', 'Dentist / Doctor', 'طبيب أسنان', 'Clinical workspace access restricted to assigned dental branches in Egypt', 'طبيب الأسنان المعالج، محصور بفروع العمل السريرية المسندة إليه', false),
('role_prosthetic_coordinator', 'prosthetic_coordinator', 'Prosthetic Coordinator', 'منسق تركيبات ومعامل', 'Dental prosthetic and lab coordination inside the dental center', 'تنسيق طلبات التركيبات السنية والتواصل مع معامل الأسنان داخل المركز', false),
('role_lab_user', 'lab_user', 'Dental Lab Technician / User', 'فني معمل أسنان', 'Restricted strictly to assigned dental prosthetic laboratory scope', 'صلاحيات تقنية محصورة بنطاق أعمال معمل الأسنان المخصص له فقط', false),
('role_delivery_user', 'delivery_user', 'Dental Delivery / Transport User', 'مندوب توصيل واستلام المعامل', 'Restricted strictly to dental case delivery and logistics transit scope', 'صلاحيات محصورة بنطاق استلام وتسليم حالات التركيبات والمعامل', false)
ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_ar = EXCLUDED.name_ar,
    description_en = EXCLUDED.description_en,
    description_ar = EXCLUDED.description_ar,
    is_org_wide = EXCLUDED.is_org_wide;

-- 2. INSERT SYSTEM PERMISSIONS
INSERT INTO public.permissions (id, key, name_en, name_ar, category, description_en, description_ar)
VALUES
('perm_org_read', 'organization.read', 'View Organization', 'عرض بيانات المؤسسة', 'organization', 'Read organization profile and metadata', 'الاطلاع على بيانات المؤسسة والمركز السني'),
('perm_org_manage', 'organization.manage', 'Manage Organization', 'إدارة إعدادات المؤسسة', 'organization', 'Update parameters, currency, timezone, and defaults', 'تعديل العملة والتوقيت وإعدادات المركز'),
('perm_branch_read', 'branch.read', 'View Branches', 'عرض الفروع', 'branch', 'Read branches in authorized scope', 'عرض الفروع ضمن النطاق المصرح به'),
('perm_branch_create', 'branch.create', 'Create Branch', 'إنشاء فرع جديد', 'branch', 'Provision a new dental branch in Egypt', 'إضافة عيادة أو فرع جديد في مصر'),
('perm_branch_update', 'branch.update', 'Update Branch', 'تعديل بيانات الفرع', 'branch', 'Edit branch contact and details', 'تحديث بيانات التواصل للفرع'),
('perm_branch_manage', 'branch.manage', 'Manage Branches', 'إدارة الفروع الكاملة', 'branch', 'Administer all branch settings and scopes', 'التحكم الكامل في إعدادات الفروع'),
('perm_user_read', 'user.read', 'View Staff', 'عرض موظفي المركز', 'user', 'View staff profiles and branch assignments', 'عرض ملفات الطاقم الداخلي والفروع'),
('perm_user_create', 'user.create', 'Create Staff Account', 'إضافة مستخدم داخلي', 'user', 'Provision internal dental staff account', 'إنشاء حساب مستخدم داخلي'),
('perm_user_update', 'user.update', 'Update Staff', 'تحديث بيانات المستخدم', 'user', 'Update internal user details', 'تعديل بيانات الطاقم الداخلي'),
('perm_user_manage', 'user.manage', 'Manage Staff & Scopes', 'إدارة الموظفين ونطاقات الفروع', 'user', 'Assign roles and branch scopes', 'ربط الموظفين بالفروع وتعيين الأدوار'),
('perm_permission_read', 'permission.read', 'View Permissions', 'عرض سجل الصلاحيات', 'permission', 'Inspect permission matrix', 'عرض جدول توزيع الصلاحيات'),
('perm_permission_manage', 'permission.manage', 'Manage Permissions', 'إدارة الصلاحيات', 'permission', 'Modify permissions assigned to roles', 'تعديل الصلاحيات الممنوحة للأدوار'),
('perm_audit_read', 'audit.read', 'View Audit Logs', 'عرض سجل الرقابة والأمان', 'audit', 'Review immutable audit events', 'الاطلاع على سجلات الرقابة غير القابلة للتعديل'),
('perm_patient_read', 'patient.read', 'Patient Records Access (Future)', 'ملفات المرضى (مرحلة قادمة)', 'patient', 'Prepared key for future phases', 'مفتاح صلاحية مجهز للمراحل القادمة')
ON CONFLICT (id) DO NOTHING;

-- 3. INSERT DEMO EGYPTIAN ORGANIZATION
INSERT INTO public.organizations (id, name, code, country, currency, timezone, phone_country_code, default_language, active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Dental Demo Egypt',
    'ORG-EGY-001',
    'Egypt',
    'EGP',
    'Africa/Cairo',
    '+20',
    'ar',
    true
) ON CONFLICT (id) DO NOTHING;

-- 4. INSERT DEMO EGYPTIAN BRANCHES
INSERT INTO public.branches (id, organization_id, name, code, address, city, phone, timezone, active)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Cairo Branch - Maadi',
    'BR-CAI-01',
    'Street 9, Maadi, Cairo Governorate',
    'Cairo',
    '+20 2 2358 1234',
    'Africa/Cairo',
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'Alexandria Branch - Smouha',
    'BR-ALX-01',
    'Fawzi Moaz St, Smouha, Alexandria Governorate',
    'Alexandria',
    '+20 3 4291 5678',
    'Africa/Cairo',
    true
),
(
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    'Giza Branch - Dokki',
    'BR-GIZ-01',
    'Musaddaq St, Dokki, Giza Governorate',
    'Giza',
    '+20 2 3762 9876',
    'Africa/Cairo',
    true
) ON CONFLICT (id) DO NOTHING;

-- Initial audit log entry recording organization establishment
INSERT INTO public.audit_logs (organization_id, branch_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'system_seed',
    'system@dental-saas.eg',
    'organization.update',
    'organization',
    '00000000-0000-0000-0000-000000000001',
    '{"reason": "Phase 1 Egyptian Dental SaaS Foundation Bootstrap"}'::jsonb
);
