import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { getPatientCard } from '../../lib/patientStorage';
import { getAgeGroup, calculateAge } from '../../types/patient';
import { QrCode, ShieldCheck, Copy, Check, Sparkles, Building2, User, Download } from 'lucide-react';

export const DigitalPatientCard: React.FC = () => {
  const { t, language } = useLanguage();
  const { session } = usePatientAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const patient = session?.selectedPatient;
  const org = session?.organization;
  const card = patient && org ? getPatientCard(patient.id, org.id) : null;

  useEffect(() => {
    if (card?.qr_token) {
      // Generate QR Code data URL from the opaque token
      QRCode.toDataURL(card.qr_token, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [card?.qr_token]);

  if (!patient || !org) return null;

  const age = calculateAge(patient.date_of_birth);
  const ageGroup = getAgeGroup(patient.date_of_birth);
  const isWard = session.authenticatedPatient.id !== patient.id;

  const handleCopyCardNo = () => {
    if (card?.card_number) {
      navigator.clipboard.writeText(card.card_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.digitalCard.title}
        </h2>
        <p className="text-sm text-slate-600 mt-1">{t.digitalCard.subtitle}</p>
      </div>

      {/* The Digital Membership Card */}
      <div
        id="digital-patient-card-widget"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white shadow-xl border border-slate-700/60 p-6 sm:p-8"
      >
        {/* Background ambient accents */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Card Row */}
        <div className="relative z-10 flex items-start justify-between border-b border-slate-700/70 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-teal-400 font-semibold">
                {org.name}
              </div>
              <div className="text-xs text-slate-400 font-mono">{org.code}</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.digitalCard.validBadge}
          </span>
        </div>

        {/* Main Card Body */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Patient Details */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">
                {t.patientProfile.fullName}
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {patient.first_name} {patient.middle_name || ''} {patient.last_name}
              </h3>
              {isWard && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {t.patientPortal.underGuardianship}: {session.authenticatedPatient.first_name}{' '}
                  {session.authenticatedPatient.last_name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs font-medium text-slate-400 block">
                  {t.patientPortal.patientCode}
                </span>
                <span className="text-sm font-mono font-bold text-teal-300">
                  {patient.patient_code}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block">
                  {t.patientPortal.age}
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  {age} {t.patientPortal.years}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    ({ageGroup === 'child' ? t.patientPortal.childBadge : t.patientPortal.adultBadge})
                  </span>
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 block">
                {t.digitalCard.cardNo}
              </span>
              <span className="text-xs font-mono text-slate-300 select-all">
                {card?.card_number || `CARD-${patient.patient_code}`}
              </span>
            </div>
          </div>

          {/* QR Code Canvas */}
          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-md border border-slate-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Patient QR Code"
                className="w-44 h-44 object-contain rounded"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded text-slate-400">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}
            <span className="text-[10px] font-mono text-slate-500 mt-2 text-center uppercase tracking-wider">
              {t.digitalCard.scanAtAnyBranch}
            </span>
          </div>
        </div>

        {/* Card Footer */}
        <div className="relative z-10 mt-6 pt-4 border-t border-slate-700/70 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span>{t.patientPortal.allEgyptianBranches}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            EG-DENTAL-ID
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCopyCardNo}
          id="btn-copy-card-no"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">{t.digitalCard.copied}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-500" />
              <span>{t.digitalCard.copyCardNo}</span>
            </>
          )}
        </button>

        <button
          onClick={handlePrint}
          id="btn-print-card"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{t.digitalCard.downloadCard}</span>
        </button>
      </div>

      {/* Strict Security Policy Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <p>{t.digitalCard.securityNotice}</p>
      </div>
    </div>
  );
};
