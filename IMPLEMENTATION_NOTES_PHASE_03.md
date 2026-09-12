# IMPLEMENTATION NOTES — PHASE 03: RECEPTION, SCHEDULING, SERVICE CATALOG, PRICING & INSURANCE

**Project:** Dental Clinic & Dental Center Management Platform — Egypt  
**Phase:** Phase 03 (Reception Dashboard, Scheduling, Service Catalog, Pricing Resolution, Insurance Framework & Custom Services)  
**Status:** Completed & Verified  

---

## 1. Architectural Principles & Scope

Phase 03 establishes the operational and financial core of the dental center:
- **Reception Workspace:** Fast-paced patient check-in, real-time waiting queue management, walk-in ticket generation, and shift-based doctor appointment booking.
- **Service Catalog & Hierarchical Categories:** Organization-wide standardized dental procedures categorized by specialty (General Dentistry, Endodontics, Periodontics, Prosthodontics, Orthodontics, Surgery, Pedodontics).
- **Multi-Version Cash Price Lists:** Draft, Validated, Preview, Published, and Archived lifecycle for tariff versions with automated Excel bulk import validation.
- **Contracted vs. Non-Contracted Insurance Resolution:** Engine supporting contracted copay matrices, non-contracted percentage discounts, annual caps, and prior-approval requirements.
- **Insurance Card Visualizer & OCR Templates:** Configurable card templates with bounding-box OCR coordinate mappings for front-desk card scanning.
- **Custom / Ad-Hoc Service Review:** Temporary unlisted service creation with front-desk pricing, review queues for center managers, and mapping to standard codes.

---

## 2. Database Schema & Data Models (`src/types/receptionAndBilling.ts`)

### Tables & Entities:
1. **`service_categories`**: Dental taxonomy groupings with display ordering and active flags.
2. **`services` (`dental_services`)**: Master dental catalog specifying codes, Arabic/English names, default durations in minutes, and doctor/approval flags.
3. **`doctor_shifts`**: Weekly recurring shifts (days 0–6) defining working hours, lunch break intervals, branch bindings, and slot duration (e.g., 30 mins).
4. **`appointments`**: Bookings linking patient, doctor, branch, service, date, start/end times, and lifecycle statuses (`confirmed`, `arrived`, `with_doctor`, `completed`, `cancelled`, `no_show`).
5. **`waiting_list_entries`**: Real-time queue entries with ticket numbers (e.g., `A-01`, `W-05`), priority levels (`normal`, `urgent`, `vip`), and estimated wait times.
6. **`price_lists` & `price_list_versions`**: Organization-level tariff versioning with effective date ranges and publishing workflows.
7. **`price_list_items`**: Base cash prices per service in Egyptian Pounds (EGP).
8. **`insurance_companies` & `insurance_plans`**: Corporate and insurance carrier profiles with default coverage percentages, copays, and non-contracted discount policies.
9. **`insurance_price_lists` & `insurance_price_list_items`**: Contracted rate tables with procedure-specific copays and pre-authorization requirements.
10. **`insurance_card_templates` & `insurance_card_fields`**: Card layout definitions with OCR bounding boxes for member ID, policy number, and expiry date.
11. **`custom_patient_services`**: Ad-hoc service ledger with manager approval workflow and conversion to standard catalog items.

---

## 3. Core Engines & Business Logic (`src/lib/receptionAndBillingStorage.ts`)

### 3.1 Pricing Resolution Engine (`resolveServicePrice`)
Resolves pricing dynamically based on the patient's coverage status:
1. **Cash Patient:** Applies active published price list (`price_type: 'cash'`).
2. **Contracted Insurance:** Looks up `insurance_price_list_items` for the specific plan:
   - Calculates insurance portion and patient copay.
   - Flags services requiring prior approval from insurance.
3. **Non-Contracted Insurance:** If company allows non-contracted discounts, applies configured discount percentage (e.g. 15%) to cash price, splitting balance as patient copay.
4. **Uncovered / Inactive:** Returns standard cash rate with contextual explanation.

### 3.2 Slot Availability & Shift Calculation
- Evaluates doctor shift definitions against existing bookings.
- Automatically excludes scheduled lunch breaks and conflicting appointments.
- Supports variable service duration snapping to discrete slot increments.

### 3.3 Bulk Excel Tariff Importer & Validator
- Performs row-by-row syntax and semantic validation.
- Checks service code uniqueness, positive numeric pricing in EGP, and required Arabic/English labels.
- Provides comprehensive pre-import summary (Total, Valid, Invalid rows with exact line errors).

---

## 4. UI Components & Modules

- **`ReceptionDashboardView.tsx`**: High-density reception console featuring branch KPIs, daily appointment timetable, and quick check-in actions.
- **`AppointmentBookingModal.tsx`**: Multi-step booking wizard with doctor slot picker, patient selector, and service search.
- **`WaitingQueueManager.tsx`**: Real-time waiting room board with ticket assignment and queue priority toggles.
- **`ServiceCatalogManager.tsx`**: Management view for dental service categories and procedure master records.
- **`PriceListManager.tsx`**: Tariff version editor with draft/publish transitions and Excel batch importer.
- **`InsuranceManager.tsx`**: Carrier directory, contracted plan matrices, and card template visualizer with OCR field mappings.
- **`CustomServicesReview.tsx`**: Center manager governance interface for reviewing and standardizing ad-hoc services.

---

## 5. Acceptance Verification

All Phase 03 operational and billing test scenarios verify:
- Accurate shift-based slot generation and break blackout.
- Real-time queue transition (`waiting` $\rightarrow$ `with_doctor` $\rightarrow$ `completed`).
- Multi-tier pricing calculation across cash, contracted insurance, and non-contracted discounts.
- Excel tariff bulk import validation and error reporting.
- Custom service creation, approval, and catalog assimilation.
