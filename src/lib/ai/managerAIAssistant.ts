/**
 * Wave 4: Operational AI & Manager Risk Signals Intelligence Engine
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Operational Assistant for Center Managers & Branch Managers.
 * Computes explainable forecasting indicators, risk signals,
 * operational trend summaries, and actionable recommendations
 * using real Wave 1–3 persisted data.
 */

import { calculateAdvancedBIMetrics } from '../biAnalyticsStorage';
import { getStoredInventoryItems } from '../inventoryStorage';
import { getStoredLabOrders } from '../clinicalStorage';
import { getStoredWhatsAppLogs } from '../communicationStorage';
import { getStoredSupportTickets } from '../complaintStorage';
import { getStoredAppointments } from '../receptionAndBillingStorage';
import { AIActionProposal, AISourceCategory } from './types';

export interface AIRiskSignal {
  id: string;
  category: 'no_show' | 'recall_backlog' | 'inventory_low' | 'overdue_lab' | 'insurance_claims' | 'communication_failures';
  riskLevel: 'low' | 'medium' | 'high';
  titleAr: string;
  titleEn: string;
  explanationAr: string;
  explanationEn: string;
  dataSummary: string;
  sourceCategory: AISourceCategory;
  proposedAction?: AIActionProposal;
}

export interface ManagerAIReport {
  organizationId: string;
  branchId: string;
  biSummaryTextAr: string;
  biSummaryTextEn: string;
  riskSignals: AIRiskSignal[];
  proposedActions: AIActionProposal[];
  generatedAt: string;
}

/**
 * Generates operational risk signals and explainable indicators using real persisted models.
 */
