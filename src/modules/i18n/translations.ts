export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export const translations = {
  ar: {
    // App Header & Branding
    appName: 'منصة إدارة مراكز وعيادات الأسنان — مصر',
    shortAppName: 'منصة الأسنان',
    tagline: 'النظام السحابي لإدارة عيادات ومراكز طب الأسنان المتعددة الفروع',
    countryLabel: 'مصر',
    currencyLabel: 'ج.م (جنيه مصري)',
    timezoneLabel: 'أفريقيا/القاهرة',

    // Roles (All 7 required)
    roles: {
      center_manager: 'مدير المركز / المؤسسة',
      branch_manager: 'مدير الفرع / العيادة',
      receptionist: 'موظف الاستقبال',
      doctor: 'طبيب أسنان',
      prosthetic_coordinator: 'منسق تركيبات ومعامل الأسنان',
      lab_user: 'فني معمل أسنان',
      delivery_user: 'مندوب تسليم وتوصيل المعامل',
    },

    // Navigation & Placeholders
    nav: {
      dashboard: 'لوحة المؤشرات',
      organization: 'إعدادات المؤسسة',
      branches: 'فروع عيادات الأسنان',
      users: 'فريق العمل والمستخدمين',
      permissions: 'سجل الصلاحيات',
      audit: 'سجل الرقابة والأمان',
      operations: 'العمليات التشغيلية (مرحلة قادمة)',
      reception: 'مكتب الاستقبال (مرحلة قادمة)',
      doctorWorkspace: 'عيادة الطبيب (مرحلة قادمة)',
      labCoordination: 'تنسيق التركيبات والمعامل (مرحلة قادمة)',
      labWorkspace: 'معمل الأسنان (مرحلة قادمة)',
      deliveryWorkspace: 'اللوجستيات والتوصيل (مرحلة قادمة)',
      testsRunner: 'فحص واختبارات المرحلة الأولى',
    },

    // Auth
    auth: {
      title: 'تسجيل الدخول للطاقم الداخلي',
      subtitle: 'نظام إدارة عيادات ومراكز الأسنان في جمهورية مصر العربية',
      emailLabel: 'البريد الإلكتروني للعمل',
      passwordLabel: 'كلمة المرور',
      loginButton: 'تسجيل الدخول',
      logoutButton: 'تسجيل الخروج',
      loggingIn: 'جاري التحقق من الهوية...',
      invalidCredentials: 'بيانات الاعتماد غير صالحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.',
      demoAccountsTitle: 'الحسابات التجريبية للطاقم الداخلي (7 أدوار مصرحة في مصر):',
      switchAccountPrompt: 'اختر حساباً للتجربة المباشرة في بيئة التطوير:',
      scopeSummary: 'نطاق الوصول المعتمد:',
      orgWideAccess: 'وصول شامل لكافة فروع المركز',
      branchScopedAccess: 'وصول محصور بالفروع المحددة فقط',
      currentOrg: 'المؤسسة الطبية:',
      activeRole: 'الدور الوظيفي:',
      assignedBranches: 'الفروع المتاحة:',
      devOnlyBadge: 'بيئة التطوير فقط',
      demoSecurityWarning: 'تنبيه أمني: الحسابات التجريبية وكلمة المرور التجريبية (dental123) مخصصة فقط لاختبارات بيئة التطوير. في الإنتاج، يتم تسجيل الدخول حصرياً عبر خادم المصادقة المشفر وتأكيد الصلاحيات بواسطة RLS.',
      roleSwitchForbiddenProd: 'عملية مرفوضة: تبديل الأدوار محظور تماماً في بيئة الإنتاج.',
    },

    // Organization View
    org: {
      title: 'بيانات المؤسسة والمركز الطبي السني',
      subtitle: 'نموذج مؤسسي موحد يدعم العيادة الفردية والمراكز متعددة الفروع داخل مصر',
      name: 'اسم المركز / العيادة',
      code: 'رمز المركز',
      country: 'الدولة الافتراضية',
      currency: 'العملة الرسمية',
      timezone: 'المنطقة الزمنية',
      phoneCode: 'كود الدولة',
      language: 'اللغة الافتراضية',
      status: 'حالة الترخيص والتشغيل',
      active: 'نشط',
      inactive: 'متوقف',
      editNotPermitted: 'فقط مدير المركز (Center Manager) مخول بتعديل إعدادات المؤسسة.',
      saveSuccess: 'تم حفظ إعدادات المؤسسة بنجاح.',
    },

    // Branches View
    branch: {
      title: 'فروع عيادات ومراكز الأسنان في مصر',
      subtitle: 'عزل أمني كامل على مستوى الفروع بواسطة سياسات Row Level Security',
      addBranch: 'إضافة عيادة أو فرع جديد',
      branchCode: 'كود الفرع',
      branchName: 'اسم الفرع',
      city: 'المحافظة / المدينة',
      address: 'العنوان التفصيلي',
      phone: 'رقم الهاتف المباشر',
      status: 'الحالة التشغيلية',
      onlyAssignedVisible: 'ملاحظة أمنية: يظهر لك فقط الفروع المسندة لصلاحياتك بموجب سياسات RLS.',
      allVisibleForManager: 'مدير المركز: متاح لك استعراض كافة فروع المؤسسة الطبية.',
      noBranchesAssigned: 'لا توجد فروع مسندة إلى حسابك حالياً.',
    },

    // Staff / Users View
    users: {
      title: 'الطاقم الطبي والإداري',
      subtitle: 'إدارة أطباء الأسنان، الاستقبال، منسقي التركيبات، والفنيين ونطاقات فروعهم',
      addUser: 'إضافة فرد جديد للطاقم',
      displayName: 'الاسم بالكامل',
      email: 'البريد الإلكتروني',
      role: 'الدور الوظيفي',
      assignedBranches: 'الفروع المسندة',
      status: 'الحالة',
      active: 'مفعل',
      inactive: 'معطل',
      allBranches: 'كافة الفروع (على مستوى المؤسسة)',
    },

    // Audit Log View
    audit: {
      title: 'سجل الرقابة والأمان غير القابل للتعديل',
      subtitle: 'سجل تدقيق ملحق فقط (Append-Only) محمي بقواعد قاعدة البيانات لمنع الحذف أو التعديل',
      time: 'وقت العملية',
      actor: 'المستخدم / المنفذ',
      action: 'العملية الأمنية',
      entity: 'الكيان المتأثر',
      branch: 'الفرع',
      metadata: 'تفاصيل إضافية',
      empty: 'لا توجد سجلات رقابة حالياً.',
    },

    // Placeholders for Future Phases
    placeholders: {
      phaseNotice: 'هذا المكون هو عنصر نائب (Placeholder) للمرحلة الأولى، وسيتم بناؤه بالكامل في المراحل اللاحقة.',
      noPhase2Notice: 'وفقاً لمحددات المرحلة الأولى الصارمة: لا يتم بناء بوابات المرضى أو حجز المواعيد أو الفواتير أو الذكاء الاصطناعي في هذه المرحلة.',
      receptionTitle: 'مساحة عمل موظف الاستقبال — مكتب الاستقبال السني',
      doctorTitle: 'مساحة عمل طبيب الأسنان — العيادة السريرية',
      labCoordTitle: 'مكتب تنسيق تركيبات الأسنان والمعامل',
      labTitle: 'نظام معمل الأسنان الفني',
      deliveryTitle: 'نظام توصيل وتسليم مقاسات وتركيبات الأسنان',
      operationsTitle: 'إدارة العمليات والجدولة السنية',
    },

    // PWA & Connectivity
    pwa: {
      installTitle: 'تثبيت التطبيق على جهازك',
      installBtn: 'تثبيت المنصة كـ PWA',
      installIOS: 'تثبيت على آيفون / آيباد',
      iosInstructions: 'اضغط على زر المشاركة (Share) في متصفح سفاري ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).',
      offlineBanner: 'وضع عدم الاتصال — يتم استخدام البيانات المخزنة مؤقتاً بأمان.',
      onlineBadge: 'متصل بالإنترنت',
      offlineBadge: 'غير متصل',
      close: 'إغلاق',
    },

    // Acceptance Tests
    tests: {
      title: 'منصة الاختبارات والتحقق الآلي للمرحلة الأولى',
      subtitle: 'فحص شامل لجميع معايير القبول الـ 13 المطلوبة للمرحلة التأسيسية',
      runAll: 'تشغيل جميع اختبارات القبول الـ 13',
      running: 'جاري فحص المعايير...',
      passedCount: 'الاختبارات الناجحة:',
      testList: 'قائمة الاختبارات الصارمة للمرحلة الأولى:',
    },

    // General
    common: {
      save: 'حفظ',
      cancel: 'إلغاء',
      close: 'إغلاق',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'تمت العملية بنجاح',
      filter: 'تصفية',
      search: 'بحث...',
      langSwitch: 'English',
    },
  },

  en: {
    // App Header & Branding
    appName: 'Dental Clinic & Dental Center Management Platform — Egypt',
    shortAppName: 'Dental SaaS Egypt',
    tagline: 'Scalable multi-tenant dental management platform for clinics and dental centers',
    countryLabel: 'Egypt',
    currencyLabel: 'EGP (Egyptian Pound)',
    timezoneLabel: 'Africa/Cairo',

    // Roles (All 7 required)
    roles: {
      center_manager: 'Center Manager',
      branch_manager: 'Branch Manager',
      receptionist: 'Receptionist',
      doctor: 'Dentist / Doctor',
      prosthetic_coordinator: 'Prosthetic Coordinator',
      lab_user: 'Dental Lab Technician',
      delivery_user: 'Dental Delivery / Logistics',
    },

    // Navigation & Placeholders
    nav: {
      dashboard: 'Dashboard',
      organization: 'Organization Settings',
      branches: 'Dental Branches',
      users: 'Staff & Internal Users',
      permissions: 'Permissions Registry',
      audit: 'Audit Log',
      operations: 'Operations (Future Phase)',
      reception: 'Reception Workspace (Future Phase)',
      doctorWorkspace: 'Doctor Workspace (Future Phase)',
      labCoordination: 'Prosthetic / Lab Coordination (Future Phase)',
      labWorkspace: 'Dental Lab Workspace (Future Phase)',
      deliveryWorkspace: 'Delivery Workspace (Future Phase)',
      testsRunner: 'Phase 1 Acceptance Tests',
    },

    // Auth
    auth: {
      title: 'Internal Staff Sign In',
      subtitle: 'Dental Clinic & Dental Center Management Platform — Egypt',
      emailLabel: 'Work Email',
      passwordLabel: 'Password',
      loginButton: 'Sign In',
      logoutButton: 'Sign Out',
      loggingIn: 'Authenticating...',
      invalidCredentials: 'Invalid credentials. Please verify your email and password.',
      demoAccountsTitle: 'Egyptian Internal Staff Demo Accounts (All 7 Required Roles):',
      switchAccountPrompt: 'Select a staff persona for immediate development preview testing:',
      scopeSummary: 'Authorized Scope:',
      orgWideAccess: 'Organization-wide access across all branches',
      branchScopedAccess: 'Branch-scoped access to assigned locations only',
      currentOrg: 'Dental Organization:',
      activeRole: 'Active Role:',
      assignedBranches: 'Accessible Branches:',
      devOnlyBadge: 'Development Only',
      demoSecurityWarning: 'Security Notice: Demo accounts and credentials (dental123) are strictly for local/preview testing. In production, authentication is handled by the identity server and authorization is enforced via database RLS.',
      roleSwitchForbiddenProd: 'Action Denied: Role switching is strictly prohibited in production mode.',
    },

    // Organization View
    org: {
      title: 'Dental Organization Profile',
      subtitle: 'Single unified architecture supporting single clinics and multi-branch dental centers across Egypt',
      name: 'Organization / Center Name',
      code: 'Organization Code',
      country: 'Default Country',
      currency: 'Default Currency',
      timezone: 'Default Timezone',
      phoneCode: 'Phone Country Code',
      language: 'Default Language',
      status: 'Operating Status',
      active: 'Active',
      inactive: 'Inactive',
      editNotPermitted: 'Only the Center Manager is authorized to modify organization settings.',
      saveSuccess: 'Organization settings updated successfully.',
    },

    // Branches View
    branch: {
      title: 'Dental Branches in Egypt',
      subtitle: 'PostgreSQL Row Level Security (RLS) guarantees strict branch-level isolation',
      addBranch: 'Add Dental Branch',
      branchCode: 'Branch Code',
      branchName: 'Branch Name',
      city: 'Governorate / City',
      address: 'Address',
      phone: 'Direct Phone',
      status: 'Status',
      onlyAssignedVisible: 'Security notice: Only branches assigned to your account are visible per RLS policies.',
      allVisibleForManager: 'Center Manager: All dental branches in your organization are visible.',
      noBranchesAssigned: 'No branches currently assigned to your account.',
    },

    // Staff / Users View
    users: {
      title: 'Dental Staff & Users',
      subtitle: 'Manage dentists, receptionists, lab coordinators, and branch scopes',
      addUser: 'Add Staff Member',
      displayName: 'Full Name',
      email: 'Email',
      role: 'Assigned Role',
      assignedBranches: 'Branch Scopes',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      allBranches: 'All Branches (Organization-wide)',
    },

    // Audit Log View
    audit: {
      title: 'Immutable Audit Log',
      subtitle: 'Append-only audit trail protected by database constraints preventing updates and deletions',
      time: 'Timestamp',
      actor: 'Actor',
      action: 'Action',
      entity: 'Entity',
      branch: 'Branch',
      metadata: 'Metadata',
      empty: 'No audit records logged yet.',
    },

    // Placeholders for Future Phases
    placeholders: {
      phaseNotice: 'This view is a Phase 1 placeholder for future implementation phases.',
      noPhase2Notice: 'In accordance with Phase 1 strict scope boundaries: Patient Portals, Booking, Billing, and AI are not implemented in this phase.',
      receptionTitle: 'Receptionist Workspace — Dental Front Desk',
      doctorTitle: 'Doctor Workspace — Dental Clinical Station',
      labCoordTitle: 'Dental Prosthetic & Lab Coordination Workspace',
      labTitle: 'Dental Prosthetic Laboratory Workspace',
      deliveryTitle: 'Dental Prosthetic Logistics & Transit Workspace',
      operationsTitle: 'Dental Operations & Capacity Scheduling',
    },

    // PWA & Connectivity
    pwa: {
      installTitle: 'Install App on Your Device',
      installBtn: 'Install Dental SaaS PWA',
      installIOS: 'Install on iOS / iPad',
      iosInstructions: 'Tap the Share button in Safari, then select "Add to Home Screen".',
      offlineBanner: 'Offline Mode — Cached data is securely in use.',
      onlineBadge: 'Online',
      offlineBadge: 'Offline',
      close: 'Close',
    },

    // Acceptance Tests
    tests: {
      title: 'Phase 1 Acceptance Test Suite',
      subtitle: 'Automated verification of all 13 required acceptance criteria for Phase 1',
      runAll: 'Run All 13 Acceptance Tests',
      running: 'Executing acceptance test suite...',
      passedCount: 'Tests Passing:',
      testList: 'Acceptance Criteria Checklist:',
    },

    // General
    common: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Operation completed successfully',
      filter: 'Filter',
      search: 'Search...',
      langSwitch: 'العربية',
    },
  },
};
