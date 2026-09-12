import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import {
  getStoredFamilies,
  getStoredFamilyMembers,
  getStoredGuardians,
  getStoredPatients,
  registerNewPatient,
  updateGuardianAuthorization,
  linkPatientToFamilyUnit,
  PATIENT_STORAGE_KEYS,
  normalizeMobile,
} from '../../lib/patientStorage';
import {
  calculateAge,
  getAgeGroup,
  GuardianRelationship,
  GuardianAuthorizationStatus,
  GuardianPermissionScope,
  FamilyMember,
  FamilyRelationshipType,
  Patient,
} from '../../types/patient';
import {
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Check,
  AlertCircle,
  Sparkles,
  Baby,
  FileCheck2,
  FileText,
  Clock,
  Link2,
  UserPlus,
  ArrowRightLeft,
  CheckCircle2,
  Lock,
  Calendar,
  CreditCard,
  Pill,
  ChevronDown,
  ChevronUp,
  Search,
  CheckSquare,
  Square,
  BadgeCheck,
} from 'lucide-react';

export const FamilyView: React.FC = () => {
  const { t, language } = useLanguage();
  const { session, selectPatientContext } = usePatientAuth();

  // Modals & UI States
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showLinkExistingModal, setShowLinkExistingModal] = useState(false);
  const [activeScopesModalWardId, setActiveScopesModalWardId] = useState<string | null>(null);

  // Form states for adding child
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState<'male' | 'female'>('female');
  const [childRelationType, setChildRelationType] = useState<'parent' | 'legal_guardian' | 'custodian'>('parent');
  const [childGuardianNid, setChildGuardianNid] = useState('28001010101234');
  const [childDocRef, setChildDocRef] = useState('');
  const [childScopes, setChildScopes] = useState<GuardianPermissionScope[]>([
    'medical_records',
    'appointments',
    'financials',
    'consent',
    'prescriptions',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for linking existing patient
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkRelationship, setLinkRelationship] = useState<FamilyRelationshipType>('spouse');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccessMsg, setLinkSuccessMsg] = useState<string | null>(null);

  // Editable scopes state in modal
  const [modalScopes, setModalScopes] = useState<GuardianPermissionScope[]>([]);
  const [modalAuthStatus, setModalAuthStatus] = useState<GuardianAuthorizationStatus>('verified');
  const [scopesSavedToast, setScopesSavedToast] = useState(false);

  // Force re-render trigger when data updates in storage
  const [updateTick, setUpdateTick] = useState(0);

  if (!session) return null;

  const authPatient = session.authenticatedPatient;
  const currentPatient = session.selectedPatient;
  const org = session.organization;

  // Retrieve families linked to current user
  const allFamilies = getStoredFamilies();
  const allFamilyMembers = getStoredFamilyMembers();
  const allPatients = getStoredPatients();
  const allGuardians = getStoredGuardians();

  // Find family where authenticated patient is a member
  const myMemberRow = allFamilyMembers.find((fm) => fm.patient_id === authPatient.id);
  const myFamily = myMemberRow
    ? allFamilies.find((f) => f.id === myMemberRow.family_id && f.organization_id === org.id)
    : null;

  const familyMembersWithData = myFamily
    ? allFamilyMembers
        .filter((fm) => fm.family_id === myFamily.id)
        .map((fm) => {
          const patientData = allPatients.find((p) => p.id === fm.patient_id);
          return {
            ...fm,
            patient: patientData,
          };
        })
        .filter((item): item is typeof item & { patient: Patient } => item.patient !== undefined)
    : [];

  // Authorized wards under authPatient
  const myWards = allGuardians
    .filter(
      (g) =>
        g.guardian_patient_id === authPatient.id &&
        g.organization_id === org.id &&
        g.active === true
    )
    .map((g) => {
      const wardPatient = allPatients.find((p) => p.id === g.ward_patient_id);
      return {
        relationship: g,
        ward: wardPatient,
      };
    })
    .filter((w): w is { relationship: GuardianRelationship; ward: Patient } => w.ward !== undefined);

  const handleSelectProfile = (patientId: string) => {
    selectPatientContext(patientId);
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!childName.trim() || !childDob) {
      setFormError('يرجى ملء جميع الحقول المطلوبة');
      setIsSubmitting(false);
      return;
    }

    // Verify child is under 18
    const age = calculateAge(childDob);
    if (age >= 18) {
      setFormError('تاريخ الميلاد المدخل أكبر من 18 عاماً (يجب أن يكون طفلاً قاصراً تحت الوصاية).');
      setIsSubmitting(false);
      return;
    }

    // Register child using guardian's mobile
    const res = await registerNewPatient({
      organizationId: org.id,
      fullName: childName,
      mobile: authPatient.primary_mobile, // SHARED MOBILE WITH GUARDIAN!
      dateOfBirth: childDob,
      gender: childGender,
      preferredLanguage: authPatient.preferred_language,
      pin: '9081', // Secure default for ward
    });

    if (!res.success || !res.patient) {
      setFormError(res.error || 'فشل تسجيل الطفل');
      setIsSubmitting(false);
      return;
    }

    // Establish explicit guardian relationship with verification and scopes
    const newGuardianRel: GuardianRelationship = {
      id: 'gr_' + Math.random().toString(36).substring(2, 10),
      organization_id: org.id,
      guardian_patient_id: authPatient.id,
      ward_patient_id: res.patient.id,
      relationship_type: childRelationType,
      authorization_status: 'verified',
      scopes: childScopes,
      guardian_national_id: childGuardianNid || '28001010101234',
      document_reference: childDocRef || 'شهادة ميلاد رقمية مميكنة - سجل مدني الدقي',
      verified_at: new Date().toISOString(),
      verified_by: 'د. كريم عبد العزيز (مدير المركز الطبي)',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    allGuardians.push(newGuardianRel);
    localStorage.setItem(PATIENT_STORAGE_KEYS.GUARDIANS, JSON.stringify(allGuardians));

    // Link to family if exists
    if (myFamily) {
      const newFm: FamilyMember = {
        id: 'fm_' + Math.random().toString(36).substring(2, 10),
        family_id: myFamily.id,
        patient_id: res.patient.id,
        relationship: childGender === 'female' ? 'daughter' : 'son',
        created_at: new Date().toISOString(),
      };
      allFamilyMembers.push(newFm);
      localStorage.setItem(PATIENT_STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(allFamilyMembers));
    }

    setIsSubmitting(false);
    setShowAddChildModal(false);
    setChildName('');
    setChildDob('');
    setChildDocRef('');
    setUpdateTick((prev) => prev + 1);

    // Switch context to the new ward
    selectPatientContext(res.patient.id);
  };

  const handleLinkExistingPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinkSuccessMsg(null);

    const query = linkSearchQuery.trim();
    if (!query) {
      setLinkError('يرجى إدخال كود المريض أو رقم المحمول');
      return;
    }

    const normalizedQ = normalizeMobile(query);
    const targetPatient = allPatients.find(
      (p) =>
        p.organization_id === org.id &&
        (p.patient_code.toLowerCase() === query.toLowerCase() ||
          (normalizedQ && normalizeMobile(p.primary_mobile) === normalizedQ))
    );

    if (!targetPatient) {
      setLinkError(t.family.patientNotFound);
      return;
    }

    if (targetPatient.id === authPatient.id) {
      setLinkError('هذا هو حسابك الشخصي بالفعل!');
      return;
    }

    // Add to family
    const familyId = myFamily ? myFamily.id : 'fam_mohamed_01';
    linkPatientToFamilyUnit(org.id, familyId, targetPatient.id, linkRelationship);

    setLinkSuccessMsg(`${t.family.linkSuccess}: ${targetPatient.first_name} ${targetPatient.last_name}`);
    setLinkSearchQuery('');
    setUpdateTick((prev) => prev + 1);

    setTimeout(() => {
      setShowLinkExistingModal(false);
      setLinkSuccessMsg(null);
    }, 1200);
  };

  const openScopesModal = (wardRel: GuardianRelationship) => {
    setActiveScopesModalWardId(wardRel.id);
    setModalScopes(wardRel.scopes || ['medical_records', 'appointments', 'financials', 'consent', 'prescriptions']);
    setModalAuthStatus(wardRel.authorization_status || 'verified');
    setScopesSavedToast(false);
  };

  const toggleModalScope = (scope: GuardianPermissionScope) => {
    if (modalScopes.includes(scope)) {
      setModalScopes(modalScopes.filter((s) => s !== scope));
    } else {
      setModalScopes([...modalScopes, scope]);
    }
  };

  const saveUpdatedScopes = () => {
    if (!activeScopesModalWardId) return;
    updateGuardianAuthorization(activeScopesModalWardId, {
      scopes: modalScopes,
      authorization_status: modalAuthStatus,
    });
    setScopesSavedToast(true);
    setUpdateTick((prev) => prev + 1);
    setTimeout(() => {
      setActiveScopesModalWardId(null);
      setScopesSavedToast(false);
    }, 900);
  };

  const getStatusBadge = (status?: GuardianAuthorizationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.family.guardianVerified}</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{t.family.guardianPending}</span>
          </span>
        );
      case 'restricted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-300">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.family.guardianRestricted}</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{t.family.guardianExpired}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.family.guardianVerified}</span>
          </span>
        );
    }
  };

  const getRelationshipLabel = (rel: string) => {
    switch (rel) {
      case 'father':
        return t.family.relationships.father;
      case 'mother':
        return t.family.relationships.mother;
      case 'spouse':
        return t.family.relationships.spouse;
      case 'son':
        return t.family.relationships.son;
      case 'daughter':
        return t.family.relationships.daughter;
      case 'brother':
        return t.family.relationships.brother;
      case 'sister':
        return t.family.relationships.sister;
      case 'parent':
        return t.family.relationships.guardian;
      case 'ward':
        return t.family.relationships.ward;
      default:
        return t.family.relationships.other;
    }
  };

  const activeWardRel = myWards.find((w) => w.relationship.id === activeScopesModalWardId);

  return (
    <div className="space-y-8" id="family-view-container">
      {/* 1. SECTION: CLEAR DISPLAY OF CURRENT PATIENT (إظهار الـcurrent patient بوضوح) */}
      <section
        id="current-active-patient-spotlight"
        className="relative overflow-hidden rounded-3xl border-2 border-teal-500/80 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-lg shadow-teal-900/10"
      >
        <div className="absolute -top-12 -end-12 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -start-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Active Patient Identity */}
          <div className="flex items-start sm:items-center gap-4">
            {/* Elevated Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 font-extrabold text-2xl flex items-center justify-center shadow-md ring-4 ring-white/20">
                {currentPatient.first_name[0] || 'م'}
              </div>
              <div className="absolute -bottom-1.5 -end-1.5 w-6 h-6 bg-emerald-500 text-slate-950 rounded-full border-2 border-slate-900 flex items-center justify-center shadow">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t.family.currentActive}
                </span>

                {currentPatient.id !== authPatient.id ? (
                  <span className="text-xs font-semibold text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    {t.patientPortal.underGuardianship}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-teal-200 bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                    {t.profileDropdown.guardianRole}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentPatient.first_name} {currentPatient.middle_name || ''} {currentPatient.last_name}
              </h2>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-teal-100/90 flex-wrap">
                <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded border border-white/15">
                  {currentPatient.patient_code}
                </span>
                <span>•</span>
                <span>
                  {calculateAge(currentPatient.date_of_birth)} {t.patientPortal.years} (
                  {getAgeGroup(currentPatient.date_of_birth) === 'child'
                    ? t.patientPortal.childBadge
                    : t.patientPortal.adultBadge}
                  )
                </span>
                <span>•</span>
                <span className="text-teal-200 font-mono" dir="ltr">
                  {currentPatient.primary_mobile}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Profile Switching Switcher Chips */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
            <span className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider block sm:hidden">
              {t.profileDropdown.switchProfile}:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {session.availableProfiles.map((p) => {
                const isSelected = p.id === currentPatient.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-md ring-2 ring-emerald-400'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-lg bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {p.first_name[0]}
                    </span>
                    <span>{p.first_name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Clear Notice Banner */}
        <div className="mt-5 pt-4 border-t border-teal-700/50 flex items-center gap-2 text-xs text-teal-100">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <p>
            {t.family.activeContextNotice.replace(
              '{name}',
              `${currentPatient.first_name} ${currentPatient.last_name}`
            )}
          </p>
        </div>
      </section>

      {/* 2. SECTION: FAMILY LINK UI (نظام ربط العائلة وإدارتها) */}
      <section className="space-y-6" id="family-link-management-section">
        {/* Header & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-700" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.family.members}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{t.family.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowLinkExistingModal(true)}
              id="btn-open-link-existing"
              className="inline-flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs transition-colors"
            >
              <Link2 className="w-4 h-4 text-teal-700" />
              <span>{t.family.linkExisting}</span>
            </button>

            <button
              onClick={() => setShowAddChildModal(true)}
              id="btn-open-add-child"
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t.family.addChild}</span>
            </button>
          </div>
        </div>

        {/* Family Unit Details Card */}
        {myFamily && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{myFamily.name}</h3>
                <p className="text-xs text-slate-500">
                  {org.name} • جمهورية مصر العربية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">
                {t.family.familyCode}:
              </span>
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                {myFamily.family_code}
              </span>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                {familyMembersWithData.length || session.availableProfiles.length} أفراد مسجلين
              </span>
            </div>
          </div>
        )}

        {/* Family Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="family-members-grid">
          {/* Primary Authenticated Guardian Profile Card */}
          <div
            className={`p-5 rounded-2xl border transition-all relative ${
              currentPatient.id === authPatient.id
                ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-400/40 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {authPatient.first_name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 text-base truncate">
                      {authPatient.first_name} {authPatient.middle_name || ''} {authPatient.last_name}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                      {t.profileDropdown.guardianRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {authPatient.patient_code} • {calculateAge(authPatient.date_of_birth)} {t.patientPortal.years}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 font-mono" dir="ltr">
                    {authPatient.primary_mobile}
                  </p>
                </div>
              </div>

              {currentPatient.id === authPatient.id ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full shrink-0 border border-teal-300">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t.family.currentActive}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectProfile(authPatient.id)}
                  id="btn-activate-profile-guardian"
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shrink-0"
                >
                  {t.family.switchActive}
                </button>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <BadgeCheck className="w-4 h-4 text-teal-600" />
                <span>حساب الدخول الأساسي والمفوض الشرعي</span>
              </span>
              <span className="text-teal-700 font-semibold">مفعل</span>
            </div>
          </div>

          {/* Other Family Members & Wards */}
          {familyMembersWithData
            .filter((fm) => fm.patient.id !== authPatient.id)
            .map(({ patient, relationship }) => {
              const isSelected = currentPatient.id === patient.id;
              const guardianRel = myWards.find((w) => w.ward.id === patient.id)?.relationship;
              const isWard = Boolean(guardianRel);
              const age = calculateAge(patient.date_of_birth);

              return (
                <div
                  key={patient.id}
                  id={`family-member-card-${patient.patient_code}`}
                  className={`p-5 rounded-2xl border transition-all relative ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-400/40 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs ${
                          isWard ? 'bg-amber-600' : 'bg-slate-700'
                        }`}
                      >
                        {patient.first_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-base truncate">
                            {patient.first_name} {patient.middle_name || ''} {patient.last_name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                            {getRelationshipLabel(relationship)}
                          </span>
                          {isWard && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                              {t.patientPortal.childBadge}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {patient.patient_code} • {age} {t.patientPortal.years}
                        </p>

                        <p className="text-xs text-slate-600 mt-1 font-mono" dir="ltr">
                          {patient.primary_mobile}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full shrink-0 border border-teal-300">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{t.family.currentActive}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectProfile(patient.id)}
                        id={`btn-activate-profile-${patient.patient_code}`}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white transition-colors shrink-0 shadow-xs"
                      >
                        {t.family.switchActive}
                      </button>
                    )}
                  </div>

                  {/* Ward Legal Authorization Preview Bar */}
                  {guardianRel && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(guardianRel.authorization_status)}
                        <span className="text-[11px] text-slate-500">
                          ({guardianRel.scopes?.length || 5} صلاحيات مصرحة)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openScopesModal(guardianRel)}
                        id={`btn-view-scopes-${patient.patient_code}`}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline underline-offset-2"
                      >
                        {t.family.guardianStatusTitle} ←
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* 3. SECTION: GUARDIAN AUTHORIZATION STATUS (حالة تفويض وصلاحيات ولي الأمر) */}
      <section className="space-y-4" id="guardian-authorization-status-section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {t.family.guardianStatusTitle}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {myWards.length} ملفات تحت الوصاية المعتمدة
          </span>
        </div>

        {myWards.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            {t.family.noWards}
          </div>
        ) : (
          <div className="space-y-4">
            {myWards.map(({ ward, relationship }) => {
              const age = calculateAge(ward.date_of_birth);
              const scopes = relationship.scopes || [
                'medical_records',
                'appointments',
                'financials',
                'consent',
                'prescriptions',
              ];

              return (
                <div
                  key={relationship.id}
                  id={`guardian-auth-card-${ward.patient_code}`}
                  className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5"
                >
                  {/* Ward Header + Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                        <Baby className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-base">
                            {ward.first_name} {ward.middle_name || ''} {ward.last_name}
                          </h4>
                          <span className="text-xs font-mono text-slate-500">
                            ({ward.patient_code})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {age} {t.patientPortal.years} •{' '}
                          {relationship.relationship_type === 'parent'
                            ? 'ابن / ابنة تحت الوصاية الطبيعية'
                            : 'وصاية قانونية معتمدة'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(relationship.authorization_status)}
                      <button
                        type="button"
                        onClick={() => openScopesModal(relationship)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        {t.family.editScopes}
                      </button>
                    </div>
                  </div>

                  {/* Scopes Overview */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2.5">
                      {t.family.scopesTitle}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          scopes.includes('medical_records')
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t.family.scopeMedical}</span>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          scopes.includes('appointments')
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t.family.scopeAppointments}</span>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          scopes.includes('financials')
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t.family.scopeFinancials}</span>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          scopes.includes('consent')
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t.family.scopeConsent}</span>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          scopes.includes('prescriptions')
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        <Pill className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t.family.scopePrescriptions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Legal Verification Metadata in Egypt */}
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {t.family.guardianNID}
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {relationship.guardian_national_id || '28001010101234'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {t.family.docRef}
                      </span>
                      <span className="text-slate-800 truncate block font-medium">
                        {relationship.document_reference || 'شهادة ميلاد رقمية مميكنة'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {t.family.verifiedBy}
                      </span>
                      <span className="text-slate-800 font-medium">
                        {relationship.verified_by || 'د. كريم عبد العزيز (مدير المركز)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {t.family.authorizedUntil}
                      </span>
                      <span className="text-emerald-700 font-bold">
                        {relationship.authorized_until || t.family.untilAdulthood}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Security & Regulatory Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">سياسات حماية البيانات الطبية للأسر والقصّر:</span>
          <p>{t.family.legalGuardianshipNotice}</p>
        </div>
      </div>

      {/* MODAL 1: ADD CHILD / DEPENDENT */}
      {showAddChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Baby className="w-6 h-6 text-teal-700" />
                <h3 className="font-black text-slate-900 text-lg">
                  {t.family.addChild}
                </h3>
              </div>
              <button
                onClick={() => setShowAddChildModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الطفل (ثلاثي أو رباعي) *
                </label>
                <input
                  type="text"
                  required
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="مثال: يوسف أحمد محمد"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الميلاد (أقل من 18 عاماً) *
                  </label>
                  <input
                    type="date"
                    required
                    value={childDob}
                    onChange={(e) => setChildDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    النوع *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChildGender('female')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-colors ${
                        childGender === 'female'
                          ? 'bg-teal-50 border-teal-600 text-teal-900'
                          : 'bg-white border-slate-300 text-slate-600'
                      }`}
                    >
                      أنثى
                    </button>
                    <button
                      type="button"
                      onClick={() => setChildGender('male')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-colors ${
                        childGender === 'male'
                          ? 'bg-teal-50 border-teal-600 text-teal-900'
                          : 'bg-white border-slate-300 text-slate-600'
                      }`}
                    >
                      ذكر
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  صفة الوصاية الشرعية
                </label>
                <select
                  value={childRelationType}
                  onChange={(e) =>
                    setChildRelationType(e.target.value as 'parent' | 'legal_guardian' | 'custodian')
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="parent">أب / أم (وصاية طبيعية)</option>
                  <option value="legal_guardian">وصي شرعي بحكم محكمة الأسرة</option>
                  <option value="custodian">حاضن قانوني معتمد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم القومي لولي الأمر (14 رقماً)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={childGuardianNid}
                  onChange={(e) => setChildGuardianNid(e.target.value)}
                  placeholder="28001010101234"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مستند إثبات الوصاية والقرابة (رقم شهادة الميلاد المميكنة)
                </label>
                <input
                  type="text"
                  value={childDocRef}
                  onChange={(e) => setChildDocRef(e.target.value)}
                  placeholder="شهادة ميلاد رقمية مميكنة - سجل مدني الدقي"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-900 block">
                  ربط الهوية ورقم المحمول المشترك:
                </span>
                <p>
                  سيتم ربط ملف الطفل برقم هاتفك المحمول ({authPatient.primary_mobile}) مع إنشاء كود مريض مستقل وإصدار كارت رقمي وتوثيق الوصاية وتفعيل صلاحيات ولي الأمر.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddChildModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-submit-add-child"
                  className="px-5 py-2.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? t.common.loading : 'تأكيد التسجيل وإصدار الكارت وتوثيق الوصاية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LINK EXISTING PATIENT TO FAMILY */}
      {showLinkExistingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-6 h-6 text-teal-700" />
                <h3 className="font-black text-slate-900 text-lg">
                  {t.family.linkExisting}
                </h3>
              </div>
              <button
                onClick={() => setShowLinkExistingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t.family.linkExistingDesc}
            </p>

            <form onSubmit={handleLinkExistingPatient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.family.patientCodeOrMobile} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={linkSearchQuery}
                    onChange={(e) => setLinkSearchQuery(e.target.value)}
                    placeholder="مثال: PAT-000004 أو 01000000002"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none pe-10 font-mono"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute end-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.family.relation} *
                </label>
                <select
                  value={linkRelationship}
                  onChange={(e) => setLinkRelationship(e.target.value as FamilyRelationshipType)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="spouse">{t.family.relationships.spouse}</option>
                  <option value="mother">{t.family.relationships.mother}</option>
                  <option value="father">{t.family.relationships.father}</option>
                  <option value="brother">{t.family.relationships.brother}</option>
                  <option value="sister">{t.family.relationships.sister}</option>
                  <option value="son">{t.family.relationships.son}</option>
                  <option value="daughter">{t.family.relationships.daughter}</option>
                  <option value="other">{t.family.relationships.other}</option>
                </select>
              </div>

              {linkError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{linkError}</span>
                </div>
              )}

              {linkSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{linkSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLinkExistingModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  id="btn-submit-link-existing"
                  className="px-5 py-2.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors shadow-xs"
                >
                  تأكيد ربط الملف بالعائلة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT GUARDIAN AUTHORIZATION STATUS & SCOPES */}
      {activeScopesModalWardId && activeWardRel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
                <div>
                  <h3 className="font-black text-slate-900 text-lg">
                    {t.family.guardianStatusTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ملف الطفل:{' '}
                    <span className="font-bold text-slate-800">
                      {activeWardRel.ward.first_name} {activeWardRel.ward.last_name}
                    </span>{' '}
                    ({activeWardRel.ward.patient_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveScopesModalWardId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حالة التوثيق والاعتماد:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalAuthStatus('verified')}
                  className={`p-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                    modalAuthStatus === 'verified'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t.family.guardianVerified}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalAuthStatus('restricted')}
                  className={`p-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                    modalAuthStatus === 'restricted'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-300'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>{t.family.guardianRestricted}</span>
                </button>
              </div>
            </div>

            {/* Scopes Toggles */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                {t.family.scopesTitle}
              </label>

              {[
                { id: 'medical_records', label: t.family.scopeMedical, icon: FileText },
                { id: 'appointments', label: t.family.scopeAppointments, icon: Calendar },
                { id: 'financials', label: t.family.scopeFinancials, icon: CreditCard },
                { id: 'consent', label: t.family.scopeConsent, icon: ShieldCheck },
                { id: 'prescriptions', label: t.family.scopePrescriptions, icon: Pill },
              ].map(({ id, label, icon: ScopeIcon }) => {
                const checked = modalScopes.includes(id as GuardianPermissionScope);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleModalScope(id as GuardianPermissionScope)}
                    className={`w-full p-3 rounded-xl border text-xs flex items-center justify-between text-start transition-colors ${
                      checked
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ScopeIcon className={`w-4 h-4 ${checked ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </div>
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Verification Metadata summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">التوثيق القانوني:</span>
              <p>الرقم القومي: {activeWardRel.relationship.guardian_national_id || '28001010101234'}</p>
              <p>المستند: {activeWardRel.relationship.document_reference || 'شهادة ميلاد رقمية مميكنة'}</p>
              <p>معتمد بواسطة: د. كريم عبد العزيز (مدير المركز الطبي)</p>
            </div>

            {scopesSavedToast && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.common.success} - تم حفظ إعدادات وتفويضات الوصاية بنجاح!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveScopesModalWardId(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={saveUpdatedScopes}
                id="btn-save-scopes-modal"
                className="px-5 py-2.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors shadow-xs"
              >
                {t.family.saveScopes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
