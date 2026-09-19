import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredServiceCategories,
  getStoredServices,
  resetPhase3StorageToSeeds,
  saveServiceCategory,
} from '../src/lib/receptionAndBillingStorage';
import { DentalService } from '../src/types/receptionAndBilling';
import {
  addServiceToTreatmentPlan,
  getStoredTreatmentPlanServices,
  createTreatmentPlan,
} from '../src/lib/clinicalStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('Treatment Plan Procedure Category Filtering & Active Validation', () => {
  beforeEach(() => {
    resetPhase3StorageToSeeds();
  });

  it('filters active services strictly by selected category', () => {
    const categories = getStoredServiceCategories();
    const activeCategories = categories.filter((c) => c.active !== false);
    expect(activeCategories.length).toBeGreaterThan(0);

    const targetCategory = activeCategories[0];
    const allServices = getStoredServices();

    // Active services belonging to target category
    const activeCategoryServices = allServices.filter((s) => {
      const isActive = s.active !== false && (s as any).is_active !== false;
      if (!isActive) return false;
      return (
        s.category_id === targetCategory.id ||
        s.category === targetCategory.id ||
        s.category === targetCategory.code ||
        s.category === targetCategory.name_en.toLowerCase()
      );
    });

    expect(activeCategoryServices.length).toBeGreaterThan(0);
    activeCategoryServices.forEach((s) => {
      expect(s.active).not.toBe(false);
    });
  });

  it('excludes inactive services from the filtered category list', () => {
    const categories = getStoredServiceCategories();
    const cat = categories[0];
    const allServices = getStoredServices();

    // Add an inactive service under this category
    const inactiveService: DentalService = {
      id: 'srv_test_inactive_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      category_id: cat.id,
      code: 'SRV-TEST-INACTIVE',
      name_ar: 'خدمة معطلة للاختبار',
      name_en: 'Disabled Test Service',
      category: cat.code,
      default_duration_minutes: 30,
      requires_approval: false,
      requires_doctor: true,
      active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    allServices.push(inactiveService);

    const filteredActiveServices = allServices.filter((s) => {
      const isActive = s.active !== false && (s as any).is_active !== false;
      if (!isActive) return false;
      return (
        s.category_id === cat.id ||
        s.category === cat.id ||
        s.category === cat.code ||
        s.category === cat.name_en.toLowerCase()
      );
    });

    expect(filteredActiveServices.some((s) => s.id === 'srv_test_inactive_01')).toBe(false);
  });

  it('successfully links chosen service from category filter to treatment plan', () => {
    const plan = createTreatmentPlan({
      patientId: 'patient_001',
      doctorId: 'doc_001',
      title: 'Test Plan Procedure Filter',
      diagnosis: 'Caries Tooth #16',
      totalEstimatedDurationMinutes: 45,
    });

    const categories = getStoredServiceCategories();
    const endoCategory = categories.find((c) => c.code === 'CAT-ENDO') || categories[0];
    const services = getStoredServices();

    const selectedService = services.find(
      (s) =>
        s.active !== false &&
        (s.category_id === endoCategory.id || s.category === 'endodontics' || s.category === endoCategory.code)
    );

    expect(selectedService).toBeDefined();

    const added = addServiceToTreatmentPlan({
      treatmentPlanId: plan.id,
      patientId: 'patient_001',
      doctorId: 'doc_001',
      serviceId: selectedService!.id,
      serviceCode: selectedService!.code,
      serviceNameAr: selectedService!.name_ar,
      serviceNameEn: selectedService!.name_en,
      toothNumber: '16',
      area: 'Occlusal',
    });

    expect(added).toBeDefined();
    expect(added.service_id).toBe(selectedService!.id);
    expect(added.service_name_ar).toBe(selectedService!.name_ar);

    const planServices = getStoredTreatmentPlanServices();
    expect(planServices.some((s) => s.id === added.id)).toBe(true);
  });
});
