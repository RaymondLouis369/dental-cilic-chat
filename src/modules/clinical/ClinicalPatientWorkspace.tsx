import React, { useState } from 'react';
import {
  ClinicalVisit,
  TreatmentPlan,
  TreatmentPlanService,
  SpecialtyType,
  Prescription,
  InvestigationRequest,
  Referral,
  DoctorRecommendation,
  ConsentRequest,
  FollowUpPlan,
  DoctorTask,
  DoctorConsultation,
} from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  getStoredPatients,
  getPatientById,
} from '../../lib/patientStorage';
import {
  getStoredServices,
  getStoredServiceCategories,
} from '../../lib/receptionAndBillingStorage';
import {
  getStoredMedicalAlerts,
  getStoredClinicalVisits,
  getStoredTreatmentPlans,
  getStoredTreatmentPlanServices,
  getStoredPrescriptions,
  getStoredInvestigationRequests,
  getStoredReferrals,
  getStoredDoctorRecommendations,
  getStoredConsentRequests,
  getStoredFollowUpPlans,
  getStoredDoctorTasks,
  getStoredDoctorConsultations,
  getPatientClinicalTimeline,
  startOrGetActiveClinicalVisit,
  updateClinicalVisit,
  createTreatmentPlan,
  addServiceToTreatmentPlan,
  updateTreatmentPlanServiceStatus,
  updateTreatmentPlanStatus,
} from '../../lib/clinicalStorage';
import { DentalChartComponent } from './DentalChartComponent';
import { MedicalAlertsModal } from './MedicalAlertsModal';
import { VisitCompletionModal } from './VisitCompletionModal';
import { PrescriptionModal } from './PrescriptionModal';
import { InvestigationModal } from './InvestigationModal';
import { ReferralModal } from './ReferralModal';
import { RecommendationModal } from './RecommendationModal';
import { ConsentModal } from './ConsentModal';
import { FollowUpModal } from './FollowUpModal';
import { DoctorConsultationModal } from './DoctorConsultationModal';

import {
  ArrowLeft,
  ArrowRight,
  User,
  AlertTriangle,
  FileText,
  Activity,
  Calendar,
  Layers,
  FileCheck2,
  Pill,
  FileScan,
  Share2,
  BookOpen,
  FileSignature,
  CalendarClock,
  ListTodo,
  Users2,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Printer,
  ChevronRight,
  ShieldAlert,
  Stethoscope,
  Eye,
  Check,
} from 'lucide-react';

interface ClinicalPatientWorkspaceProps {
  patientId: string;
  onBack: () => void;
  initialTab?: string;
}