export function calculateOperationalAIRisks(
  organizationId: string,
  branchId?: string
): AIRiskSignal[] {
  const branchFilter = branchId || 'all';
  const signals: AIRiskSignal[] = [];

  // 1. Appointment No-Show Risk Analysis
  const appointments = getStoredAppointments().filter((apt) => {
    if (apt.organization_id !== organizationId) return false;
    if (branchFilter !== 'all' && apt.branch_id !== branchFilter) return false;
    return true;
  });

  const totalApts = appointments.length;
  const noShows = appointments.filter((a) => a.status === 'no_show').length;
  const noShowRate = totalApts > 0 ? Math.round((noShows / totalApts) * 100) : 0;

  if (noShowRate > 15 || noShows >= 3) {
    signals.push({
      id: 'risk_noshow_01',
      category: 'no_show',
      riskLevel: noShowRate > 25 ? 'high' : 'medium',
      titleAr: 'ارتفاع معدل عدم الحضور بدون إخطار (No-Show Risk)',
      titleEn: 'High Appointment No-Show Rate Signal',
      explanationAr: `معدل عدم الحضور الحالي هو ${noShowRate}% (${noShows} مواعيد فائتة). ينصح بتفعيل تذكير واتساب التلقائي قبل الموعد بـ 24 ساعة.`,
      explanationEn: `Current no-show rate is ${noShowRate}% (${noShows} missed appointments). Automated 24h WhatsApp reminders recommended.`,
      dataSummary: `إجمالي المواعيد: ${totalApts} | عدم الحضور: ${noShows} (${noShowRate}%)`,
      sourceCategory: 'Appointment Data',
      proposedAction: {
        id: `act_noshow_${Date.now()}`,
        actionType: 'send_whatsapp_message',
        titleAr: 'إرسال حملة تذكير دفعة واحدة للمواعيد القادمة',
        titleEn: 'Send Batch Reminders for Upcoming Appointments',
        descriptionAr: 'تأكيد الحجز وتذكير المرضى بمواعيد الغد عبر الواتساب للحد من عدم الحضور',
        descriptionEn: 'Send automated WhatsApp reminders to tomorrow patients to minimize no-shows',
        targetEntity: 'organization',
        targetId: organizationId,
        parameters: { organizationId, messageType: '24h_reminder' },
        sourceAttribution: 'Appointment Data',
        requiresApproval: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    });
  }

  // 2. Inventory Low-Stock Risk Analysis
  const inventoryItems = getStoredInventoryItems(organizationId).filter((item) => {
    if (branchFilter !== 'all' && item.branch_id !== branchFilter) return false;
    return true;
  });

  const lowStockItems = inventoryItems.filter((i) => i.current_quantity <= i.minimum_reorder_level);

  if (lowStockItems.length > 0) {
    const itemNames = lowStockItems.map((i) => i.item_name_ar || i.item_name_en).join('، ');
    signals.push({
      id: 'risk_inventory_01',
      category: 'inventory_low',
      riskLevel: lowStockItems.length > 3 ? 'high' : 'medium',
      titleAr: 'مخاطر نفاذ مخزون المواد والمستلزمات الحيوية',
      titleEn: 'Low Stock & Material Depletion Risk',
      explanationAr: `يوجد ${lowStockItems.length} صنف وصل إلى حد إعادة الطلب الأدنى (${itemNames}). يرجى إصدار طلب توريد مجدول.`,
      explanationEn: `${lowStockItems.length} inventory items reached minimum reorder threshold (${itemNames}). Supply reorder advised.`,
      dataSummary: `الأصناف منخفضة المخزون: ${lowStockItems.length} من أصل ${inventoryItems.length} أصناف`,
      sourceCategory: 'Lab/Inventory Data',
      proposedAction: {
        id: `act_inv_${Date.now()}`,
        actionType: 'adjust_inventory',
        titleAr: 'إنشاء التنبيه والتجهيز لإعادة طلب الأصناف المنخفضة',
        titleEn: 'Flag Low Stock Items & Prepare Reorder',
        descriptionAr: 'تحديث حالة الأصناف المنخفضة وإشعار مسؤول المشتريات للطلب من الموردين',
        descriptionEn: 'Flag depleted items and alert procurement manager for supplier restock',
        targetEntity: 'inventory',
        targetId: lowStockItems[0]?.id || 'inv_batch',
        parameters: { organizationId, lowStockCount: lowStockItems.length },
        sourceAttribution: 'Lab/Inventory Data',
        requiresApproval: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    });
  }

  // 3. Overdue Lab Orders Risk Analysis
  const todayIso = new Date().toISOString().split('T')[0];
  const labOrders = getStoredLabOrders().filter((lo) => {
    if (lo.organization_id !== organizationId) return false;
    if (branchFilter !== 'all' && lo.branch_id !== branchFilter) return false;
    return true;
  });

  const overdueLabOrders = labOrders.filter(
    (lo) => lo.delivery_date < todayIso && lo.status !== 'delivered' && lo.status !== 'fitted'
  );

  if (overdueLabOrders.length > 0) {
    signals.push({
      id: 'risk_lab_01',
      category: 'overdue_lab',
      riskLevel: overdueLabOrders.length > 2 ? 'high' : 'medium',
      titleAr: 'تأخير استلام طلبات المعمل والتركيبات',
      titleEn: 'Overdue Prosthetic & Lab Orders Risk',
      explanationAr: `يوجد ${overdueLabOrders.length} طلب معمل تجاوز موعد التسليم المتوقع دون استلام في الفرع.`,
      explanationEn: `${overdueLabOrders.length} dental lab orders past expected delivery date without receipt.`,
      dataSummary: `طلبات معمل متأخرة: ${overdueLabOrders.length}`,
      sourceCategory: 'Lab/Inventory Data',
    });
  }

  // 4. WhatsApp Communication Failure Risk Analysis
  const commLogs = getStoredWhatsAppLogs(organizationId);
  const failedCommLogs = commLogs.filter((l) => l.delivery_state === 'failed');

  if (failedCommLogs.length > 0) {
    signals.push({
      id: 'risk_comm_01',
      category: 'communication_failures',
      riskLevel: failedCommLogs.length > 5 ? 'high' : 'medium',
      titleAr: 'فشل تسليم رسائل واتساب للعملاء',
      titleEn: 'WhatsApp Message Delivery Failure Risk',
      explanationAr: `تعذر تسليم ${failedCommLogs.length} رسالة واتساب بسبب أخطاء الشبكة أو الرقم. يرجى المراجعة وإعادة المحاولة.`,
      explanationEn: `${failedCommLogs.length} WhatsApp messages failed delivery. Retry queue execution advised.`,
      dataSummary: `رسائل فاشلة: ${failedCommLogs.length}`,
      sourceCategory: 'Clinic Database',
    });
  }

  return signals;
}

/**
 * Generates an executive Manager AI Operational & BI Report.
 */
export function generateManagerAIReport(
  organizationId: string,
  branchId?: string
): ManagerAIReport {
  const branchFilter = branchId || 'all';
  const biMetrics = calculateAdvancedBIMetrics({ organizationId, branchId: branchFilter });
  const riskSignals = calculateOperationalAIRisks(organizationId, branchFilter);

  const proposedActions: AIActionProposal[] = [];
  riskSignals.forEach((sig) => {
    if (sig.proposedAction) {
      proposedActions.push(sig.proposedAction);
    }
  });

  const biSummaryTextAr = `[المصدر: قاعدة البيانات المالية والتنفيذية - Financial Data]
تقرير الذكاء التشغيلي والإداري للمركز:
• إجمالي الإيرادات المفوترة: ${biMetrics.grossInvoicedEgp.toLocaleString()} ج.م | المحصل الفعلي: ${biMetrics.totalCollectedEgp.toLocaleString()} ج.م
• الرصيد المتبقي غير المحصل: ${biMetrics.outstandingBalanceEgp.toLocaleString()} ج.م (نسبة التحصيل: ${biMetrics.collectionsTrendPercent}%)
• تغطية بوالص التأمين: ${biMetrics.insuranceCoveredEgp.toLocaleString()} ج.م (نسبة الموافقة: ${biMetrics.insuranceApprovalRatePercent}%)
• معدل استغلال المواعيد: ${biMetrics.appointmentUtilizationRatePercent}% | معدل عدم الحضور: ${biMetrics.noShowRatePercent}%
• مؤشرات المخاطر الحالية: ${riskSignals.length} مؤشر يستوجب المتابعة.`;

  const biSummaryTextEn = `[Source: Financial Data & Clinic Database]
Executive Operational & BI Intelligence Report:
• Gross Invoiced: EGP ${biMetrics.grossInvoicedEgp.toLocaleString()} | Collected: EGP ${biMetrics.totalCollectedEgp.toLocaleString()}
• Outstanding Balance: EGP ${biMetrics.outstandingBalanceEgp.toLocaleString()} (Collection Trend: ${biMetrics.collectionsTrendPercent}%)
• Insurance Coverage: EGP ${biMetrics.insuranceCoveredEgp.toLocaleString()} (Approval Rate: ${biMetrics.insuranceApprovalRatePercent}%)
• Appointment Utilization: ${biMetrics.appointmentUtilizationRatePercent}% | No-Show Rate: ${biMetrics.noShowRatePercent}%
• Active Operational Risk Signals: ${riskSignals.length} requiring management review.`;

  return {
    organizationId,
    branchId: branchFilter,
    biSummaryTextAr,
    biSummaryTextEn,
    riskSignals,
    proposedActions,
    generatedAt: new Date().toISOString(),
  };
}
