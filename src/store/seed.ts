// ---------------------------------------------------------------------------
// Fictional seed records for the demonstration. Nothing here refers to real
// JNL Traders customers, staff, vehicles, suppliers or finances.
// Dates are generated relative to "today" so due/overdue states are visible.
// ---------------------------------------------------------------------------
import type { DataState, DemoUser, Role } from './types';
import { addDays, todayIso, toIso } from '../lib/dates';

const uid = (() => {
  let n = 1000;
  return (prefix: string) => `${prefix}_${(n++).toString(36)}`;
})();

function ts(daysAgo: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function monthStart(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return toIso(d);
}

const ALL: DemoUser['modules'] = ['overview', 'finance', 'procurement', 'ppe', 'fleet', 'reports', 'hr', 'safety', 'owner', 'admin'];

/** Fictional demo users with module-scoped access (simulated). */
export function seedUsers(): DemoUser[] {
  return [
    { id: 'u_admin', name: 'Demo Super Admin', title: 'System administrator', role: 'admin', modules: [...ALL], canApprove: true, canReviewFinance: true, isSuperAdmin: true },
    { id: 'u_owner', name: 'Demo Owner', title: 'Owner / director', role: 'owner', modules: ALL.filter((m) => m !== 'admin'), canApprove: true, canReviewFinance: true, isSuperAdmin: false },
    { id: 'u_supervisor', name: 'Demo Supervisor', title: 'Operations manager', role: 'manager', modules: ['overview', 'procurement', 'ppe', 'fleet', 'reports', 'safety'], canApprove: true, canReviewFinance: false, isSuperAdmin: false },
    { id: 'u_finance', name: 'Demo Finance Clerk', title: 'Finance', role: 'finance', modules: ['overview', 'finance', 'procurement', 'ppe', 'reports'], canApprove: false, canReviewFinance: true, isSuperAdmin: false },
    { id: 'u_procurement', name: 'Demo Procurement Officer', title: 'Procurement', role: 'finance', modules: ['overview', 'procurement', 'ppe'], canApprove: false, canReviewFinance: true, isSuperAdmin: false },
    { id: 'u_hr', name: 'Demo HR Officer', title: 'Human resources', role: 'manager', modules: ['overview', 'hr', 'safety'], canApprove: false, canReviewFinance: false, isSuperAdmin: false },
    { id: 'u_fleet', name: 'Demo Fleet Controller', title: 'Fleet & equipment', role: 'requester', modules: ['overview', 'fleet', 'procurement', 'safety'], canApprove: false, canReviewFinance: false, isSuperAdmin: false },
    { id: 'u_requester', name: 'Demo Requester', title: 'Workshop employee', role: 'requester', modules: ['overview', 'procurement', 'ppe', 'safety'], canApprove: false, canReviewFinance: false, isSuperAdmin: false },
  ];
}

export function buildSeed(): DataState {
  const today = todayIso();

  const customers = [
    { id: 'cus_1', name: 'Example Industrial Client (Pty) Ltd', contact: 'A. Sample', email: 'accounts@example.com', phone: '011 000 0001', address: '1 Sample Road, Demo Park, 0001', vatNumber: '4000000001' },
    { id: 'cus_2', name: 'Demo Mining Services', contact: 'B. Placeholder', email: 'procurement@example.com', phone: '012 000 0002', address: '22 Fictional Avenue, Testville, 0002', vatNumber: '4000000002' },
    { id: 'cus_3', name: 'Sample Construction Co.', contact: 'C. Example', email: 'office@example.com', phone: '013 000 0003', address: '7 Mock Street, Demo City, 0003' },
    { id: 'cus_4', name: 'Placeholder Logistics', contact: 'D. Demo', email: 'admin@example.com', phone: '014 000 0004', address: '90 Prototype Drive, Sampleton, 0004', vatNumber: '4000000004' },
  ];

  const li = (description: string, qty: number, unitPrice: number, discountPct = 0) => ({ id: uid('li'), description, qty, unitPrice, discountPct });

  // --- Invoices across the last eight months (fictional) -------------------
  const invoiceSpecs: Array<{ n: number; cus: string; monthOffset: number; day: number; items: ReturnType<typeof li>[]; status: 'issued' | 'draft'; fromQuote?: string }> = [
    { n: 201, cus: 'cus_1', monthOffset: -7, day: 6, items: [li('Sample equipment supply', 12, 1250), li('Site delivery (fictional)', 4, 850)], status: 'issued' },
    { n: 202, cus: 'cus_2', monthOffset: -6, day: 12, items: [li('Demo consumables pack', 40, 310), li('Sample site service', 8, 500)], status: 'issued' },
    { n: 203, cus: 'cus_3', monthOffset: -5, day: 3, items: [li('Illustrative hire — compactor', 12, 1400, 5)], status: 'issued' },
    { n: 204, cus: 'cus_1', monthOffset: -4, day: 18, items: [li('Sample equipment supply', 16, 1250), li('Sample site service', 6, 500)], status: 'issued' },
    { n: 205, cus: 'cus_4', monthOffset: -3, day: 9, items: [li('Demo transport (per load)', 18, 980)], status: 'issued' },
    { n: 206, cus: 'cus_2', monthOffset: -2, day: 21, items: [li('Demo consumables pack', 45, 310, 10), li('Illustrative safety signage', 12, 275)], status: 'issued' },
    { n: 207, cus: 'cus_3', monthOffset: -1, day: 7, items: [li('Illustrative hire — generator', 14, 1900)], status: 'issued' },
    { n: 208, cus: 'cus_1', monthOffset: 0, day: 2, items: [li('Sample equipment supply', 10, 1250), li('Site delivery (fictional)', 2, 850)], status: 'issued' },
    { n: 209, cus: 'cus_4', monthOffset: 0, day: 3, items: [li('Demo transport (per load)', 14, 980), li('Sample site service', 2, 500)], status: 'issued' },
  ];

  const invoices = invoiceSpecs.map((s) => {
    const base = monthStart(s.monthOffset);
    const date = addDays(base, s.day - 1);
    const id = `inv_${s.n}`;
    return {
      id,
      number: `INV-D0${s.n}`,
      customerId: s.cus,
      date,
      dueDate: addDays(date, 30),
      items: s.items,
      vatRate: 15,
      pricesIncludeVat: false,
      notes: 'Fictional invoice for demonstration purposes only. Not a valid tax invoice.',
      status: s.status,
      createdAt: `${date}T09:00:00.000Z`,
      updatedAt: `${date}T09:00:00.000Z`,
    };
  });

  // --- Payments (fictional): older invoices settled, recent ones open ------
  const gross = (items: ReturnType<typeof li>[]) => Math.round(items.reduce((t, it) => t + it.qty * it.unitPrice * (1 - it.discountPct / 100), 0) * 1.15 * 100) / 100;
  const payments = [
    { id: uid('pay'), invoiceId: 'inv_201', date: addDays(invoices[0].date, 21), amount: gross(invoiceSpecs[0].items), method: 'eft' as const, reference: 'DEMO-EFT-0001', createdAt: ts(200) },
    { id: uid('pay'), invoiceId: 'inv_202', date: addDays(invoices[1].date, 25), amount: gross(invoiceSpecs[1].items), method: 'eft' as const, reference: 'DEMO-EFT-0002', createdAt: ts(170) },
    { id: uid('pay'), invoiceId: 'inv_203', date: addDays(invoices[2].date, 14), amount: gross(invoiceSpecs[2].items), method: 'eft' as const, reference: 'DEMO-EFT-0003', createdAt: ts(140) },
    { id: uid('pay'), invoiceId: 'inv_204', date: addDays(invoices[3].date, 30), amount: gross(invoiceSpecs[3].items), method: 'eft' as const, reference: 'DEMO-EFT-0004', createdAt: ts(100) },
    { id: uid('pay'), invoiceId: 'inv_205', date: addDays(invoices[4].date, 18), amount: gross(invoiceSpecs[4].items), method: 'card' as const, reference: 'DEMO-CARD-0005', createdAt: ts(70) },
    { id: uid('pay'), invoiceId: 'inv_206', date: addDays(invoices[5].date, 20), amount: 9000, method: 'eft' as const, reference: 'DEMO-EFT-0006 (part payment)', createdAt: ts(40) },
  ];
  // Normalise payment amounts to cents precision.
  for (const p of payments) p.amount = Math.round(p.amount * 100) / 100;

  // --- Quotations ----------------------------------------------------------
  const quotations = [
    {
      id: 'quo_101', number: 'Q-D0101', customerId: 'cus_1', date: addDays(today, -12), validUntil: addDays(today, 18),
      items: [li('Sample equipment supply', 2, 1250), li('Sample site service', 3, 500)], vatRate: 15, pricesIncludeVat: false,
      notes: 'Quotation prepared for demonstration purposes. No actual commercial offer is represented.',
      status: 'issued' as const, createdAt: ts(12, 10, 15), updatedAt: ts(12, 10, 15),
    },
    {
      id: 'quo_102', number: 'Q-D0102', customerId: 'cus_3', date: addDays(today, -5), validUntil: addDays(today, 25),
      items: [li('Illustrative hire — generator', 6, 1900, 10), li('Fuel allowance (fictional)', 1, 2400)], vatRate: 15, pricesIncludeVat: false,
      notes: 'Fictional quotation. Rates shown are illustrative only.',
      status: 'accepted' as const, createdAt: ts(5, 14, 5), updatedAt: ts(2, 9, 30),
    },
    {
      id: 'quo_103', number: 'Q-D0103', customerId: 'cus_2', date: today, validUntil: addDays(today, 30),
      items: [li('Demo consumables pack', 10, 356.5)], vatRate: 15, pricesIncludeVat: true,
      notes: 'Draft quotation with VAT-inclusive pricing for calculation testing.',
      status: 'draft' as const, createdAt: ts(0, 10, 42), updatedAt: ts(0, 10, 42),
    },
  ];

  // --- Requests (procurement + PPE) ----------------------------------------
  const h = (daysAgo: number, byRole: Role, byName: string, action: string, note?: string) => ({ id: uid('h'), at: ts(daysAgo, 9 + (daysAgo % 6), (daysAgo * 7) % 60), byRole, byName, action, note });
  const ri = (description: string, qty: number, estUnitCost: number) => ({ id: uid('ri'), description, qty, estUnitCost });

  const requests = [
    {
      id: 'req_031', number: 'REQ-D031', kind: 'procurement' as const, title: 'Workshop consumables restock', department: 'Workshop', requesterName: 'Demo Requester', requesterRole: 'requester' as const, requesterUserId: 'u_requester',
      neededBy: addDays(today, -20), justification: 'Monthly consumables for fictional workshop operations.', items: [ri('Cutting discs (box)', 4, 420), ri('Welding rods (5kg)', 6, 310)],
      status: 'fulfilled' as const, purchaseOrderId: 'po_011',
      history: [h(40, 'requester', 'Demo Requester', 'Created draft'), h(39, 'requester', 'Demo Requester', 'Submitted for approval'), h(37, 'manager', 'Demo Manager', 'Approved', 'Within monthly consumables budget.'), h(36, 'finance', 'Demo Finance', 'Purchase order raised', 'PO-D011'), h(28, 'finance', 'Demo Finance', 'Marked fulfilled', 'Goods received.')],
      createdAt: ts(40), updatedAt: ts(28),
    },
    {
      id: 'req_032', number: 'REQ-D032', kind: 'ppe' as const, title: 'Safety boots — site crew', department: 'Operations', requesterName: 'Demo Supervisor', requesterRole: 'manager' as const, requesterUserId: 'u_supervisor',
      neededBy: addDays(today, -10), justification: 'Replacement boots for fictional crew of six.', items: [ri('Safety boots (pair)', 6, 650)],
      status: 'fulfilled' as const, purchaseOrderId: 'po_012',
      history: [h(30, 'requester', 'Demo Supervisor', 'Submitted for approval'), h(29, 'manager', 'Demo Manager', 'Approved'), h(27, 'finance', 'Demo Finance', 'Purchase order raised', 'PO-D012'), h(18, 'finance', 'Demo Finance', 'Marked fulfilled')],
      createdAt: ts(30), updatedAt: ts(18),
    },
    {
      id: 'req_033', number: 'REQ-D033', kind: 'procurement' as const, title: 'Replacement tyres — FLT-002', department: 'Fleet', requesterName: 'Demo Fleet Controller', requesterRole: 'requester' as const, requesterUserId: 'u_fleet',
      neededBy: addDays(today, 7), justification: 'Tyres on fictional service vehicle below legal tread depth.', items: [ri('Tyre 265/65 R17', 4, 1850)],
      status: 'approved' as const,
      history: [h(9, 'requester', 'Demo Fleet Clerk', 'Submitted for approval'), h(7, 'manager', 'Demo Manager', 'Approved', 'Safety-critical. Proceed.')],
      createdAt: ts(9), updatedAt: ts(7),
    },
    {
      id: 'req_034', number: 'REQ-D034', kind: 'ppe' as const, title: 'Hi-vis vests and hard hats', department: 'Operations', requesterName: 'Demo Supervisor', requesterRole: 'manager' as const, requesterUserId: 'u_supervisor',
      neededBy: addDays(today, 14), justification: 'New fictional site induction batch.', items: [ri('Hi-vis vest', 12, 95), ri('Hard hat', 12, 140)],
      status: 'submitted' as const,
      history: [h(3, 'requester', 'Demo Supervisor', 'Created draft'), h(2, 'requester', 'Demo Supervisor', 'Submitted for approval')],
      createdAt: ts(3), updatedAt: ts(2),
    },
    {
      id: 'req_035', number: 'REQ-D035', kind: 'procurement' as const, title: 'Office printer toner', department: 'Admin', requesterName: 'Demo Requester', requesterRole: 'requester' as const, requesterUserId: 'u_requester',
      neededBy: addDays(today, 10), justification: 'Fictional admin supplies.', items: [ri('Toner cartridge (black)', 2, 1150)],
      status: 'submitted' as const,
      history: [h(1, 'requester', 'Demo Admin', 'Submitted for approval')],
      createdAt: ts(1), updatedAt: ts(1),
    },
    {
      id: 'req_036', number: 'REQ-D036', kind: 'procurement' as const, title: 'Second-hand compressor', department: 'Workshop', requesterName: 'Demo Requester', requesterRole: 'requester' as const, requesterUserId: 'u_requester',
      neededBy: addDays(today, 21), justification: 'Requested fictional backup compressor.', items: [ri('Compressor 200L (used)', 1, 14500)],
      status: 'rejected' as const,
      history: [h(6, 'requester', 'Demo Requester', 'Submitted for approval'), h(4, 'owner', 'Demo Owner', 'Rejected', 'Not budgeted this quarter. Re-submit in the new period.')],
      createdAt: ts(6), updatedAt: ts(4),
    },
    {
      id: 'req_037', number: 'REQ-D037', kind: 'ppe' as const, title: 'Respirator cartridges', department: 'Workshop', requesterName: 'Demo Requester', requesterRole: 'requester' as const, requesterUserId: 'u_requester',
      neededBy: addDays(today, 5), justification: 'Replacement cartridges for fictional spray booth work.', items: [ri('Respirator cartridge (pair)', 10, 180)],
      status: 'submitted' as const,
      history: [h(1, 'requester', 'Demo Requester', 'Submitted for approval')],
      createdAt: ts(1, 15, 10), updatedAt: ts(1, 15, 10),
    },
    {
      id: 'req_038', number: 'REQ-D038', kind: 'procurement' as const, title: 'Laptop for site office', department: 'Admin', requesterName: 'Demo Requester', requesterRole: 'requester' as const, requesterUserId: 'u_requester',
      neededBy: addDays(today, 30), justification: 'Draft — fictional request not yet submitted.', items: [ri('Laptop (mid-range)', 1, 12500)],
      status: 'draft' as const,
      history: [h(0, 'requester', 'Demo Admin', 'Created draft')],
      createdAt: ts(0, 8, 5), updatedAt: ts(0, 8, 5),
    },
  ];

  const purchaseOrders = [
    { id: 'po_011', number: 'PO-D011', requestId: 'req_031', supplier: 'Sample Industrial Supplies', date: addDays(today, -36), expected: addDays(today, -30), items: requests[0].items, status: 'received' as const, createdAt: ts(36) },
    { id: 'po_012', number: 'PO-D012', requestId: 'req_032', supplier: 'Demo Safety Wear CC', date: addDays(today, -27), expected: addDays(today, -20), items: requests[1].items, status: 'received' as const, createdAt: ts(27) },
    { id: 'po_013', number: 'PO-D013', supplier: 'Placeholder Fuel Depot', date: addDays(today, -8), expected: addDays(today, -1), items: [ri('Diesel (litres)', 1200, 21.5)], status: 'open' as const, createdAt: ts(8) },
  ];

  // --- Assets ---------------------------------------------------------------
  const asset = (p: Partial<DataState['assets'][number]> & Pick<DataState['assets'][number], 'id' | 'ref' | 'kind' | 'name' | 'make' | 'model' | 'registration' | 'status'>) => ({
    assignedTo: '', notes: '', createdAt: ts(120), updatedAt: ts(5), ...p,
  });

  const assets = [
    asset({ id: 'ast_1', ref: 'FLT-001', kind: 'vehicle', name: 'Demo transport vehicle A', make: 'Sample Motors', model: 'Flatbed 3.5t', registration: 'DEMO 001 XX', year: 2019, status: 'active', assignedTo: 'Operations', serviceDue: addDays(today, 20), licenceDue: addDays(today, 95), insuranceDue: addDays(today, 160), odometer: 148_320 }),
    asset({ id: 'ast_2', ref: 'FLT-002', kind: 'vehicle', name: 'Demo service vehicle B', make: 'Example Autos', model: 'Double-cab 2.4', registration: 'DEMO 002 XX', year: 2021, status: 'in-service', assignedTo: 'Workshop', serviceDue: addDays(today, 11), licenceDue: addDays(today, 40), insuranceDue: addDays(today, 200), odometer: 87_410, notes: 'Tyres on order (REQ-D033).' }),
    asset({ id: 'ast_3', ref: 'FLT-003', kind: 'vehicle', name: 'Demo delivery van C', make: 'Sample Motors', model: 'Panel van 2.0', registration: 'DEMO 003 XX', year: 2018, status: 'active', assignedTo: 'Deliveries', serviceDue: addDays(today, 62), licenceDue: addDays(today, -6), insuranceDue: addDays(today, 120), odometer: 203_900 }),
    asset({ id: 'ast_4', ref: 'FLT-004', kind: 'vehicle', name: 'Demo tipper D', make: 'Placeholder Trucks', model: 'Tipper 6m³', registration: 'DEMO 004 XX', year: 2016, status: 'active', assignedTo: 'Site crew', serviceDue: addDays(today, 130), licenceDue: addDays(today, 25), insuranceDue: addDays(today, 15), odometer: 311_050 }),
    asset({ id: 'ast_5', ref: 'FLT-005', kind: 'vehicle', name: 'Demo bakkie E', make: 'Example Autos', model: 'Single-cab 2.2', registration: 'DEMO 005 XX', year: 2022, status: 'inactive', assignedTo: 'Unassigned', serviceDue: addDays(today, 210), licenceDue: addDays(today, 300), insuranceDue: addDays(today, 240), odometer: 22_140, notes: 'Fictional vehicle parked pending decision.' }),
    asset({ id: 'ast_6', ref: 'EQP-001', kind: 'equipment', name: 'Demo generator 45kVA', make: 'Sample Power', model: 'G45', registration: 'SN-DEMO-45001', year: 2020, status: 'active', assignedTo: 'Site crew', serviceDue: addDays(today, 8), inspectionDue: addDays(today, 45) }),
    asset({ id: 'ast_7', ref: 'EQP-002', kind: 'equipment', name: 'Demo compactor plate', make: 'Example Plant', model: 'CP-90', registration: 'SN-DEMO-90017', year: 2017, status: 'active', assignedTo: 'Site crew', serviceDue: addDays(today, 75), inspectionDue: addDays(today, -3) }),
    asset({ id: 'ast_8', ref: 'EQP-003', kind: 'equipment', name: 'Demo equipment C — welder', make: 'Placeholder Tools', model: 'MIG-250', registration: 'SN-DEMO-25004', year: 2019, status: 'in-service', assignedTo: 'Workshop', serviceDue: addDays(today, 6), inspectionDue: addDays(today, 90), licenceDue: addDays(today, 6) }),
    asset({ id: 'ast_9', ref: 'EQP-004', kind: 'equipment', name: 'Demo forklift', make: 'Sample Lift', model: 'FL-2.5', registration: 'SN-DEMO-FL250', year: 2015, status: 'active', assignedTo: 'Yard', serviceDue: addDays(today, 33), inspectionDue: addDays(today, 12), licenceDue: addDays(today, 150) }),
    asset({ id: 'ast_10', ref: 'EQP-005', kind: 'equipment', name: 'Demo compressor 200L', make: 'Example Plant', model: 'AC-200', registration: 'SN-DEMO-AC200', year: 2021, status: 'active', assignedTo: 'Workshop', serviceDue: addDays(today, 180), inspectionDue: addDays(today, 240) }),
  ];

  // --- Expenses (fictional operating costs) ---------------------------------
  const exp = (monthOffset: number, day: number, category: DataState['expenses'][number]['category'], description: string, amount: number, assetId?: string) => {
    const raw = addDays(monthStart(monthOffset), day - 1);
    return { id: uid('exp'), date: raw > today ? today : raw, category, description, amount, assetId, createdAt: ts(10) }; // never date a cost in the future
  };
  const expenses = [
    ...[-7, -6, -5, -4, -3, -2, -1, 0].flatMap((m, i) => [
      exp(m, 4, 'fuel', 'Fleet diesel (fictional)', 9800 + (i % 3) * 1200),
      exp(m, 15, 'maintenance', 'Routine service — fictional', 3200 + (i % 2) * 1800, i % 2 ? 'ast_1' : 'ast_2'),
      exp(m, 20, 'supplies', 'Workshop consumables (fictional)', 2150),
      exp(m, 25, 'insurance', 'Fleet insurance premium (fictional)', 6400),
    ]),
    exp(-2, 11, 'ppe', 'Safety boots (REQ-D032)', 3900),
    exp(-1, 9, 'licences', 'Vehicle licence renewals (fictional)', 2750, 'ast_4'),
    exp(0, 3, 'ppe', 'Respirator cartridges (fictional)', 1800),
  ];

  // --- HR records (fictional, redacted codes only) --------------------------
  const hrRecords = [
    { id: uid('hr'), ref: 'HR-D001', kind: 'hiring' as const, subject: 'Candidate C-0141', position: 'Driver (Code 10)', date: addDays(today, -18), status: 'in-progress' as const, stage: 'Reference check', summary: 'Fictional hiring record. Interview completed; references outstanding.', createdAt: ts(18) },
    { id: uid('hr'), ref: 'HR-D002', kind: 'hiring' as const, subject: 'Candidate C-0142', position: 'Workshop assistant', date: addDays(today, -9), status: 'open' as const, stage: 'Shortlisted', summary: 'Fictional hiring record. Awaiting interview scheduling.', createdAt: ts(9) },
    { id: uid('hr'), ref: 'HR-D003', kind: 'hiring' as const, subject: 'Candidate C-0139', position: 'Site supervisor', date: addDays(today, -45), status: 'closed' as const, stage: 'Appointed', summary: 'Fictional hiring record. Offer accepted; start date recorded.', createdAt: ts(45) },
    { id: uid('hr'), ref: 'HR-D004', kind: 'disciplinary' as const, subject: 'Employee E-0207', position: 'Driver', date: addDays(today, -14), status: 'in-progress' as const, stage: 'Hearing scheduled', summary: 'Fictional disciplinary record. Details redacted in demo.', createdAt: ts(14) },
    { id: uid('hr'), ref: 'HR-D005', kind: 'disciplinary' as const, subject: 'Employee E-0188', position: 'General worker', date: addDays(today, -60), status: 'closed' as const, stage: 'Written warning issued', summary: 'Fictional disciplinary record. Details redacted in demo.', createdAt: ts(60) },
  ];

  // --- Safety incidents (fictional) -----------------------------------------
  const incidents = [
    { id: uid('inc'), ref: 'SAF-D001', date: addDays(today, -22), location: 'Yard (fictional)', category: 'Near miss', severity: 'medium' as const, description: 'Fictional near miss: reversing vehicle and pedestrian walkway.', status: 'closed' as const, followUp: 'Walkway re-marked; toolbox talk held.', followUpDue: addDays(today, -10), createdAt: ts(22) },
    { id: uid('inc'), ref: 'SAF-D002', date: addDays(today, -6), location: 'Workshop (fictional)', category: 'Minor injury', severity: 'low' as const, description: 'Fictional minor cut while handling sheet metal; first aid applied.', status: 'investigating' as const, followUp: 'Review glove specification for sheet work.', followUpDue: addDays(today, 4), createdAt: ts(6) },
    { id: uid('inc'), ref: 'SAF-D003', date: addDays(today, -2), location: 'Site B (fictional)', category: 'Equipment', severity: 'high' as const, description: 'Fictional: generator guard found missing during inspection.', status: 'open' as const, followUp: 'Tag out EQP-001 until guard refitted.', followUpDue: addDays(today, 2), createdAt: ts(2) },
  ];

  // --- Activity feed ----------------------------------------------------------
  const activity: DataState['activity'] = [
    { id: uid('act'), at: ts(0, 10, 42), area: 'Finance', title: 'Draft quotation created', detail: 'Q-D0103 · Demo Mining Services', status: 'Draft', tone: 'dark' },
    { id: uid('act'), at: ts(1, 15, 10), area: 'PPE', title: 'PPE request submitted', detail: 'REQ-D037 · Respirator cartridges', status: 'Awaiting review', tone: 'amber' },
    { id: uid('act'), at: ts(1, 11, 0), area: 'Procurement', title: 'Procurement request submitted', detail: 'REQ-D035 · Office printer toner', status: 'Awaiting review', tone: 'amber' },
    { id: uid('act'), at: ts(2, 9, 30), area: 'Finance', title: 'Quotation accepted', detail: 'Q-D0102 · Sample Construction Co.', status: 'Accepted', tone: 'green' },
    { id: uid('act'), at: ts(2, 8, 15), area: 'Safety', title: 'Incident logged', detail: 'SAF-D003 · Generator guard missing', status: 'Open', tone: 'red' },
    { id: uid('act'), at: ts(3, 16, 0), area: 'Finance', title: 'Invoice issued', detail: 'INV-D0209 · Placeholder Logistics', status: 'Issued', tone: 'green' },
    { id: uid('act'), at: ts(4, 13, 20), area: 'Procurement', title: 'Request rejected', detail: 'REQ-D036 · Second-hand compressor', status: 'Rejected', tone: 'red' },
    { id: uid('act'), at: ts(7, 10, 0), area: 'Procurement', title: 'Request approved', detail: 'REQ-D033 · Replacement tyres', status: 'Approved', tone: 'green' },
  ];

  return {
    version: 1,
    seededAt: new Date().toISOString(),
    settings: { vatRate: 15, role: 'manager', companyName: 'JNL Traders', showDemoBanner: true, currentUserId: 'u_supervisor' },
    users: seedUsers(),
    counters: { quotation: 104, invoice: 210, request: 39, po: 14, asset: 11, hr: 6, incident: 4 },
    customers,
    quotations,
    invoices,
    payments,
    requests,
    purchaseOrders,
    assets,
    expenses,
    hrRecords,
    incidents,
    activity,
  };
}
