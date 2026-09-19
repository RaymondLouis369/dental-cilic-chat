import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  FlaskConical,
  Search,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  PackageCheck,
  User,
  Phone,
  FileText,
  Filter,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Send,
  Printer,
  ShieldCheck,
  QrCode,
  Scan,
  Camera,
  Volume2,
  RefreshCw,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredLabOrders,
  updateLabOrderStatus,
  getUnreadLabChatMessageCount,
} from '../../lib/clinicalStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredBranches, getStoredStaffUsers } from '../../lib/storage';
import { LabOrder, LabOrderStatus } from '../../types/clinical';
import { Patient } from '../../types/patient';
import { Branch, StaffUser } from '../../types';
import { QrCodeSvg, generateLabOrderQrPayload } from '../../lib/labQrUtils';
import { LabOrderChatModal } from '../clinical/LabOrderChatModal';

// Helper: Web Audio API Scan Chime
function playScanChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

// Modal: Order QR Code Voucher Viewer & Printer
const LabOrderQrModal: React.FC<{
  order: LabOrder;
  patient?: Patient;
  isAr: boolean;
  onClose: () => void;
}> = ({ order, patient, isAr, onClose }) => {
  const qrPayload = generateLabOrderQrPayload(order.id);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <QrCode className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {isAr ? 'رمز المعمل وقسيمة الشحن' : 'Lab Order QR Voucher'}
              </h3>
              <p className="text-[11px] text-purple-200 font-mono">
                {qrPayload}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voucher Content */}
        <div className="p-6 text-center space-y-4 bg-slate-50/50">
          <div className="flex justify-center py-2">
            <QrCodeSvg value={qrPayload} size={180} />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700 shadow-2xs text-right">
            <div className="flex items-center justify-between font-bold border-b border-slate-100 pb-2">
              <span className="text-slate-500">{isAr ? 'المريض:' : 'Patient:'}</span>
              <span className="text-slate-900">
                {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isAr ? 'الإجراء:' : 'Service:'}</span>
              <span className="font-semibold text-purple-900">
                {isAr ? order.service_name_ar : order.service_name_en}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isAr ? 'الأسنان:' : 'Teeth:'}</span>
              <span className="font-mono font-bold text-purple-800">
                {order.teeth.length > 0 ? `#${order.teeth.join(', #')}` : 'Full Arch'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isAr ? 'درجة اللون:' : 'Shade:'}</span>
              <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                {order.shade_notes || 'Standard'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isAr ? 'المعمل:' : 'Lab:'}</span>
              <span className="font-semibold">{order.lab_name}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-500">{isAr ? 'تاريخ التسليم:' : 'Target Delivery:'}</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {order.delivery_date}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {isAr
              ? 'قم بمسح هذا الكود عند وصول الطرد لمكتب الاستقبال لتحديث الحالة تلقائياً إلى (مستلم / تم التسليم).'
              : 'Scan this code at Reception desk upon package arrival to update status to Delivered.'}
          </p>
        </div>

        {/* Dedicated Printable Delivery Tag Element (Formatted for @media print) */}
        <div
          id="printable-qr-tag-root"
          className="hidden print:block text-black p-6 bg-white font-sans max-w-md mx-auto border-4 border-black rounded-3xl"
        >
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase">LAB ORDER DELIVERY TAG</h1>
              <p className="text-xs font-mono font-bold text-slate-800">TAG ID: {qrPayload}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold block text-slate-600">ORDER DATE</span>
              <span className="text-xs font-mono font-bold">{order.order_date || 'Today'}</span>
            </div>
          </div>

          <div className="flex justify-center py-3 bg-slate-50 rounded-2xl border-2 border-black my-3">
            <QrCodeSvg value={qrPayload} size={200} color="#000000" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold border-t-2 border-b-2 border-black py-3 my-3">
            <div>
              <span className="text-[10px] text-slate-600 block uppercase">PATIENT IDENTIFIER</span>
              <span className="text-sm text-black font-black">
                {patient ? `${patient.first_name} ${patient.last_name[0] || ''}.` : 'Patient'}
              </span>
              {patient?.patient_code && (
                <span className="text-[10px] text-slate-600 font-mono block">CODE: #{patient.patient_code}</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-600 block uppercase">PRODUCT TYPE & SERVICE</span>
              <span className="text-xs text-black font-bold">
                {order.product_type ? `${order.product_type} - ` : ''}{order.service_name_en}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 block uppercase">TEETH & UNITS</span>
              <span className="text-xs font-mono text-black font-black">
                {order.teeth.length > 0 ? `#${order.teeth.join(', #')}` : 'Full Arch'} ({order.tooth_count ?? order.teeth.length} units)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 block uppercase">MATERIAL & FRAMEWORK</span>
              <span className="text-xs font-mono text-black font-black">
                {order.material || order.materials_notes || 'Zirconia'} ({order.framework || 'Monolithic'})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 block uppercase">STAGE & SHADE</span>
              <span className="text-xs font-mono text-black font-black">
                {order.try_in_or_final === 'try_in' ? 'TRY-IN STAGE' : 'FINAL RESTORATION'} | Shade: {order.shade_notes || 'A2'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 block uppercase">REQUIRED DELIVERY DATE</span>
              <span className="text-xs font-mono text-black font-black">{order.required_delivery_date || order.delivery_date}</span>
            </div>
          </div>

          <div className="text-center text-[10px] font-bold text-slate-800 pt-1">
            Attach this QR tag to physical parcel. Scan code upon reception delivery.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة كود وطاق الشحن' : 'Print Delivery QR Tag'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal: QR Delivery Scanner
const LabOrderScannerModal: React.FC<{
  labOrders: LabOrder[];
  patients: Patient[];
  isAr: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: LabOrderStatus) => void;
}> = ({ labOrders, patients, isAr, onClose, onUpdateStatus }) => {
  const [scannedInput, setScannedInput] = useState('');
  const [matchedOrder, setMatchedOrder] = useState<LabOrder | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameId = useRef<number | null>(null);

  // Auto-focus input for USB Barcode scanner guns
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Process Scanned Code
  const processCode = (rawCode: string) => {
    if (!rawCode.trim()) return;
    const clean = rawCode.trim();

    // Parse order ID from LAB-ORD-xxx or raw ID
    const found = labOrders.find(
      (o) =>
        o.id === clean ||
        `LAB-ORD-${o.id}` === clean ||
        clean.toLowerCase().includes(o.id.toLowerCase())
    );

    if (found) {
      playScanChime();
      setMatchedOrder(found);

      if (autoConfirm) {
        onUpdateStatus(found.id, 'delivered');
        const pat = patients.find((p) => p.id === found.patient_id);
        const patName = pat ? `${pat.first_name} ${pat.last_name}` : 'Patient';
        setScanStatusMsg(
          isAr
            ? `تم تحديث حالة طرد المعمل لـ (${patName}) إلى (تم التسليم بالمكتب ✓)`
            : `Order for ${patName} updated to DELIVERED ✓`
        );
      } else {
        setScanStatusMsg(isAr ? 'تم التطابق مع طلب المعمل بنجاح ✓' : 'Lab Order Code Matched ✓');
      }
    } else {
      setMatchedOrder(null);
      setScanStatusMsg(
        isAr
          ? '❌ لم يتم العثور على طلب معمل به الرسم أو الكود المدخل'
          : '❌ No matching active lab order found for code'
      );
    }
  };

  // Real-time camera feed and QR code decoding loop using jsQR
  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let isCancelled = false;

    async function startCamera() {
      if (!cameraActive) return;
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported in this browser environment');
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
        }

        const scanFrame = () => {
          if (isCancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (qrCode && qrCode.data) {
                setScannedInput(qrCode.data);
                processCode(qrCode.data);
              }
            }
          }
          animFrameId.current = requestAnimationFrame(scanFrame);
        };

        animFrameId.current = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setCameraError(
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? isAr
              ? 'تم رفض إذن الكاميرا. يمكنك الإدخال بواسطة البار كود أو الأزرار التفاعلية.'
              : 'Camera permission denied. Use USB barcode gun or manually select orders below.'
            : isAr
            ? 'لم يتم العثور على كاميرا متاحة. يمكنك مسح الكود من القارئ اليدوي.'
            : 'No active camera feed detected. You can scan via USB barcode gun or input field.'
        );
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive, facingMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setScannedInput(val);
    processCode(val);
  };

  const handleManualDeliver = () => {
    if (!matchedOrder) return;
    onUpdateStatus(matchedOrder.id, 'delivered');
    playScanChime();
    const pat = patients.find((p) => p.id === matchedOrder.patient_id);
    const patName = pat ? `${pat.first_name} ${pat.last_name}` : 'Patient';
    setScanStatusMsg(
      isAr
        ? `تم تسليم واستلام تركيب المريض (${patName}) بالمكتب بنجاح ✓`
        : `Order for ${patName} successfully delivered!`
    );
    setMatchedOrder((prev) => (prev ? { ...prev, status: 'delivered' } : null));
  };

  // Filter pending orders for quick-scan test buttons
  const pendingOrders = labOrders.filter(
    (o) => o.status !== 'fitted' && o.status !== 'cancelled'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isAr ? 'ماسح QR لتسليم التركيبات والمعامل' : 'Lab Delivery QR Code Scanner'}
              </h3>
              <p className="text-xs text-purple-200">
                {isAr
                  ? 'قم بتوجيه الكاميرا أو قارئ البار كود لتأكيد وصول شحنة المعمل'
                  : 'Scan physical parcel QR code to mark delivery as RECEIVED'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Real Live Camera Viewfinder Screen */}
          <div className="relative bg-slate-950 rounded-2xl border-2 border-purple-900/50 overflow-hidden h-56 flex flex-col items-center justify-center text-white shadow-inner">
            {/* Hidden Canvas for Decoding */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Live Camera Video Feed */}
            {cameraActive && !cameraError ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
                autoPlay
              />
            ) : null}

            {/* Viewfinder Camera Overlay Elements */}
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] pointer-events-none" />

            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_14px_rgba(239,68,68,0.95)] animate-bounce top-1/2 -translate-y-1/2 z-10" />

            {/* Target Framing Box */}
            <div className="w-40 h-40 border-2 border-dashed border-emerald-400/80 rounded-2xl flex items-center justify-center relative bg-emerald-500/10 z-10 shadow-lg">
              {!cameraActive && <QrCode className="w-16 h-16 text-emerald-400/40 animate-pulse" />}
              <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />
            </div>

            {/* Camera Error / Permission Banner */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center z-20 space-y-2">
                <Camera className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-slate-200 font-medium">{cameraError}</p>
                <button
                  onClick={() => {
                    setCameraActive(false);
                    setTimeout(() => setCameraActive(true), 100);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إعادة محاولة الكاميرا' : 'Retry Camera Access'}</span>
                </button>
              </div>
            )}

            {/* Viewfinder Controls & Status Bar */}
            <div className="absolute bottom-2 inset-x-2 text-center px-3 flex items-center justify-between text-[11px] text-slate-200 bg-slate-950/80 py-1.5 px-3 rounded-xl backdrop-blur-md border border-slate-800 z-20">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {cameraActive && !cameraError
                  ? isAr
                    ? 'الكاميرا تعمّل وجاهزة للمسح'
                    : 'Camera Live Scanning'
                  : isAr
                  ? 'الماسح اليدوي نشط'
                  : 'Manual Barcode Active'}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isAr ? 'تبديل الكاميرا' : 'Switch Cam'}</span>
                </button>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-bold">
                  <input
                    type="checkbox"
                    checked={autoConfirm}
                    onChange={(e) => setAutoConfirm(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span>{isAr ? 'تحديث تلقائي للمستلم' : 'Auto-Delivered on Scan'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Barcode Gun / Keyboard Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{isAr ? 'إدخال رمز البار كود / المبدئ يدوياً:' : 'Scanner / Order Code Input:'}</span>
              <span className="text-[10px] text-purple-700 font-normal">
                {isAr ? '(متوافق مع أجهزة قارئ البار كود USB)' : '(USB Barcode Gun Compatible)'}
              </span>
            </label>
            <div className="relative">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={scannedInput}
                onChange={handleInputChange}
                placeholder={
                  isAr
                    ? 'ضع المؤشر هنا وامسح الكود أو اكتب رقم الطلب (مثال: lab_ord_seed_1)...'
                    : 'Scan order code or type ID (e.g. LAB-ORD-lab_ord_seed_1)...'
                }
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
              {scannedInput && (
                <button
                  onClick={() => {
                    setScannedInput('');
                    setMatchedOrder(null);
                    setScanStatusMsg(null);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scan Feedback Message */}
          {scanStatusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                scanStatusMsg.includes('❌')
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scanStatusMsg}</span>
            </div>
          )}

          {/* Matched Order Card Preview */}
          {matchedOrder && (
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-150 pb-2">
                <span className="text-xs font-bold text-purple-900">
                  {isAr ? 'تفاصيل الطلب المطابق:' : 'Matched Order Details:'}
                </span>
                <span className="px-2 py-0.5 bg-purple-200 text-purple-900 text-[10px] font-mono font-bold rounded">
                  #{matchedOrder.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الإجراء:' : 'Service:'}</span>
                  <span className="font-bold text-slate-900">
                    {isAr ? matchedOrder.service_name_ar : matchedOrder.service_name_en}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الأسنان:' : 'Teeth:'}</span>
                  <span className="font-mono font-bold text-purple-900">
                    {matchedOrder.teeth.map((t) => `#${t}`).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'المعمل:' : 'Lab:'}</span>
                  <span className="font-semibold text-slate-800">{matchedOrder.lab_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'درجة اللون:' : 'Shade:'}</span>
                  <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1 py-0.5 rounded">
                    {matchedOrder.shade_notes || 'Standard'}
                  </span>
                </div>
              </div>

              {/* Confirm Deliver Action */}
              {matchedOrder.status !== 'delivered' && matchedOrder.status !== 'received' && (
                <button
                  type="button"
                  onClick={handleManualDeliver}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{isAr ? 'تأكيد الاستلام والتسليم للمركز ✓' : 'Confirm Order Delivered ✓'}</span>
                </button>
              )}
            </div>
          )}

          {/* Demo Active Orders Quick-Test List */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 block">
              {isAr ? 'أو اختر طرد من الأوامر النشطة لمحاكاة المسح السريع:' : 'Or click an active order to simulate QR scan:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {pendingOrders.map((ord) => (
                <button
                  key={ord.id}
                  onClick={() => {
                    const code = `LAB-ORD-${ord.id}`;
                    setScannedInput(code);
                    processCode(code);
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-purple-50 text-right rounded-xl border border-slate-200 hover:border-purple-300 text-xs font-medium transition-all flex items-center justify-between"
                >
                  <div className="truncate text-left">
                    <span className="font-bold text-slate-800 block truncate">
                      {isAr ? ord.service_name_ar : ord.service_name_en}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">#{ord.id}</span>
                  </div>
                  <Scan className="w-4 h-4 text-purple-600 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
          >
            {isAr ? 'تم / إغلاق' : 'Done / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface LabOrderManagementDashboardProps {
  onBackToAppointments?: () => void;
}

export const LabOrderManagementDashboard: React.FC<LabOrderManagementDashboardProps> = ({
  onBackToAppointments,
}) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // State
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [dateTypeFilter, setDateTypeFilter] = useState<'delivery_date' | 'order_date'>('delivery_date');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [labVendorFilter, setLabVendorFilter] = useState('all');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (session?.profile && 'branch_id' in session.profile && session.profile.branch_id) {
      return (session.profile as any).branch_id;
    }
    return 'all';
  });
  const [statusFilter, setStatusFilter] = useState<string>('all_active');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<LabOrder | null>(null);
  const [receptionNotes, setReceptionNotes] = useState('');
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // QR Modals state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedOrderForQr, setSelectedOrderForQr] = useState<LabOrder | null>(null);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<LabOrder | null>(null);

  const refreshData = () => setRefreshKey((k) => k + 1);

  // Load Base Data
  const labOrders: LabOrder[] = useMemo(() => getStoredLabOrders(), [refreshKey]);
  const patients: Patient[] = useMemo(() => getStoredPatients(), [refreshKey]);
  const branches: Branch[] = useMemo(() => getStoredBranches(), []);
  const staff: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);

  // Dynamic available options for dropdowns
  const availableServices = useMemo(() => {
    const list = new Set<string>();
    labOrders.forEach((o) => {
      if (o.service_name_en) list.add(o.service_name_en);
      if (o.service_name_ar) list.add(o.service_name_ar);
    });
    return Array.from(list);
  }, [labOrders]);

  const availableLabs = useMemo(() => {
    const list = new Set<string>();
    labOrders.forEach((o) => {
      if (o.lab_name) list.add(o.lab_name);
    });
    return Array.from(list);
  }, [labOrders]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (patientNameFilter.trim()) count++;
    if (startDateFilter || endDateFilter) count++;
    if (serviceCategoryFilter !== 'all') count++;
    if (labVendorFilter !== 'all') count++;
    if (selectedBranchId !== 'all') count++;
    if (statusFilter !== 'all_active') count++;
    return count;
  }, [
    searchQuery,
    patientNameFilter,
    startDateFilter,
    endDateFilter,
    serviceCategoryFilter,
    labVendorFilter,
    selectedBranchId,
    statusFilter,
  ]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setPatientNameFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setDateTypeFilter('delivery_date');
    setServiceCategoryFilter('all');
    setLabVendorFilter('all');
    setSelectedBranchId('all');
    setStatusFilter('all_active');
  };

  const setDatePreset = (preset: 'today' | 'week' | 'month' | 'clear') => {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDateFilter(todayFormatted);
      setEndDateFilter(todayFormatted);
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDateFilter(past.toISOString().split('T')[0]);
      setEndDateFilter(todayFormatted);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDateFilter(firstDay.toISOString().split('T')[0]);
      setEndDateFilter(todayFormatted);
    } else {
      setStartDateFilter('');
      setEndDateFilter('');
    }
  };

  // Today's Date String
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered Lab Orders
  const filteredOrders = useMemo(() => {
    return labOrders.filter((order) => {
      // 1. Branch filter
      if (selectedBranchId !== 'all' && order.branch_id !== selectedBranchId) {
        return false;
      }

      // 2. Status filter
      if (statusFilter === 'all_active') {
        if (order.status === 'fitted' || order.status === 'cancelled') {
          return false;
        }
      } else if (statusFilter !== 'all') {
        if (order.status !== statusFilter) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pat = patients.find((p) => p.id === order.patient_id);
        const doc = staff.find((s) => s.id === order.doctor_id);

        const patName = pat
          ? `${pat.first_name} ${pat.middle_name || ''} ${pat.last_name}`.toLowerCase()
          : '';
        const patCode = pat?.patient_code.toLowerCase() || '';
        const patPhone = pat?.primary_mobile || '';
        const serviceAr = (order.service_name_ar || '').toLowerCase();
        const serviceEn = (order.service_name_en || '').toLowerCase();
        const labName = (order.lab_name || '').toLowerCase();
        const doctorName = (doc?.display_name || '').toLowerCase();
        const teethStr = (order.teeth || []).join(', ');
        const orderIdStr = order.id.toLowerCase();

        const match =
          patName.includes(q) ||
          patCode.includes(q) ||
          patPhone.includes(q) ||
          serviceAr.includes(q) ||
          serviceEn.includes(q) ||
          labName.includes(q) ||
          doctorName.includes(q) ||
          teethStr.includes(q) ||
          orderIdStr.includes(q);

        if (!match) return false;
      }

      // 4. Patient Name Specific Filter
      if (patientNameFilter.trim()) {
        const pName = patientNameFilter.toLowerCase();
        const pat = patients.find((p) => p.id === order.patient_id);
        const patName = pat
          ? `${pat.first_name} ${pat.middle_name || ''} ${pat.last_name}`.toLowerCase()
          : '';
        const patCode = pat?.patient_code.toLowerCase() || '';

        if (!patName.includes(pName) && !patCode.includes(pName)) {
          return false;
        }
      }

      // 5. Order Date Range Filter
      if (startDateFilter || endDateFilter) {
        const orderTargetDate =
          dateTypeFilter === 'order_date'
            ? (order as any).order_date || order.created_at?.split('T')[0] || ''
            : order.delivery_date || '';

        if (orderTargetDate) {
          if (startDateFilter && orderTargetDate < startDateFilter) {
            return false;
          }
          if (endDateFilter && orderTargetDate > endDateFilter) {
            return false;
          }
        }
      }

      // 6. Service Category / Procedure Filter
      if (serviceCategoryFilter !== 'all') {
        const sAr = (order.service_name_ar || '').toLowerCase();
        const sEn = (order.service_name_en || '').toLowerCase();
        const cat = serviceCategoryFilter.toLowerCase();

        if (cat === 'crown_bridge') {
          const match =
            sEn.includes('crown') ||
            sEn.includes('bridge') ||
            sEn.includes('zircon') ||
            sEn.includes('pfm') ||
            sAr.includes('تاج') ||
            sAr.includes('جسر') ||
            sAr.includes('زيركون');
          if (!match && sEn !== cat && sAr !== cat) return false;
        } else if (cat === 'veneer') {
          const match =
            sEn.includes('veneer') ||
            sEn.includes('smile') ||
            sAr.includes('عدس') ||
            sAr.includes('فينير');
          if (!match && sEn !== cat && sAr !== cat) return false;
        } else if (cat === 'implant') {
          const match =
            sEn.includes('implant') ||
            sEn.includes('abutment') ||
            sAr.includes('زرع') ||
            sAr.includes('زراعة');
          if (!match && sEn !== cat && sAr !== cat) return false;
        } else if (cat === 'denture') {
          const match =
            sEn.includes('denture') ||
            sEn.includes('acrylic') ||
            sAr.includes('طقم') ||
            sAr.includes('متحرك');
          if (!match && sEn !== cat && sAr !== cat) return false;
        } else if (cat === 'ortho') {
          const match =
            sEn.includes('ortho') ||
            sEn.includes('retainer') ||
            sAr.includes('تقويم') ||
            sAr.includes('حافظ');
          if (!match && sEn !== cat && sAr !== cat) return false;
        } else {
          if (sEn !== cat && sAr !== cat && !sEn.includes(cat) && !sAr.includes(cat)) {
            return false;
          }
        }
      }

      // 7. Lab Vendor Filter
      if (labVendorFilter !== 'all') {
        if (order.lab_name !== labVendorFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    labOrders,
    selectedBranchId,
    statusFilter,
    searchQuery,
    patientNameFilter,
    startDateFilter,
    endDateFilter,
    dateTypeFilter,
    serviceCategoryFilter,
    labVendorFilter,
    patients,
    staff,
  ]);

  // Statistics Breakdown
  const stats = useMemo(() => {
    const branchScope = labOrders.filter(
      (o) => selectedBranchId === 'all' || o.branch_id === selectedBranchId
    );

    const totalActive = branchScope.filter(
      (o) => o.status !== 'fitted' && o.status !== 'cancelled'
    ).length;

    const sentOrInProd = branchScope.filter(
      (o) => o.status === 'sent_to_lab' || o.status === 'in_production'
    ).length;

    const receivedAtReception = branchScope.filter(
      (o) => o.status === 'received' || o.status === 'delivered'
    ).length;

    const dueToday = branchScope.filter(
      (o) =>
        o.delivery_date === todayStr &&
        o.status !== 'fitted' &&
        o.status !== 'cancelled'
    ).length;

    const overdue = branchScope.filter(
      (o) =>
        o.delivery_date < todayStr &&
        o.status !== 'received' &&
        o.status !== 'delivered' &&
        o.status !== 'fitted' &&
        o.status !== 'cancelled'
    ).length;

    return {
      totalActive,
      sentOrInProd,
      receivedAtReception,
      dueToday,
      overdue,
    };
  }, [labOrders, selectedBranchId, todayStr]);

  // Handle Mark Received / Delivered Quick Action
  const handleMarkAsReceived = (orderId: string, customStatus: LabOrderStatus = 'delivered') => {
    const order = labOrders.find((o) => o.id === orderId);
    if (!order) return;

    // Update status in storage
    updateLabOrderStatus(orderId, customStatus);

    // Show temporary success feedback banner
    const pat = patients.find((p) => p.id === order.patient_id);
    const patName = pat ? `${pat.first_name} ${pat.last_name}` : 'Patient';
    setActionSuccessMessage(
      isAr
        ? `تم تسجيل استلام وتسليم طرد المعمل لـ (${patName}) بنجاح ✓`
        : `Lab order for ${patName} successfully marked as DELIVERED at Reception.`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);

    setReceivingOrderId(null);
    setSelectedOrderForReceipt(null);
    setReceptionNotes('');
    refreshData();
  };

  // Handle Quick Status Change
  const handleStatusChange = (orderId: string, newStatus: LabOrderStatus) => {
    updateLabOrderStatus(orderId, newStatus);
    refreshData();
  };

  const getStatusBadgeConfig = (status: LabOrderStatus) => {
    switch (status) {
      case 'sent_to_lab':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: isAr ? 'تم الإرسال للمعمل' : 'Sent to Lab',
          icon: Send,
        };
      case 'in_production':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: isAr ? 'قيد التصنيع' : 'In Production',
          icon: Clock,
        };
      case 'delivered':
      case 'received':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
          label: isAr ? 'تم التسليم بالمكتب ✓' : 'Delivered to Desk ✓',
          icon: PackageCheck,
        };
      case 'fitted':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          label: isAr ? 'تم التركيب للمريض' : 'Fitted to Patient',
          icon: CheckCircle,
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: isAr ? 'ملغي' : 'Cancelled',
          icon: X,
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          label: status,
          icon: FlaskConical,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl shadow-xs">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {isAr ? 'إدارة التركيبات وأوامر المعمل' : 'Lab Order Management'}
                </h1>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200 font-mono">
                  {stats.totalActive} {isAr ? 'أمر نشط' : 'active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'متابعة شحنات التاج والعدسات والتركيبات الخارجية وتأكيد الاستلام بمسح رمز QR'
                  : 'Track dental lab dispatches, impression status, and scan delivery QR codes.'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main QR Scanner Trigger Button */}
          <button
            id="open-qr-delivery-scanner-btn"
            onClick={() => setShowScannerModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Scan className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>{isAr ? 'مسح QR تسليم الطرد' : 'Scan Delivery QR Code'}</span>
          </button>

          {onBackToAppointments && (
            <button
              onClick={onBackToAppointments}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
              <span>{isAr ? 'العودة لجدول المواعيد' : 'Back to Schedule'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Success Alert Banner */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{isAr ? 'الأوامر النشطة' : 'Active Orders'}</span>
            <FlaskConical className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.totalActive}
          </div>
          <p className="text-[11px] text-slate-400">
            {isAr ? 'جميع الأوامر غير المكتملة' : 'All non-fitted cases'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-700 font-medium">
            <span>{isAr ? 'بالمعمل / قيد التصنيع' : 'Sent / In Production'}</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono">
            {stats.sentOrInProd}
          </div>
          <p className="text-[11px] text-blue-600 font-medium">
            {isAr ? 'في انتظار الشحن للمركز' : 'Awaiting arrival'}
          </p>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>{isAr ? 'مستلمة بالمكتب (تم التسليم)' : 'Delivered to Desk'}</span>
            <PackageCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono">
            {stats.receivedAtReception}
          </div>
          <p className="text-[11px] text-emerald-700 font-bold">
            {isAr ? 'جاهزة لتركيب المريض ✓' : 'Ready for patient fitting'}
          </p>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>{isAr ? 'مواعيد تسليم اليوم / متأخرة' : 'Due Today / Overdue'}</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-amber-900 font-mono">
              {stats.dueToday}
            </div>
            {stats.overdue > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                {stats.overdue} {isAr ? 'متأخر' : 'overdue'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700">
            {isAr ? 'مطلوب استلامها عاجلاً' : 'High priority follow-up'}
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Branch Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-700">
              {isAr ? 'الفرع:' : 'Branch:'}
            </span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">
                {isAr ? 'جميع الفروع (المركز كاملاً)' : 'All Branches'}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box & Advanced Toggle Buttons */}
          <div className="flex flex-1 items-center gap-2 max-w-xl">
            {/* Quick Keyword Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'بحث سريع (اسم المريض، الكود، المعمل، رمز QR...)'
                    : 'Quick search (patient, code, lab, QR ID...)'
                }
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Advanced Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shrink-0 ${
                isAdvancedFiltersOpen || activeFiltersCount > 0
                  ? 'bg-purple-50 text-purple-900 border-purple-300 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-purple-600" />
              <span>{isAr ? 'تصفية متقدمة' : 'Advanced Filters'}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              {isAdvancedFiltersOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {/* Reset Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-rose-200 shrink-0"
                title={isAr ? 'إعادة ضبط كافة الفلاتر' : 'Reset all filters'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer Panel */}
        {isAdvancedFiltersOpen && (
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                <span>{isAr ? 'خيارات البحث والتصفية المتقدمة:' : 'Advanced Search & Filter Parameters:'}</span>
              </span>
              <button
                onClick={() => setIsAdvancedFiltersOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filter 1: Patient Name Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isAr ? 'اسم المريض / كود المريض:' : 'Patient Name / Code:'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientNameFilter}
                    onChange={(e) => setPatientNameFilter(e.target.value)}
                    placeholder={isAr ? 'اكتب اسم المريض بالتفصيل...' : 'Enter patient first/last name...'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                  {patientNameFilter && (
                    <button
                      onClick={() => setPatientNameFilter('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter 2: Service Category / Procedure */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isAr ? 'تصنيف الخدمة / الإجراء:' : 'Service Category:'}</span>
                </label>
                <select
                  value={serviceCategoryFilter}
                  onChange={(e) => setServiceCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">{isAr ? 'جميع التصنيفات والخدمات' : 'All Categories & Services'}</option>
                  <optgroup label={isAr ? 'التصنيفات الرئيسية' : 'Main Categories'}>
                    <option value="crown_bridge">{isAr ? 'تيجان وجسور (زيركون / PFM)' : 'Crowns & Bridges (Zirconia / PFM)'}</option>
                    <option value="veneer">{isAr ? 'عدسات أسنان وفيينير' : 'Dental Veneers & Smiles'}</option>
                    <option value="implant">{isAr ? 'تركيبات زراعة الأسنان' : 'Implant Prosthetics & Abutments'}</option>
                    <option value="denture">{isAr ? 'أطقم أسنان متحركة' : 'Removable Dentures & Acrylic'}</option>
                    <option value="ortho">{isAr ? 'أجهزة تقويم وحافظات مسافة' : 'Orthodontics & Retainers'}</option>
                  </optgroup>
                  {availableServices.length > 0 && (
                    <optgroup label={isAr ? 'الخدمات المتاحة حالياً' : 'Active Order Services'}>
                      {availableServices.map((srv) => (
                        <option key={srv} value={srv}>
                          {srv}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Filter 3: External Lab Vendor */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isAr ? 'المعمل الخارجي المورد:' : 'External Lab Vendor:'}</span>
                </label>
                <select
                  value={labVendorFilter}
                  onChange={(e) => setLabVendorFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">{isAr ? 'جميع معامل الأسنان الخارجية' : 'All Dental Labs'}</option>
                  {availableLabs.map((lab) => (
                    <option key={lab} value={lab}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Order Date Range */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isAr ? 'النطاق الزمني:' : 'Date Range Filter:'}</span>
                  </label>

                  {/* Date Mode Toggle */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDateTypeFilter('delivery_date')}
                      className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${
                        dateTypeFilter === 'delivery_date'
                          ? 'bg-white text-purple-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isAr ? 'التسليم' : 'Delivery'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateTypeFilter('order_date')}
                      className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${
                        dateTypeFilter === 'order_date'
                          ? 'bg-white text-purple-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isAr ? 'الطلب' : 'Order'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px] font-mono focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px] font-mono focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Range Preset Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-bold">{isAr ? 'اختصارات التاريخ السريعة:' : 'Quick Date Presets:'}</span>
                <button
                  type="button"
                  onClick={() => setDatePreset('today')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                >
                  {isAr ? 'اليوم' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('week')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                >
                  {isAr ? 'آخر 7 أيام' : 'Past 7 Days'}
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('month')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                >
                  {isAr ? 'هذا الشهر' : 'This Month'}
                </button>
                {(startDateFilter || endDateFilter) && (
                  <button
                    type="button"
                    onClick={() => setDatePreset('clear')}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[11px] font-bold text-rose-700"
                  >
                    {isAr ? 'مسح التواريخ' : 'Clear Dates'}
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-bold">
                {isAr ? `نتائج البحث: (${filteredOrders.length} من أصل ${labOrders.length})` : `Showing ${filteredOrders.length} of ${labOrders.length} orders`}
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-purple-600" />
              <span>{isAr ? 'الفلاتر النشطة:' : 'Active Filters:'}</span>
            </span>

            {patientNameFilter && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold rounded-lg flex items-center gap-1">
                <span>{isAr ? `المريض: ${patientNameFilter}` : `Patient: ${patientNameFilter}`}</span>
                <button onClick={() => setPatientNameFilter('')} className="hover:text-purple-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(startDateFilter || endDateFilter) && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold rounded-lg flex items-center gap-1">
                <span>
                  {dateTypeFilter === 'delivery_date' ? (isAr ? 'التسليم:' : 'Delivery:') : (isAr ? 'الطلب:' : 'Order:')}{' '}
                  {startDateFilter || '...'} → {endDateFilter || '...'}
                </span>
                <button onClick={() => setDatePreset('clear')} className="hover:text-purple-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {serviceCategoryFilter !== 'all' && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold rounded-lg flex items-center gap-1">
                <span>{isAr ? `الخدمة: ${serviceCategoryFilter}` : `Service: ${serviceCategoryFilter}`}</span>
                <button onClick={() => setServiceCategoryFilter('all')} className="hover:text-purple-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {labVendorFilter !== 'all' && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold rounded-lg flex items-center gap-1">
                <span>{isAr ? `المعمل: ${labVendorFilter}` : `Lab: ${labVendorFilter}`}</span>
                <button onClick={() => setLabVendorFilter('all')} className="hover:text-purple-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold rounded-lg flex items-center gap-1">
                <span>{isAr ? `نص البحث: "${searchQuery}"` : `Query: "${searchQuery}"`}</span>
                <button onClick={() => setSearchQuery('')} className="hover:text-purple-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline ml-1"
            >
              {isAr ? 'مسح الكل' : 'Clear all'}
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>{isAr ? 'الحالة:' : 'Status:'}</span>
          </span>

          {[
            { id: 'all_active', labelAr: 'الطلبات النشطة (الجارية)', labelEn: 'Active Orders' },
            { id: 'all', labelAr: 'جميع الحالات', labelEn: 'All Orders' },
            { id: 'sent_to_lab', labelAr: 'أُرسلت للمعمل', labelEn: 'Sent to Lab' },
            { id: 'in_production', labelAr: 'قيد التصنيع', labelEn: 'In Production' },
            { id: 'delivered', labelAr: 'تم التسليم بالمكتب ✓', labelEn: 'Delivered ✓' },
            { id: 'fitted', labelAr: 'تم التركيب', labelEn: 'Fitted' },
            { id: 'cancelled', labelAr: 'ملغية', labelEn: 'Cancelled' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List / Cards Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <FlaskConical className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {isAr ? 'لا توجد طلبات معمل مطابقة للبحث' : 'No lab orders match your filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isAr
              ? 'تأكد من اختيار الفرع المناسب أو خيار التصفية لتحديد أوامر تركيب الأسنان المطلوبة.'
              : 'Try selecting a different branch scope or clearing your search filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const pat = patients.find((p) => p.id === order.patient_id);
            const doc = staff.find((s) => s.id === order.doctor_id);
            const branch = branches.find((b) => b.id === order.branch_id);
            const cfg = getStatusBadgeConfig(order.status);
            const StatusIcon = cfg.icon;

            const isOverdue =
              order.delivery_date < todayStr &&
              order.status !== 'received' &&
              order.status !== 'delivered' &&
              order.status !== 'fitted' &&
              order.status !== 'cancelled';

            const isDueToday =
              order.delivery_date === todayStr &&
              order.status !== 'received' &&
              order.status !== 'delivered' &&
              order.status !== 'fitted' &&
              order.status !== 'cancelled';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs hover:shadow-md space-y-4 ${
                  isOverdue
                    ? 'border-red-300 bg-red-50/20'
                    : isDueToday
                    ? 'border-amber-300 bg-amber-50/20'
                    : order.status === 'received' || order.status === 'delivered'
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Row: Patient Info & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm shadow-2xs">
                      {pat ? pat.first_name[0] : 'P'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {pat ? `${pat.first_name} ${pat.middle_name || ''} ${pat.last_name}` : 'Patient Name'}
                        </h3>
                        {pat?.patient_code && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-mono font-bold border border-slate-200">
                            #{pat.patient_code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        {pat?.primary_mobile && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {pat.primary_mobile}
                          </span>
                        )}
                        <span>•</span>
                        <span>{branch?.name || 'Main Branch'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-2xs ${cfg.bg}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{cfg.label}</span>
                    </span>

                    {/* View / Print QR Voucher Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForQr(order)}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold flex items-center gap-1 border border-purple-200 transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isAr ? 'عرض QR' : 'QR Voucher'}</span>
                    </button>

                    {/* Lab Order Technical Chat Button */}
                    {(() => {
                      const unread = getUnreadLabChatMessageCount(order.id, session?.profile.id || '');
                      return (
                        <button
                          type="button"
                          id={`lab-order-chat-btn-${order.id}`}
                          onClick={() => setSelectedOrderForChat(order)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl text-xs font-bold flex items-center gap-1 border border-indigo-200 transition-all relative"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isAr ? 'تواصل المعمل' : 'Lab Chat'}</span>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black font-mono">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })()}

                    {/* Quick Mark Delivered Button */}
                    {(order.status === 'sent_to_lab' || order.status === 'in_production') && (
                      <button
                        type="button"
                        id={`mark-received-btn-${order.id}`}
                        onClick={() => handleMarkAsReceived(order.id, 'delivered')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all animate-pulse"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>{isAr ? 'تأكيد التسليم بالمكتب ✓' : 'Mark Delivered ✓'}</span>
                      </button>
                    )}

                    {/* Quick Status Select */}
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value as LabOrderStatus)
                      }
                      className="text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
                    >
                      <option value="sent_to_lab">{isAr ? 'أُرسل للمعمل' : 'Sent to Lab'}</option>
                      <option value="in_production">{isAr ? 'قيد التصنيع' : 'In Production'}</option>
                      <option value="delivered">{isAr ? 'تم التسليم بالمكتب ✓' : 'Delivered ✓'}</option>
                      <option value="received">{isAr ? 'مستلم بالمكتب ✓' : 'Received ✓'}</option>
                      <option value="fitted">{isAr ? 'تم التركيب' : 'Fitted'}</option>
                      <option value="cancelled">{isAr ? 'ملغي' : 'Cancelled'}</option>
                    </select>
                  </div>
                </div>

                {/* Content Row: Procedure Details & Manufacturing Specs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Service, Product Type & Teeth */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isAr ? 'الإجراء والنوع والأسنان:' : 'Service, Type & Teeth:'}
                    </span>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>{isAr ? order.service_name_ar : order.service_name_en}</span>
                      {order.product_type && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded text-[10px] font-bold border border-blue-200">
                          {order.product_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-700 font-semibold mt-1 flex-wrap">
                      <span>{isAr ? 'الأسنان:' : 'Teeth:'}</span>
                      {order.teeth.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {order.teeth.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-mono font-bold text-[10px] border border-purple-200"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          {isAr ? 'غير محدد' : 'General'}
                        </span>
                      )}
                      <span className="text-slate-500 font-normal">
                        ({order.tooth_count ?? (order.teeth.length || 1)} {isAr ? 'سن' : 'units'})
                      </span>
                    </div>
                  </div>

                  {/* Manufacturing Specs: Material, Framework, Stage */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isAr ? 'خامة التصنيع والهيكل:' : 'Material & Framework Specs:'}
                    </span>
                    <div className="font-bold text-purple-900 text-xs">
                      {order.material || order.materials_notes || 'Zirconia'}
                    </div>
                    <div className="text-slate-700 text-[11px] flex items-center gap-1">
                      <span className="font-semibold">{isAr ? 'الهيكل:' : 'Framework:'}</span>
                      <span className="font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                        {order.framework || 'Monolithic'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="font-semibold text-slate-600">{isAr ? 'المرحلة:' : 'Stage:'}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.try_in_or_final === 'try_in'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {order.try_in_or_final === 'try_in'
                          ? isAr
                            ? 'تجربة (Try-In)'
                            : 'Try-In Stage'
                          : isAr
                          ? 'تسليم نهائي (Final)'
                          : 'Final Restoration'}
                      </span>
                    </div>
                  </div>

                  {/* Lab & Shade & Pontic/Abutment */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isAr ? 'المعمل ودعامة السن (Lab/Shade/Abutment):' : 'Lab, Shade & Abutment:'}
                    </span>
                    <div className="font-bold text-purple-900">
                      {order.lab_name || (isAr ? 'معمل تركيبات معتمد' : 'Partner Dental Lab')}
                    </div>
                    <div className="text-slate-700 flex items-center gap-2">
                      <div>
                        <span className="font-semibold">{isAr ? 'اللون: ' : 'Shade: '}</span>
                        <span className="font-mono bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                          {order.shade_notes || 'Standard'}
                        </span>
                      </div>
                      {order.pontic && order.pontic !== 'N/A' && (
                        <span className="text-[10px] font-mono bg-slate-200 text-slate-800 px-1 py-0.5 rounded">
                          Pontic: {order.pontic}
                        </span>
                      )}
                    </div>
                    {order.abutment && order.abutment !== 'N/A' && (
                      <div className="text-[11px] text-slate-600 font-semibold">
                        Abutment: {order.abutment}
                      </div>
                    )}
                  </div>

                  {/* Dates & Doctor */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isAr ? 'موعد التسليم والطبيب:' : 'Target Delivery & Doctor:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">
                        {isAr ? 'تاريخ التسليم:' : 'Required Delivery:'}
                      </span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                          isOverdue
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : isDueToday
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {order.required_delivery_date || order.delivery_date}
                        {isOverdue && (isAr ? ' (متأخر)' : ' (Overdue)')}
                        {isDueToday && (isAr ? ' (اليوم)' : ' (Due Today)')}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {doc ? doc.display_name : isAr ? 'دكتور المعالجة' : 'Attending Doctor'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Doctor Clinical Notes vs Lab Technician Manufacturing Notes */}
                {(order.doctor_notes || order.lab_notes || order.notes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {(order.doctor_notes || order.notes) && (
                      <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-150 text-blue-950 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{isAr ? 'تعليمات الطبيب المعالج: ' : 'Doctor Instructions: '}</span>
                          <span>{order.doctor_notes || order.notes}</span>
                        </div>
                      </div>
                    )}

                    {order.lab_notes && (
                      <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-150 text-purple-950 flex items-start gap-2">
                        <Tag className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{isAr ? 'تعليمات فني المعمل: ' : 'Lab Tech Notes: '}</span>
                          <span>{order.lab_notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachment References (STL / 3D Scans / Photos) */}
                {order.attachment_refs && order.attachment_refs.length > 0 && (
                  <div className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isAr ? 'ملفات المسح الضوئي والصور:' : 'Scan/Photo References:'}</span>
                    </span>
                    {order.attachment_refs.map((att, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px] text-slate-800 shadow-2xs"
                      >
                        {att}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Scanner Modal */}
      {showScannerModal && (
        <LabOrderScannerModal
          labOrders={labOrders}
          patients={patients}
          isAr={isAr}
          onClose={() => setShowScannerModal(false)}
          onUpdateStatus={(orderId, status) => {
            updateLabOrderStatus(orderId, status);
            refreshData();
          }}
        />
      )}

      {/* QR Code Voucher Modal */}
      {selectedOrderForQr && (
        <LabOrderQrModal
          order={selectedOrderForQr}
          patient={patients.find((p) => p.id === selectedOrderForQr.patient_id)}
          isAr={isAr}
          onClose={() => setSelectedOrderForQr(null)}
        />
      )}

      {/* Lab Order Technical Chat Modal */}
      {selectedOrderForChat && (
        <LabOrderChatModal
          order={selectedOrderForChat}
          onClose={() => {
            setSelectedOrderForChat(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
};

