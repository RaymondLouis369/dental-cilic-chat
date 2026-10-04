import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { LabOrder } from '../../types/clinical';
import { ProstheticTrialResult } from '../../types/inventory';
import {
  getStoredModificationRequests,
  createModificationRequest,
  respondToModificationRequest,
  getStoredFittingRecords,
  createOrUpdateFittingRecord,
} from '../../lib/inventoryStorage';
import { Wrench, CheckCircle2, AlertTriangle, MessageSquare, Clock, Send, FileText } from 'lucide-react';

interface ProstheticFittingAndModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LabOrder | null;
  onOrderUpdated?: () => void;
}

export const ProstheticFittingAndModificationModal: React.FC<ProstheticFittingAndModificationModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const profile = session?.profile;
  const userId = profile?.id || 'usr_unknown';
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'fitting' | 'modifications'>('fitting');

  // Modification Request Form State
  const [modReason, setModReason] = useState('');
  const [modChange, setModChange] = useState('');

  // Fitting Record Form State
  const [trialResult, setTrialResult] = useState<ProstheticTrialResult>('acceptable');
  const [trialNotes, setTrialNotes] = useState('');
  const [trialDate, setTrialDate] = useState(new Date().toISOString().split('T')[0]);

  // Response Form State
  const [respondingModId, setRespondingModId] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState('');

  const modifications = useMemo(() => {
    if (!order) return [];
    return getStoredModificationRequests(order.id);
  }, [order, isOpen]);

  const fittingRecord = useMemo(() => {
    if (!order) return null;
    const records = getStoredFittingRecords(order.id);
    return records[0] || null;
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleCreateModification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modReason.trim() || !modChange.trim() || !profile) return;

    createModificationRequest({
      labOrderId: order.id,
      organizationId: order.organization_id,
      branchId: order.branch_id,
      reason: modReason,
      requestedChange: modChange,
      requesterId: userId,
      requesterName: profile.display_name,
      requesterRole: profile.role_key,
    });

    setModReason('');
    setModChange('');
    if (onOrderUpdated) onOrderUpdated();
  };

  const handleRespondModification = (requestId: string, status: 'accepted' | 'rejected' | 'completed') => {
    if (!profile) return;
    respondToModificationRequest({
      requestId,
      responseStatus: status,
      responseNotes,
      respondedById: userId,
      respondedByName: profile.display_name,
    });

    setRespondingModId(null);
    setResponseNotes('');
    if (onOrderUpdated) onOrderUpdated();
  };

  const handleSaveFitting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    createOrUpdateFittingRecord({
      id: fittingRecord?.id,
      organizationId: order.organization_id,
      branchId: order.branch_id,
      labOrderId: order.id,
      treatmentServiceId: order.treatment_service_id,
      patientId: order.patient_id,
      doctorId: order.doctor_id,
      doctorName: profile.display_name,
      trialScheduledAt: trialDate,
      trialResult: trialResult,
      modificationNotes: trialNotes,
      approvedForFinal: trialResult === 'approved_for_final' || trialResult === 'fitted',
      fittedByDoctorId: userId,
    });

    if (onOrderUpdated) onOrderUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'تجربة وتعديل التركيبات التعويضية' : 'Prosthetic Trial & Modification Workflow'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? `طلب معملي: ${order.service_name_ar} • ID: ${order.id}` : `Order: ${order.service_name_en} • ID: ${order.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5">
          <button
            onClick={() => setActiveTab('fitting')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
              activeTab === 'fitting'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'سجل التجربة والتركيب النهائى' : 'Trial & Final Fitting Log'}</span>
          </button>
          <button
            onClick={() => setActiveTab('modifications')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
              activeTab === 'modifications'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {isAr ? `طلبات التعديل المعملية (${modifications.length})` : `Modification Requests (${modifications.length})`}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === 'fitting' && (
            <div className="space-y-6">
              {/* Existing Fitting Info */}
              {fittingRecord && (
                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">{isAr ? 'نتيجة التجربة الأخيرة:' : 'Last Trial Result:'}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {fittingRecord.trial_result === 'acceptable' && (isAr ? 'مقبول مبدئياً' : 'Acceptable')}
                      {fittingRecord.trial_result === 'modification_required' && (isAr ? 'يتطلب تعديل معملي' : 'Modification Required')}
                      {fittingRecord.trial_result === 'approved_for_final' && (isAr ? 'معتمد للتركيب النهائي' : 'Approved for Final')}
                      {fittingRecord.trial_result === 'fitted' && (isAr ? 'تم التركيب النهائي بنجاح' : 'Final Fitting Completed')}
                    </span>
                  </div>
                  {fittingRecord.fitted_at && (
                    <p className="text-xs text-emerald-400 flex items-center space-x-1 rtl:space-x-reverse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? `تم التسليم والتركيب النهائي بتاريخ ${new Date(fittingRecord.fitted_at).toLocaleDateString('ar-EG')}`
                          : `Fitted on ${new Date(fittingRecord.fitted_at).toLocaleDateString()}`}
                      </span>
                    </p>
                  )}
                  {fittingRecord.modification_notes && (
                    <p className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                      <strong>{isAr ? 'ملاحظات الطبيب المعالج:' : 'Doctor Notes:'}</strong> {fittingRecord.modification_notes}
                    </p>
                  )}
                </div>
              )}

              {/* Record Trial/Fitting Form */}
              <form onSubmit={handleSaveFitting} className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                  {isAr ? 'تسجيل جلسة قياس / تجربة جديدة' : 'Record Trial Session / Fitting'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {isAr ? 'تاريخ التجربة' : 'Trial Date'}
                    </label>
                    <input
                      type="date"
                      value={trialDate}
                      onChange={(e) => setTrialDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {isAr ? 'نتيجة البروفة / التجربة' : 'Trial Result'}
                    </label>
                    <select
                      value={trialResult}
                      onChange={(e) => setTrialResult(e.target.value as ProstheticTrialResult)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="acceptable">{isAr ? 'مقبول مبدئياً (Acceptable)' : 'Acceptable'}</option>
                      <option value="modification_required">{isAr ? 'يتطلب تعديل معملي (Modification Required)' : 'Modification Required'}</option>
                      <option value="approved_for_final">{isAr ? 'معتمد للتركيب النهائي (Approved for Final)' : 'Approved for Final'}</option>
                      <option value="fitted">{isAr ? 'تم التركيب والتثبيت النهائي (Final Fitted)' : 'Final Fitted'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? 'ملاحظات الانطباع/الإطباق/البروفة' : 'Occlusion / Fit Notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={trialNotes}
                    onChange={(e) => setTrialNotes(e.target.value)}
                    placeholder={
                      isAr
                        ? 'أدخل ملاحظات حول نقاط الإطباق، اللون، ملاءمة الحواف، أو الضبط المطلوب...'
                        : 'Enter notes on occlusion, shade match, margin fit...'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
                  >
                    {isAr ? 'حفظ نتيجة البروفة والتركيب' : 'Save Fitting Result'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'modifications' && (
            <div className="space-y-6">
              {/* Form to submit modification request */}
              <form onSubmit={handleCreateModification} className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center space-x-2 rtl:space-x-reverse">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'إرسال طلب تعديل للمعمل' : 'Send Modification Request to Lab'}</span>
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? 'سبب التعديل' : 'Reason for Modification'}
                  </label>
                  <input
                    type="text"
                    value={modReason}
                    onChange={(e) => setModReason(e.target.value)}
                    placeholder={isAr ? 'مثال: مشكلة بالإطباق / درجة اللون غير متطابقة / حواف قصيرة' : 'e.g. High occlusion, shade mismatch'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? 'التعديل المطلوب تفصيلاً' : 'Requested Change Details'}
                  </label>
                  <textarea
                    rows={2}
                    value={modChange}
                    onChange={(e) => setModChange(e.target.value)}
                    placeholder={isAr ? 'توضيح الشفرة أو الحافة أو الخصر المطلوب تعديله...' : 'Describe exact modifications needed...'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-amber-600/20 flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إرسال طلب التعديل للمعمل' : 'Submit Request'}</span>
                  </button>
                </div>
              </form>

              {/* Modification History List */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider">
                  {isAr ? 'سجل طلبات التعديل السابقة' : 'Modification History'}
                </h4>
                {modifications.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-800/20 rounded-xl">
                    {isAr ? 'لا توجد طلبات تعديل مسجلة لهذا الطلب المعملي.' : 'No modification requests recorded.'}
                  </p>
                ) : (
                  modifications.map((m) => (
                    <div key={m.id} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/70 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-200">{m.reason}</p>
                          <p className="text-xs text-slate-400">
                            {m.requester_name} ({m.requester_role}) • {new Date(m.created_at).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            m.response_status === 'accepted' || m.response_status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : m.response_status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {m.response_status === 'pending' && (isAr ? 'قيد الانتظار' : 'Pending')}
                          {m.response_status === 'accepted' && (isAr ? 'تم قبول التعديل' : 'Accepted')}
                          {m.response_status === 'completed' && (isAr ? 'مكتمل' : 'Completed')}
                          {m.response_status === 'rejected' && (isAr ? 'مرفوض' : 'Rejected')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        {m.requested_change}
                      </p>

                      {m.response_notes && (
                        <p className="text-xs text-blue-300 bg-blue-950/30 p-2.5 rounded-lg border border-blue-900/50">
                          <strong>{isAr ? 'رد الفني / المعمل:' : 'Lab Response:'}</strong> {m.response_notes} ({m.responded_by_name})
                        </p>
                      )}

                      {/* Response Form for Lab Users */}
                      {m.response_status === 'pending' && (
                        <div className="pt-2 border-t border-slate-700/50">
                          {respondingModId === m.id ? (
                            <div className="space-y-2 mt-2">
                              <input
                                type="text"
                                value={responseNotes}
                                onChange={(e) => setResponseNotes(e.target.value)}
                                placeholder={isAr ? 'أدخل رد المعمل أو ملاحظات البدء...' : 'Enter lab response...'}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                              />
                              <div className="flex space-x-2 rtl:space-x-reverse">
                                <button
                                  onClick={() => handleRespondModification(m.id, 'accepted')}
                                  className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg font-bold"
                                >
                                  {isAr ? 'قبول التعديل' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleRespondModification(m.id, 'completed')}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg font-bold"
                                >
                                  {isAr ? 'إكمال التعديل' : 'Mark Completed'}
                                </button>
                                <button
                                  onClick={() => setRespondingModId(null)}
                                  className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg"
                                >
                                  {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRespondingModId(m.id)}
                              className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline"
                            >
                              {isAr ? 'الرد كفني معمل / المنسق' : 'Respond as Lab Tech'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
