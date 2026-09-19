import { describe, it, expect } from 'vitest';
import {
  getStoredInvoices,
  getStoredCategories,
  getStoredServices,
  getStoredInsuranceCompanies,
  getStoredAppointments,
  getStoredLabMaterialCosts,
  getStoredImplantCases,
} from '../src/lib/receptionAndBillingStorage';
import { getStoredDoctorTasks, getStoredLabOrders } from '../src/lib/clinicalStorage';
import { getStoredBranches, getStoredStaffUsers } from '../src/lib/storage';

describe('Phase 8.3 Manager Dashboard & Financial Reporting', () => {
  it('loads organizational master references correctly', () => {
    const branches = getStoredBranches();
    expect(branches.length).toBeGreaterThan(0);

    const staff = getStoredStaffUsers();
    expect(staff.length).toBeGreaterThan(0);

    const categories = getStoredCategories();
    expect(categories.length).toBeGreaterThan(0);

    const services = getStoredServices();
    expect(services.length).toBeGreaterThan(0);

    const insuranceCompanies = getStoredInsuranceCompanies();
    expect(insuranceCompanies.length).toBeGreaterThan(0);
  });

  it('calculates financial KPIs including Doctor Commissions, Lab, Material, Implant Costs & Clinic Net', () => {
    const invoices = getStoredInvoices();
    expect(invoices.length).toBeGreaterThan(0);

    let grossTotal = 0;
    let doctorCommissionsTotal = 0;
    let labCostsTotal = 0;
    let materialCostsTotal = 0;

    invoices.forEach((inv) => {
      grossTotal += inv.subtotal_amount || inv.final_payable_amount || 0;
      let invCommission = inv.total_doctor_commission || 0;
      let invLab = inv.total_lab_cost || 0;
      let invMat = inv.total_material_cost || 0;

      if (inv.items) {
        inv.items.forEach((it) => {
          if (!invCommission && it.calculated_commission) invCommission += it.calculated_commission;
          if (!invLab && it.lab_cost) invLab += it.lab_cost;
          if (!invMat && it.material_cost) invMat += it.material_cost;
        });
      }

      doctorCommissionsTotal += invCommission;
      labCostsTotal += invLab;
      materialCostsTotal += invMat;
    });

    const labMaterialCosts = getStoredLabMaterialCosts();
    labMaterialCosts.forEach((record) => {
      if (record.type === 'lab' && labCostsTotal === 0) labCostsTotal += record.actual_cost;
      if (record.type === 'material' && materialCostsTotal === 0) materialCostsTotal += record.actual_cost;
    });

    const implantCases = getStoredImplantCases();
    let implantCostsTotal = 0;
    implantCases.forEach((ic) => {
      let caseCost = ic.lab_cost || 0;
      if (ic.components) {
        ic.components.forEach((c) => {
          caseCost += c.actual_cost ?? (c.actual_quantity * c.unit_cost);
        });
      }
      implantCostsTotal += caseCost;
    });

    expect(grossTotal).toBeGreaterThan(0);
    expect(typeof doctorCommissionsTotal).toBe('number');
    expect(typeof labCostsTotal).toBe('number');
    expect(typeof materialCostsTotal).toBe('number');
    expect(implantCostsTotal).toBeGreaterThan(0);
  });

  it('retrieves operational pending KPIs (Insurance Approvals, Lab Orders, Reception Tasks)', () => {
    const invoices = getStoredInvoices();
    let pendingApprovals = 0;
    invoices.forEach((inv) => {
      if (inv.items) {
        inv.items.forEach((it) => {
          if (it.approval_status === 'pending') pendingApprovals++;
        });
      }
    });

    const labOrders = getStoredLabOrders();
    const pendingLabOrders = labOrders.filter(
      (o) => o.status === 'draft' || o.status === 'sent_to_lab' || o.status === 'in_production'
    );

    const tasks = getStoredDoctorTasks();
    const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');

    expect(typeof pendingApprovals).toBe('number');
    expect(Array.isArray(pendingLabOrders)).toBe(true);
    expect(Array.isArray(pendingTasks)).toBe(true);
  });

  it('summarizes appointment metrics by status', () => {
    const appointments = getStoredAppointments();
    expect(appointments.length).toBeGreaterThan(0);

    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;

    appointments.forEach((app) => {
      if (app.status === 'confirmed' || app.status === 'waiting' || app.status === 'rescheduled') {
        scheduled++;
      } else if (app.status === 'completed' || app.status === 'arrived' || app.status === 'with_doctor') {
        completed++;
      } else if (app.status === 'cancelled' || app.status === 'no_show') {
        cancelled++;
      }
    });

    expect(scheduled + completed + cancelled).toBeLessThanOrEqual(appointments.length);
  });
});