export const ClinicalPatientWorkspace: React.FC<ClinicalPatientWorkspaceProps> = ({
  patientId,
  onBack,
  initialTab = 'chart',
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  // Fetch Patient Identity
  const patient = getPatientById(patientId) || getStoredPatients()[0];

  // Active visit management
  const doctorId = session?.profile.id || 'prof_doc_01';
  const branchId = session?.profile.branch_id || '11111111-1111-1111-1111-111111111111';
  const orgId = session?.profile.organization_id;

  const activeVisit = startOrGetActiveClinicalVisit({
    patientId,
    doctorId,
    branchId,
    organizationId: orgId,
  });

  // Local state for active visit note fields
  const [chiefComplaint, setChiefComplaint] = useState(activeVisit.chief_complaint || '');
  const [examinationFindings, setExaminationFindings] = useState(activeVisit.examination_findings || '');
  const [assessmentDiagnosis, setAssessmentDiagnosis] = useState(activeVisit.assessment_diagnosis || '');
  const [treatmentPerformed, setTreatmentPerformed] = useState(activeVisit.treatment_performed || '');
  const [materialsUsed, setMaterialsUsed] = useState(activeVisit.materials_used || '');
  const [anesthesiaDetails, setAnesthesiaDetails] = useState(activeVisit.anesthesia_details || '');
  const [nextVisitPlan, setNextVisitPlan] = useState(activeVisit.next_visit_plan || '');
  const [specialty, setSpecialty] = useState<SpecialtyType>(activeVisit.specialty || 'general');
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  // New Treatment Plan Builder State
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDiagnosis, setNewPlanDiagnosis] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState(60);

  // Add Procedure to existing plan state
  const [selectedPlanForService, setSelectedPlanForService] = useState<string | null>(null);
  const [serviceNameEn, setServiceNameEn] = useState('Direct Composite Restoration');
  const [serviceNameAr, setServiceNameAr] = useState('حشو تجميلي كمبوزيت مباشر');
  const [serviceTooth, setServiceTooth] = useState('16');
  const [serviceArea, setServiceArea] = useState('Occlusal (O)');
  const [serviceNotes, setServiceNotes] = useState('');

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Data aggregations for patient
  const alerts = getStoredMedicalAlerts().filter((a) => a.patient_id === patientId && a.active);
  const allPlanServices = getStoredTreatmentPlanServices();
  const treatmentPlans = getStoredTreatmentPlans()
    .filter((p) => p.patient_id === patientId)
    .map((p) => ({
      ...p,
      services: allPlanServices.filter((s) => s.treatment_plan_id === p.id),
    }));
  const visits = getStoredClinicalVisits().filter((v) => v.patient_id === patientId);
  const prescriptions = getStoredPrescriptions().filter((p) => p.patient_id === patientId);
  const investigations = getStoredInvestigationRequests().filter((i) => i.patient_id === patientId);
  const referrals = getStoredReferrals().filter((r) => r.patient_id === patientId);
  const recommendations = getStoredDoctorRecommendations().filter((r) => r.patient_id === patientId);
  const consents = getStoredConsentRequests().filter((c) => c.patient_id === patientId);
  const followUps = getStoredFollowUpPlans().filter((f) => f.patient_id === patientId);
  const tasks = getStoredDoctorTasks().filter((t) => t.patient_id === patientId);
  const consultations = getStoredDoctorConsultations().filter((c) => c.patient_id === patientId);
  const timeline = getPatientClinicalTimeline(patientId);

  // Save active visit changes
  const handleSaveVisitNotes = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingVisit(true);
    try {
      updateClinicalVisit({
        visitId: activeVisit.id,
        chiefComplaint,
        examinationFindings,
        assessmentDiagnosis,
        treatmentPerformed,
        materialsUsed,
        anesthesiaDetails,
        nextVisitPlan,
        specialty,
      });
      setSavedSuccessMsg(true);
      setTimeout(() => setSavedSuccessMsg(false), 2500);
      triggerRefresh();
    } finally {
      setIsSavingVisit(false);
    }
  };

  // Create Treatment Plan
  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;

    createTreatmentPlan({
      patientId,
      doctorId,
      title: newPlanTitle,
      diagnosis: newPlanDiagnosis,
      totalEstimatedDurationMinutes: newPlanDuration,
      organizationId: orgId,
    });

    setNewPlanTitle('');
    setNewPlanDiagnosis('');
    setIsCreatingPlan(false);
    triggerRefresh();
  };

  // Add Service to Plan
  const handleAddServiceToPlan = (planId: string) => {
    if (!serviceNameAr.trim()) return;

    addServiceToTreatmentPlan({
      treatmentPlanId: planId,
      patientId,
      doctorId,
      branchId,
      serviceId: 'srv_gen_' + Date.now(),
      serviceCode: 'DNT-' + Math.floor(100 + Math.random() * 900),
      serviceNameAr,
      serviceNameEn,
      toothNumber: serviceTooth || undefined,
      area: serviceArea || undefined,
      clinicalNotes: serviceNotes || undefined,
      organizationId: orgId,
    });

    setSelectedPlanForService(null);
    setServiceTooth('16');
    setServiceNotes('');
    triggerRefresh();
  };

  const handleUpdateServiceStatus = (
    serviceId: string,
    status: TreatmentPlanService['status']
  ) => {
    updateTreatmentPlanServiceStatus(serviceId, status);
    triggerRefresh();
  };

  const handleUpdatePlanStatus = (
    planId: string,
    status: TreatmentPlan['status']
  ) => {
    updateTreatmentPlanStatus(planId, status);
    triggerRefresh();
  };

  const calculateAge = (dobString?: string): number => {
    if (!dobString) return 30;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const patientAge = calculateAge(patient.date_of_birth);

  // Tabs configuration
  const tabs = [
    { id: 'chart', label_ar: 'مخطط الأسنان السريري', label_en: 'Dental Chart', icon: Activity },
    { id: 'notes', label_ar: 'الجلسة والملاحظات', label_en: 'Visit & Notes', icon: FileText, badge: activeVisit ? 'Active' : undefined },
    { id: 'plans', label_ar: 'الخطة العلاجية والخدمات', label_en: 'Treatment Plans', icon: Layers, count: treatmentPlans.length },
    { id: 'timeline', label_ar: 'السجل والتاريخ الزمني', label_en: 'Clinical Timeline', icon: Clock, count: timeline.length },
    { id: 'rx', label_ar: 'الوصفات والروشتات', label_en: 'Prescriptions', icon: Pill, count: prescriptions.length },
    { id: 'investigations', label_ar: 'الأشعة والفحوصات', label_en: 'Investigations', icon: FileScan, count: investigations.length },
    { id: 'referrals', label_ar: 'الإحالات الطبية', label_en: 'Referrals', icon: Share2, count: referrals.length },
    { id: 'recommendations', label_ar: 'تعليمات وتوصيات', label_en: 'Instructions', icon: BookOpen, count: recommendations.length },
    { id: 'consents', label_ar: 'الإقرارات والموافقات', label_en: 'Consents', icon: FileSignature, count: consents.length },
    { id: 'followups', label_ar: 'المتابعات والمهام', label_en: 'Follow-ups & Tasks', icon: CalendarClock, count: followUps.length + tasks.length },
    { id: 'consultations', label_ar: 'استشارات الأطباء', label_en: 'Consultations', icon: Users2, count: consultations.length },
  ];

  return (
    <div className="space-y-6 pb-12" id="clinical-patient-workspace">
      {/* Top Bar: Return to Doctor Dashboard & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="back-to-doctor-dashboard-btn"
            onClick={onBack}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isRtl ? 'لوحة تحكم الطبيب' : 'Doctor Dashboard'}</span>
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isRtl ? 'الملف السريري للطبيب' : 'Doctor Clinical Workspace'}
          </span>
        </div>

        {/* Action buttons (Complete visit, write Rx, request X-ray) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="quick-rx-btn"
            onClick={() => setIsRxModalOpen(true)}
            className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>{isRtl ? 'روشتة سريعة' : 'Quick Rx'}</span>
          </button>

          <button
            type="button"
            id="quick-investigation-btn"
            onClick={() => setIsInvestigationModalOpen(true)}
            className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <FileScan className="w-3.5 h-3.5" />
            <span>{isRtl ? 'طلب أشعة' : 'Order X-Ray'}</span>
          </button>

          <button
            type="button"
            id="quick-instructions-btn"
            onClick={() => setIsRecommendationModalOpen(true)}
            className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تعليمات ما بعد الجلسة' : 'Instructions'}</span>
          </button>

          <button
            type="button"
            id="complete-active-visit-btn"
            onClick={() => setIsCompletionModalOpen(true)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isRtl ? 'إنهاء الجلسة السريرية' : 'Complete Visit'}</span>
          </button>
        </div>
      </div>

      {/* Patient Clinical Identity Header Card */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Patient Info */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-inner shrink-0">
              {(patient.first_name && patient.first_name[0]) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-white">
                  {[patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ') || (isRtl ? 'مريض غير محدد' : 'Unknown Patient')}
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-blue-300 font-bold border border-slate-700">
                  {patient.patient_code || 'EGY-PT-00101'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold">
                  {isRtl ? 'جلسة علاجية نشطة' : 'In-Chair Active'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                <div>
                  <span className="text-slate-400">{isRtl ? 'العمر: ' : 'Age: '}</span>
                  <strong className="text-white">{patientAge} {isRtl ? 'سنة' : 'yrs'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">{isRtl ? 'النوع: ' : 'Gender: '}</span>
                  <strong className="text-white">
                    {patient.gender === 'male'
                      ? isRtl ? 'ذكر' : 'Male'
                      : isRtl ? 'أنثى' : 'Female'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">{isRtl ? 'الهاتف: ' : 'Mobile: '}</span>
                  <strong className="text-white font-mono" dir="ltr">{patient.primary_mobile || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">{isRtl ? 'تاريخ الميلاد: ' : 'DOB: '}</span>
                  <strong className="text-white">{patient.date_of_birth || '1995-04-12'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Doctor Action for Medical Alerts */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              id="manage-medical-alerts-btn"
              onClick={() => setIsAlertsModalOpen(true)}
              className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900/90 text-red-200 border border-red-800/80 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>
                {isRtl
                  ? `التنبيهات الطبية (${alerts.length})`
                  : `Medical Alerts (${alerts.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* High Visibility Medical Alerts Banner */}
        {alerts.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-xs text-red-200">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold text-red-300 block">
                {isRtl ? 'تحذيرات سريرية هامة مسجلة للمريض:' : 'Critical Clinical Precautions:'}
              </strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {alerts.map((al) => (
                  <span
                    key={al.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/60 text-red-100 border border-red-700 text-[11px] font-semibold"
                  >
                    <span>⚠️</span>
                    <strong>{al.title}:</strong>
                    <span>{al.description}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`clinical-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isRtl ? tab.label_ar : tab.label_en}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-400 text-slate-900 uppercase">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}
      <div className="bg-transparent">
        {/* TAB 1: DENTAL CHART */}
        {activeTab === 'chart' && (
          <div className="space-y-6">
            <DentalChartComponent
              patientId={patientId}
              onEntriesChange={triggerRefresh}
            />
          </div>
        )}

        {/* TAB 2: ACTIVE CLINICAL VISIT & NOTES */}
        {activeTab === 'notes' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isRtl ? 'توثيق الجلسة السريرية والملاحظات الحالية' : 'Active Clinical Visit Documentation'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'تسجيل التشخيص، نتائج الفحص، الإجراء المنفذ، والمواد المستخدمة' : 'Record diagnosis, findings, treatment performed, and materials.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {savedSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fadeIn">
                    ✓ {isRtl ? 'تم الحفظ بنجاح' : 'Saved successfully'}
                  </span>
                )}
                <button
                  type="button"
                  id="save-visit-notes-top-btn"
                  disabled={isSavingVisit}
                  onClick={() => handleSaveVisitNotes()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRtl ? 'حفظ مسودة الجلسة' : 'Save Draft'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveVisitNotes} className="space-y-5">
              {/* Specialty Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRtl ? 'التخصص السريري للجلسة:' : 'Clinical Specialty / Domain:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {(
                    [
                      { id: 'general', ar: 'عام (General)', en: 'General' },
                      { id: 'endodontics', ar: 'علاج جذور (Endo)', en: 'Endodontics' },
                      { id: 'implantology', ar: 'زراعة (Implant)', en: 'Implantology' },
                      { id: 'oral_surgery', ar: 'جراحة (Surgery)', en: 'Surgery' },
                      { id: 'orthodontics', ar: 'تقويم (Ortho)', en: 'Orthodontics' },
                      { id: 'pediatric', ar: 'أطفال (Pedo)', en: 'Pediatric' },
                      { id: 'periodontics', ar: 'لثة (Perio)', en: 'Periodontics' },
                    ] as { id: SpecialtyType; ar: string; en: string }[]
                  ).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setSpecialty(sp.id)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        specialty === sp.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isRtl ? sp.ar : sp.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'الشكوى الرئيسية للمريض (Chief Complaint):' : 'Chief Complaint (CC):'}
                </label>
                <input
                  type="text"
                  required
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder={
                    isRtl
                      ? 'مثال: ألم شديد مستمر في الفك السفلي الأيمن مع المشروبات الباردة والساخنة...'
                      : 'e.g. Severe throbbing pain in lower right jaw exacerbated by cold/hot...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Examination Findings */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isRtl ? 'نتائج الفحص السريري (Clinical Examination Findings):' : 'Examination Findings:'}
                  </label>
                  <textarea
                    rows={4}
                    value={examinationFindings}
                    onChange={(e) => setExaminationFindings(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'نتائج الفحص، النقر (Percussion +ve)، الجيوب اللثوية، فحص الحيوية EPT...'
                        : 'Percussion tenderness, probing depth, cold test response...'
                    }
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 resize-none font-sans"
                  />
                </div>

                {/* Assessment & Diagnosis */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isRtl ? 'التقييم والتشخيص السريري (Diagnosis):' : 'Clinical Assessment & Diagnosis:'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={assessmentDiagnosis}
                    onChange={(e) => setAssessmentDiagnosis(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'مثال: التهاب لب السن غير الردود غير العكوس (Symptomatic Irreversible Pulpitis #46)...'
                        : 'e.g. Symptomatic Irreversible Pulpitis tooth #46 with apical periodontitis...'
                    }
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 resize-none font-sans"
                  />
                </div>
              </div>

              {/* Treatment Performed */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'الإجراء العلاجي المنفذ خلال الجلسة (Treatment Performed):' : 'Treatment Performed:'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={treatmentPerformed}
                  onChange={(e) => setTreatmentPerformed(e.target.value)}
                  placeholder={
                    isRtl
                      ? 'مثال: تخدير موضعي، عزل مطاطي كامل، فتح حجرة اللب، تنظيف وتوسيع القنوات...'
                      : 'e.g. Local anesthesia administered, rubber dam isolation, canal negotiation and shaping...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Materials Used */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isRtl ? 'المواد والأجهزة المستخدمة (Materials Used):' : 'Materials Used:'}
                  </label>
                  <input
                    type="text"
                    value={materialsUsed}
                    onChange={(e) => setMaterialsUsed(e.target.value)}
                    placeholder={isRtl ? 'مثال: Protaper Gold, AH Plus sealer, NaOCl 2.5%' : 'e.g. WaveOne Gold, AH Plus, Cavit'}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300"
                  />
                </div>

                {/* Anesthesia Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isRtl ? 'تفاصيل التخدير الموضعي (Anesthesia):' : 'Anesthesia Details:'}
                  </label>
                  <input
                    type="text"
                    value={anesthesiaDetails}
                    onChange={(e) => setAnesthesiaDetails(e.target.value)}
                    placeholder={isRtl ? 'مثال: Articaine 4% with Epinephrine 1:100k (1.7ml IANB)' : 'e.g. Articaine 4% (1.7ml block)'}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Next Visit Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'خطة الجلسة القادمة (Next Visit Plan):' : 'Next Visit Plan:'}
                </label>
                <input
                  type="text"
                  value={nextVisitPlan}
                  onChange={(e) => setNextVisitPlan(e.target.value)}
                  placeholder={isRtl ? 'مثال: حشو القنوات النهائي (Obturation) وحشو كمبوزيت وبناء للتاج' : 'e.g. Final canal obturation and post/core build up'}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCompletionModalOpen(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRtl ? 'إنهاء الجلسة واستيفاء بنود التحقق' : 'Complete Visit & Verify Checklist'}</span>
                </button>

                <button
                  type="submit"
                  id="save-visit-notes-bottom-btn"
                  disabled={isSavingVisit}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRtl ? 'حفظ التحديثات السريرية' : 'Save Clinical Notes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: TREATMENT PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'الخطط العلاجية المتكاملة والخدمات المتسلسلة' : 'Comprehensive Treatment Plans & Sequencing'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'تصميم خطط العلاج وتوزيع المراحل وحالة كل سن وإجراء' : 'Design treatment plans, sequence clinical phases, and update statuses.'}
                </p>
              </div>
              {!isCreatingPlan && (
                <button
                  type="button"
                  id="create-treatment-plan-btn"
                  onClick={() => setIsCreatingPlan(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'إنشاء خطة علاجية جديدة' : 'New Treatment Plan'}</span>
                </button>
              )}
            </div>

            {/* Create New Plan Form */}
            {isCreatingPlan && (
              <form
                onSubmit={handleCreatePlan}
                className="bg-white p-6 rounded-2xl border border-blue-200 shadow-md space-y-4 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="text-sm font-bold text-blue-950">
                    {isRtl ? 'تفاصيل الخطة العلاجية المقترحة للمريض:' : 'New Proposed Treatment Plan:'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPlan(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isRtl ? 'عنوان ومسمى الخطة العلاجية:' : 'Plan Title / Theme:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newPlanTitle}
                      onChange={(e) => setNewPlanTitle(e.target.value)}
                      placeholder={isRtl ? 'مثال: خطة التأهيل الفموي الشامل وزراعة الفك العلوي' : 'e.g. Comprehensive Oral Rehabilitation & Maxillary Implants'}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isRtl ? 'المدة التقديرية الكلية (دقائق):' : 'Estimated Duration (Mins):'}
                    </label>
                    <input
                      type="number"
                      value={newPlanDuration}
                      onChange={(e) => setNewPlanDuration(Number(e.target.value))}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isRtl ? 'التشخيص والهدف السريري من الخطة:' : 'Diagnosis & Clinical Objectives:'}
                  </label>
                  <textarea
                    rows={2}
                    value={newPlanDiagnosis}
                    onChange={(e) => setNewPlanDiagnosis(e.target.value)}
                    placeholder={isRtl ? 'شرح الأهداف العلاجية...' : 'Clinical objectives...'}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPlan(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    {isRtl ? 'حفظ الخطة وبدء إضافة الإجراءات' : 'Save Plan'}
                  </button>
                </div>
              </form>
            )}

            {/* List of Treatment Plans */}
            {treatmentPlans.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl ? 'لا توجد خطط علاجية مسجلة لهذا المريض حالياً. اضغط "إنشاء خطة علاجية جديدة" للبدء.' : 'No treatment plans on record.'}
              </div>
            ) : (
              <div className="space-y-6">
                {treatmentPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Plan Header */}
                    <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-base font-bold text-slate-900">{plan.title}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              plan.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : plan.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : plan.status === 'approved'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {plan.status}
                          </span>
                        </div>
                        {plan.diagnosis && (
                          <p className="text-xs text-slate-600 mt-1">{plan.diagnosis}</p>
                        )}
                      </div>

                      {/* Plan Status Controls */}
                      <div className="flex items-center gap-2">
                        <select
                          value={plan.status}
                          onChange={(e) =>
                            handleUpdatePlanStatus(plan.id, e.target.value as TreatmentPlan['status'])
                          }
                          className="text-xs font-bold p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="planned">{isRtl ? 'مخطط (Planned)' : 'Planned'}</option>
                          <option value="approved">{isRtl ? 'معتمد من المريض (Approved)' : 'Approved'}</option>
                          <option value="scheduled">{isRtl ? 'مجدول (Scheduled)' : 'Scheduled'}</option>
                          <option value="in_progress">{isRtl ? 'قيد التنفيذ (In Progress)' : 'In Progress'}</option>
                          <option value="completed">{isRtl ? 'مكتمل (Completed)' : 'Completed'}</option>
                          <option value="cancelled">{isRtl ? 'ملغي (Cancelled)' : 'Cancelled'}</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setSelectedPlanForService(plan.id)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'إضافة إجراء' : 'Add Procedure'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Services / Procedures Table */}
                    <div className="p-5">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        {isRtl ? 'الإجراءات والمراحل العلاجية المتسلسلة:' : 'Sequenced Procedures & Interventions:'}
                      </h5>

                      {plan.services.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          {isRtl ? 'لا توجد إجراءات مضافة لهذه الخطة حتى الآن.' : 'No procedures added yet.'}
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {plan.services
                            .sort((a, b) => a.sequence_order - b.sequence_order)
                            .map((srv, sIdx) => (
                              <div
                                key={srv.id}
                                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-black flex items-center justify-center shrink-0">
                                    {sIdx + 1}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <strong className="text-xs font-bold text-slate-900">
                                        {isRtl ? srv.service_name_ar : srv.service_name_en}
                                      </strong>
                                      {srv.tooth_number && (
                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px] font-bold">
                                          #{srv.tooth_number}
                                        </span>
                                      )}
                                      {srv.area && (
                                        <span className="text-[11px] text-slate-500">
                                          ({srv.area})
                                        </span>
                                      )}
                                    </div>
                                    {srv.clinical_notes && (
                                      <p className="text-[11px] text-slate-600 mt-0.5">
                                        {srv.clinical_notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <select
                                    value={srv.status}
                                    onChange={(e) =>
                                      handleUpdateServiceStatus(
                                        srv.id,
                                        e.target.value as TreatmentPlanService['status']
                                      )
                                    }
                                    className={`text-xs font-bold p-1.5 rounded-lg border ${
                                      srv.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : srv.status === 'in_progress'
                                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                                        : 'bg-white text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    <option value="planned">{isRtl ? 'مخطط' : 'Planned'}</option>
                                    <option value="scheduled">{isRtl ? 'مجدول' : 'Scheduled'}</option>
                                    <option value="in_progress">{isRtl ? 'قيد الإجراء' : 'In Progress'}</option>
                                    <option value="completed">{isRtl ? 'مكتمل ✓' : 'Completed ✓'}</option>
                                    <option value="cancelled">{isRtl ? 'ملغي' : 'Cancelled'}</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Add Procedure Modal/Inline for this plan */}
                    {selectedPlanForService === plan.id && (
                      <div className="p-5 bg-blue-50/50 border-t border-blue-200 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-blue-950">
                            {isRtl ? 'إضافة إجراء جديد للخطة العلاجية:' : 'Add New Clinical Procedure:'}
                          </h5>
                          <button
                            type="button"
                            onClick={() => setSelectedPlanForService(null)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              {isRtl ? 'اسم الإجراء (عربي):' : 'Procedure (Ar):'}
                            </label>
                            <input
                              type="text"
                              value={serviceNameAr}
                              onChange={(e) => setServiceNameAr(e.target.value)}
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              {isRtl ? 'اسم الإجراء (English):' : 'Procedure (En):'}
                            </label>
                            <input
                              type="text"
                              value={serviceNameEn}
                              onChange={(e) => setServiceNameEn(e.target.value)}
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              {isRtl ? 'رقم السن المستهدف:' : 'Tooth #:'}
                            </label>
                            <input
                              type="text"
                              value={serviceTooth}
                              onChange={(e) => setServiceTooth(e.target.value)}
                              placeholder="e.g. 16, 48"
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              {isRtl ? 'السطح / المنطقة:' : 'Surface / Area:'}
                            </label>
                            <input
                              type="text"
                              value={serviceArea}
                              onChange={(e) => setServiceArea(e.target.value)}
                              placeholder="e.g. MOD, Buccal"
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPlanForService(null)}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                          >
                            {isRtl ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddServiceToPlan(plan.id)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
                          >
                            {isRtl ? 'تأكيد إضافة الإجراء' : 'Add Procedure'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CLINICAL TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isRtl ? 'السجل الزمني السريري للمريض (Clinical Timeline)' : 'Chronological Clinical Timeline'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRtl ? 'تسلسل تاريخي عكسي لجميع الزيارات، الملاحظات، الوصفات، الأشعة، والإحالات' : 'Reverse-chronological log of all clinical interactions.'}
              </p>
            </div>

            {timeline.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {isRtl ? 'لا يوجد سجل سريري سابق.' : 'No clinical timeline entries.'}
              </p>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6">
                {timeline.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Circle on timeline line */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs" />
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                            {item.event_type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">
                            {isRtl ? item.title_ar : item.title_en}
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{item.summary}</p>
                      <div className="text-[10px] text-slate-400">
                        {isRtl ? 'بواسطة: ' : 'Doctor: '} {item.doctor_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PRESCRIPTIONS */}
        {activeTab === 'rx' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'سجل الوصفات والروشتات الطبية' : 'Prescription History & Orders'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'قائمة الروشتات السابقة للأدوية والمسكنات الموصوفة' : 'Past medications and instructions.'}
                </p>
              </div>
              <button
                type="button"
                id="tab-write-rx-btn"
                onClick={() => setIsRxModalOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'تحرير روشتة جديدة' : 'Write Prescription'}</span>
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl ? 'لا توجد روشتات مسجلة للمريض.' : 'No prescriptions recorded.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4"
                  >
                    <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          Rx
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">
                          {rx.diagnosis || (isRtl ? 'وصفة علاجية عامة' : 'General Prescription')}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(rx.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {rx.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg bg-purple-50/40 border border-purple-100 text-xs"
                        >
                          <strong className="text-purple-950 font-bold block">
                            💊 {item.medication_name} ({item.dosage})
                          </strong>
                          <div className="text-slate-600 text-[11px] mt-0.5">
                            {item.frequency} • {item.duration}
                          </div>
                          {item.instructions && (
                            <div className="text-slate-500 text-[10px] italic mt-0.5">
                              {item.instructions}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {rx.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                        {rx.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: INVESTIGATIONS */}
        {activeTab === 'investigations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'طلبات الأشعة والفحوصات المخبرية' : 'Diagnostic Investigations & Imaging'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'متابعة تقارير البانوراما، الـ CBCT، وفحوصات الدم' : 'Track X-Ray and lab orders.'}
                </p>
              </div>
              <button
                type="button"
                id="tab-request-investigation-btn"
                onClick={() => setIsInvestigationModalOpen(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'طلب أشعة / فحص جديد' : 'Order Investigation'}</span>
              </button>
            </div>

            {investigations.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl ? 'لا توجد طلبات أشعة مسجلة للمريض.' : 'No diagnostic orders on record.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investigations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-cyan-100 text-cyan-800 rounded-lg">
                          <FileScan className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{inv.requested_test}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(inv.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          inv.status === 'reviewed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'result_uploaded'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700">
                      <strong>{isRtl ? 'الداعي السريري: ' : 'Reason: '}</strong>
                      {inv.clinical_reason}
                    </p>

                    {inv.result_summary && (
                      <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl text-xs text-cyan-950">
                        <strong className="block font-bold">
                          {isRtl ? 'تقرير النتيجة والتشخيص الإشعاعي:' : 'Result Report:'}
                        </strong>
                        <p className="mt-1">{inv.result_summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: REFERRALS */}
        {activeTab === 'referrals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'الإحالات الطبية التخصصية' : 'Specialist Referrals'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'إحالات الزملاء الاستشاريين والمستشفيات الخارجية' : 'Internal and external referral records.'}
                </p>
              </div>
              <button
                type="button"
                id="tab-create-referral-btn"
                onClick={() => setIsReferralModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'تحويل / إحالة جديدة' : 'New Referral'}</span>
              </button>
            </div>

            {referrals.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl ? 'لا توجد إحالات مسجلة.' : 'No referrals on record.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                          {ref.referral_type}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">{ref.reason}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {ref.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{ref.clinical_summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: INSTRUCTIONS & RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'تعليمات وتوصيات الطبيب للمريض' : 'Post-Op Instructions & Care Guidelines'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'إصدار تعليمات الرعاية وإرسالها للاستقبال للمريض' : 'Post-extraction, implants, and oral hygiene.'}
                </p>
              </div>
              <button
                type="button"
                id="tab-add-instructions-btn"
                onClick={() => setIsRecommendationModalOpen(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'إصدار تعليمات جديدة' : 'Issue Instructions'}</span>
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl ? 'لا توجد تعليمات مصدرة للمريض.' : 'No instructions on record.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{rec.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(rec.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-teal-50/40 p-3 rounded-xl border border-teal-100">
                      {isRtl ? rec.instructions_ar : rec.instructions_en}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: CONSENTS */}
        {activeTab === 'consents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'الإقرارات والموافقات الطبية المستنيرة' : 'Informed Consents & Signatures'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'إقرارات العلاج والعمليات الجراحية والتخدير' : 'Legal medical consents and signatures.'}
                </p>
              </div>
              <button
                type="button"
                id="tab-request-consent-btn"
                onClick={() => setIsConsentModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'طلب توقيع إقرار جديد' : 'Request Consent'}</span>
              </button>
            </div>

            {consents.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl ? 'لا توجد إقرارات مسجلة للمريض.' : 'No consents requested yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consents.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{c.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'signed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{isRtl ? c.description_ar : c.description_en}</p>
                    {c.signed_by_name && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg font-bold">
                        ✓ {isRtl ? 'تم التوقيع بواسطة: ' : 'Signed by: '} {c.signed_by_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: FOLLOW-UPS & TASKS */}
        {activeTab === 'followups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'المتابعات والمهام الإدارية السريرية' : 'Clinical Follow-Ups & Tasks'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'خطط المتابعة القادمة ومهام التواصل المحولة للاستقبال' : 'Scheduled recall and reception tasks.'}
                </p>
              </div>
              <button
                type="button"
                id="tab-add-follow-up-btn"
                onClick={() => setIsFollowUpModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'جدولة متابعة جديدة' : 'Schedule Follow-Up'}</span>
              </button>
            </div>

            {/* Follow-ups */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isRtl ? 'مواعيد المتابعة المجدولة:' : 'Scheduled Follow-Up Plans:'}
              </h4>
              {followUps.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  {isRtl ? 'لا توجد خطط متابعة مسجلة.' : 'No follow-up plans.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {followUps.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700">
                          {isRtl ? 'تاريخ الاستحقاق: ' : 'Due Date: '} {f.due_date}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                          {f.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-semibold">{f.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 11: DOCTOR CONSULTATIONS */}
        {activeTab === 'consultations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRtl ? 'استشارات ومناقشات الأطباء (Second Opinions)' : 'Doctor-to-Doctor Consultations'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'مناقشة الحالات المعقدة وطلب رأي استشاري ثانٍ' : 'Collaborate on complex diagnostic cases.'}
                </p>
              </div>
              <button
                type="button"
                id="tab-request-consultation-btn"
                onClick={() => setIsConsultationModalOpen(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'طلب استشارة طبية' : 'Request Consultation'}</span>
              </button>
            </div>

            {consultations.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl ? 'لا توجد استشارات مسجلة لهذه الحالة.' : 'No doctor consultations requested.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consultations.map((con) => (
                  <div
                    key={con.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase">
                          {con.specialty}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">{con.subject}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {con.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{con.reason}</p>
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                      {con.clinical_notes}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ALL CLINICAL MODALS */}
      <MedicalAlertsModal
        patientId={patientId}
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        onAlertsChange={triggerRefresh}
      />

      <VisitCompletionModal
        visit={activeVisit}
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        onCompleted={triggerRefresh}
      />

      <PrescriptionModal
        patientId={patientId}
        visitId={activeVisit?.id}
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        onPrescriptionCreated={triggerRefresh}
      />

      <InvestigationModal
        patientId={patientId}
        visitId={activeVisit?.id}
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        onInvestigationRequested={triggerRefresh}
      />

      <ReferralModal
        patientId={patientId}
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        onReferralCreated={triggerRefresh}
      />

      <RecommendationModal
        patientId={patientId}
        isOpen={isRecommendationModalOpen}
        onClose={() => setIsRecommendationModalOpen(false)}
        onRecommendationCreated={triggerRefresh}
      />

      <ConsentModal
        patientId={patientId}
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onConsentCreated={triggerRefresh}
      />

      <FollowUpModal
        patientId={patientId}
        visitId={activeVisit?.id}
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        onFollowUpCreated={triggerRefresh}
      />

      <DoctorConsultationModal
        patientId={patientId}
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        onConsultationCreated={triggerRefresh}
      />
    </div>
  );
};
