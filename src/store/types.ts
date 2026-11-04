// ---------------------------------------------------------------------------
// Domain types for the JNL Traders demonstration. ALL records are fictional.
// Money values on documents are stored as rand numbers as entered; totals are
// computed on demand with integer-cent arithmetic (see lib/money.ts).
// ---------------------------------------------------------------------------

export type Role = 'requester' | 'manager' | 'finance' | 'owner';

export const ROLE_LABELS: Record<Role, string> = {
  requester: 'Requester',
  manager: 'Manager',
  finance: 'Finance',
  owner: 'Owner',
};

export type Customer = {
  id: string;
  name: string;
  contact: string;
  email: string; // fictional example.com addresses only
  phone: string;
  address: string;
  vatNumber?: string; // fictional placeholder
};

export type LineItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
};

export type QuotationStatus = 'draft' | 'issued' | 'accepted' | 'converted' | 'declined';
export type InvoiceStatus = 'draft' | 'issued' | 'void';

export type Quotation = {
  id: string;
  number: string;
  customerId: string;
  date: string;
  validUntil: string;
  items: LineItem[];
  vatRate: number;
  pricesIncludeVat: boolean;
  notes: string;
  status: QuotationStatus;
  convertedInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  number: string;
  customerId: string;
  date: string;
  dueDate: string;
  items: LineItem[];
  vatRate: number;
  pricesIncludeVat: boolean;
  notes: string;
  status: InvoiceStatus;
  sourceQuotationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  date: string;
  amount: number; // rand
  method: 'eft' | 'cash' | 'card' | 'other';
  reference: string;
  createdAt: string;
};

export type RequestKind = 'procurement' | 'ppe';
export type RequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled';

export type RequestItem = { id: string; description: string; qty: number; estUnitCost: number };

export type HistoryEntry = {
  id: string;
  at: string; // ISO timestamp
  byRole: Role;
  byName: string;
  action: string;
  note?: string;
};

export type Request = {
  id: string;
  number: string;
  kind: RequestKind;
  title: string;
  department: string;
  requesterName: string;
  requesterRole: Role;
  neededBy: string;
  justification: string;
  items: RequestItem[];
  status: RequestStatus;
  purchaseOrderId?: string;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderStatus = 'open' | 'received' | 'closed';

export type PurchaseOrder = {
  id: string;
  number: string;
  requestId?: string;
  supplier: string;
  date: string;
  expected: string;
  items: RequestItem[];
  status: PurchaseOrderStatus;
  createdAt: string;
};

export type AssetKind = 'vehicle' | 'equipment';
export type AssetStatus = 'active' | 'in-service' | 'inactive';

export type Asset = {
  id: string;
  ref: string;
  kind: AssetKind;
  name: string;
  make: string;
  model: string;
  registration: string; // fictional plate / serial
  year?: number;
  status: AssetStatus;
  assignedTo: string;
  serviceDue?: string;
  licenceDue?: string;
  insuranceDue?: string;
  inspectionDue?: string;
  odometer?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategory = 'fuel' | 'maintenance' | 'ppe' | 'supplies' | 'insurance' | 'licences' | 'salaries' | 'other';

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number; // rand
  assetId?: string;
  requestId?: string;
  createdAt: string;
};

export type HrKind = 'hiring' | 'disciplinary';
export type HrStatus = 'open' | 'in-progress' | 'closed';

export type HrRecord = {
  id: string;
  ref: string;
  kind: HrKind;
  subject: string; // fictional employee code / candidate code
  position: string;
  date: string;
  status: HrStatus;
  stage: string;
  summary: string;
  createdAt: string;
};

export type IncidentSeverity = 'low' | 'medium' | 'high';
export type IncidentStatus = 'open' | 'investigating' | 'closed';

export type SafetyIncident = {
  id: string;
  ref: string;
  date: string;
  location: string;
  category: string;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  followUp: string;
  followUpDue?: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  at: string;
  area: 'Finance' | 'Procurement' | 'PPE' | 'Fleet' | 'Equipment' | 'HR' | 'Safety' | 'System';
  title: string;
  detail: string;
  status: string;
  tone: 'green' | 'amber' | 'red' | 'dark' | 'gold' | 'blue';
};

export type Settings = {
  vatRate: number;
  role: Role;
  companyName: string;
  showDemoBanner: boolean;
};

export type Counters = {
  quotation: number;
  invoice: number;
  request: number;
  po: number;
  asset: number;
  hr: number;
  incident: number;
};

export type DataState = {
  version: number;
  seededAt: string;
  settings: Settings;
  counters: Counters;
  customers: Customer[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  requests: Request[];
  purchaseOrders: PurchaseOrder[];
  assets: Asset[];
  expenses: Expense[];
  hrRecords: HrRecord[];
  incidents: SafetyIncident[];
  activity: Activity[];
};
