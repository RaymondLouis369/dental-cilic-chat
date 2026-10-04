import React, { useState } from 'react';
import { X, Save, Plus, Edit2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { MessageTemplate, WhatsAppMessageType } from '../../types/communication';
import { getStoredMessageTemplates, saveMessageTemplate } from '../../lib/communicationStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MessageTemplatesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { session, isOrgWideManager } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';
  const templates = getStoredMessageTemplates(orgId);

  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(templates[0] || null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<MessageTemplate> | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEdit = (tmpl: MessageTemplate) => {
    setSelectedTemplate(tmpl);
    setEditingTemplate({ ...tmpl });
    setSaveSuccessMsg(null);
  };

  const handleSave = () => {
    if (!editingTemplate || !editingTemplate.type || !editingTemplate.body_ar) return;

    saveMessageTemplate(
      {
        id: editingTemplate.id,
        organization_id: orgId,
        type: editingTemplate.type as WhatsAppMessageType,
        name_ar: editingTemplate.name_ar || 'قالب رسالة',
        name_en: editingTemplate.name_en || 'Message Template',
        body_ar: editingTemplate.body_ar,
        body_en: editingTemplate.body_en || editingTemplate.body_ar,
        allowed_placeholders: editingTemplate.allowed_placeholders || ['patient_name', 'branch_name'],
        active: editingTemplate.active ?? true,
      },
      session?.profile?.id
    );

    setSaveSuccessMsg(isAr ? 'تم حفظ القالب بنجاح' : 'Template saved successfully');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const addPlaceholderChip = (ph: string) => {
    if (!editingTemplate) return;
    const currentBody = editingTemplate.body_ar || '';
    setEditingTemplate({
      ...editingTemplate,
      body_ar: `${currentBody} {${ph}}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl">
              <Edit2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {isAr ? 'إدارة قوالب رسائل الواتساب والترويج' : 'WhatsApp Message Templates Manager'}
              </h3>
              <p className="text-xs text-slate-300">
                {isAr ? 'إعداد وصياغة الرسائل الثنائية اللغة مع حماية المتغيرات' : 'Configure bilingual templates with variables protection'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Template Selection List */}
          <div className="space-y-2 border-r border-slate-100 pr-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {isAr ? 'القوالب المتاحة' : 'Available Templates'}
            </h4>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleEdit(tmpl)}
                  className={`w-full text-right p-3 rounded-xl text-xs font-medium transition-all ${
                    selectedTemplate?.id === tmpl.id
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="font-bold text-slate-900">{isAr ? tmpl.name_ar : tmpl.name_en}</div>
                  <div className="text-[10px] text-slate-500 mt-1 truncate">{tmpl.type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Editor Form */}
          <div className="md:col-span-2 space-y-4">
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {saveSuccessMsg}
              </div>
            )}

            {editingTemplate ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم القالب (بالعربية)' : 'Template Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name_ar || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name_ar: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Available Variable Chips */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    {isAr ? 'إدراج متغيرات مسموحة (انقر للإضافة):' : 'Insert Allowed Placeholders:'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(editingTemplate.allowed_placeholders || ['patient_name', 'branch_name', 'doctor_name', 'time']).map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => addPlaceholderChip(ph)}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-100"
                      >
                        +{ph}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Arabic Body Editor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'نص الرسالة (بالعربية)' : 'Message Body (Arabic)'}
                  </label>
                  <textarea
                    rows={4}
                    value={editingTemplate.body_ar || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body_ar: e.target.value })}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                  />
                </div>

                {/* English Body Editor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'نص الرسالة (بالإنجليزية)' : 'Message Body (English)'}
                  </label>
                  <textarea
                    rows={3}
                    value={editingTemplate.body_en || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body_en: e.target.value })}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 leading-relaxed dir-ltr"
                  />
                </div>

                {/* Live Rendering Safeguard Note */}
                <div className="p-3 bg-amber-50 text-amber-800 text-[11px] rounded-xl flex items-start gap-2 border border-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {isAr
                      ? 'ضمان الخصوصية: يتم فحص جميع المتغيرات تلقائياً لمنع تسريب المبالغ الإجمالية أو التكاليف أو الملاحظات الطبية السرية للعملاء.'
                      : 'Privacy Safeguard: Placeholders are automatically validated to prevent leaking sensitive clinical or financial internal notes.'}
                  </span>
                </div>

                {/* Action Footer */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  {isOrgWideManager && (
                    <button
                      onClick={handleSave}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-4 h-4" />
                      {isAr ? 'حفظ التغييرات' : 'Save Template'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                {isAr ? 'حدد قالباً من القائمة لعرضه أو تعديله' : 'Select a template from the list to view or edit'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
