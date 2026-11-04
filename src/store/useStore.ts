import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Activity, Asset, Customer, DataState, Expense, HrRecord, HistoryEntry, Invoice, LineItem,
  Payment, PurchaseOrder, Quotation, Request, RequestItem, RequestStatus, Role, SafetyIncident, Settings,
} from './types';
import { ROLE_LABELS } from './types';
import { buildSeed } from './seed';
import { addDays, todayIso } from '../lib/dates';

export const STORAGE_KEY = 'jnl-bms-demo-v1';

let seq = Date.now() % 100000;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
const now = () => new Date().toISOString();

type Toast = { id: string; text: string; tone: 'ok' | 'err' | 'info' };

export type Actions = {
  // settings
  setRole: (role: Role) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
  // toasts
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  // customers
  addCustomer: (c: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  // quotations
  createQuotation: (customerId?: string) => Quotation;
  updateQuotation: (id: string, patch: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  convertQuotationToInvoice: (id: string) => Invoice | null;
  // invoices
  createInvoice: (customerId?: string) => Invoice;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  // payments
  addPayment: (p: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  deletePayment: (id: string) => void;
  // requests
  createRequest: (kind: Request['kind']) => Request;
  updateRequest: (id: string, patch: Partial<Request>) => void;
  deleteRequest: (id: string) => void;
  transitionRequest: (id: string, to: RequestStatus, note?: string) => { ok: boolean; reason?: string };
  raisePurchaseOrder: (requestId: string, supplier: string, expected: string) => PurchaseOrder | null;
  updatePurchaseOrder: (id: string, patch: Partial<PurchaseOrder>) => void;
  // assets
  createAsset: (kind: Asset['kind']) => Asset;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  // expenses
  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  deleteExpense: (id: string) => void;
  // hr
  createHrRecord: (kind: HrRecord['kind']) => HrRecord;
  updateHrRecord: (id: string, patch: Partial<HrRecord>) => void;
  deleteHrRecord: (id: string) => void;
  // safety
  createIncident: () => SafetyIncident;
  updateIncident: (id: string, patch: Partial<SafetyIncident>) => void;
  deleteIncident: (id: string) => void;
  // activity
  logActivity: (a: Omit<Activity, 'id' | 'at'>) => void;
};

export type Store = DataState & Actions;

const emptyLine = (): LineItem => ({ id: newId('li'), description: '', qty: 1, unitPrice: 0, discountPct: 0 });
const emptyReqItem = (): RequestItem => ({ id: newId('ri'), description: '', qty: 1, estUnitCost: 0 });

const pad = (n: number, w = 4) => n.toString().padStart(w, '0');

/** Who may move a request from -> to. Requester may never approve/reject. */
export function canTransition(role: Role, from: RequestStatus, to: RequestStatus, isOwnRequest: boolean): { ok: boolean; reason?: string } {
  const table: Record<RequestStatus, RequestStatus[]> = {
    draft: ['submitted'],
    submitted: ['approved', 'rejected', 'draft'],
    approved: ['fulfilled', 'rejected'],
    rejected: ['draft'],
    fulfilled: [],
  };
  if (!table[from].includes(to)) return { ok: false, reason: `Cannot move a ${from} request to ${to}.` };
  if (to === 'approved' || to === 'rejected') {
    if (role === 'requester') return { ok: false, reason: 'Requesters cannot approve or reject requests (simulated role rule).' };
    if (role === 'finance' && from === 'submitted') return { ok: false, reason: 'Finance reviews approved requests; approval sits with a Manager or the Owner (simulated role rule).' };
    if (isOwnRequest && role !== 'owner') return { ok: false, reason: 'You cannot approve or reject your own request (simulated separation of duties).' };
  }
  if (to === 'fulfilled' && role === 'requester') return { ok: false, reason: 'Only Finance, a Manager or the Owner can mark a request fulfilled.' };
  return { ok: true };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      toasts: [],

      toast: (text, tone = 'ok') => {
        const id = newId('t');
        set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
        setTimeout(() => get().dismissToast(id), 3800);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setRole: (role) => {
        set((s) => ({ settings: { ...s.settings, role } }));
        get().toast(`Viewing as ${ROLE_LABELS[role]} (simulated role — not real access control)`, 'info');
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetDemo: () => {
        set({ ...buildSeed(), toasts: [] });
        get().toast('Demo data reset to the fictional starting set.', 'info');
      },

      logActivity: (a) => set((s) => ({ activity: [{ ...a, id: newId('act'), at: now() }, ...s.activity].slice(0, 60) })),

      // --- customers ---------------------------------------------------------
      addCustomer: (c) => {
        const customer: Customer = { ...c, id: newId('cus') };
        set((s) => ({ customers: [...s.customers, customer] }));
        return customer;
      },
      updateCustomer: (id, patch) => set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      // --- quotations --------------------------------------------------------
      createQuotation: (customerId) => {
        const s = get();
        const n = s.counters.quotation;
        const today = todayIso();
        const q: Quotation = {
          id: newId('quo'), number: `Q-D${pad(n)}`, customerId: customerId ?? s.customers[0]?.id ?? '', date: today, validUntil: addDays(today, 30),
          items: [emptyLine()], vatRate: s.settings.vatRate, pricesIncludeVat: false,
          notes: 'Quotation prepared for demonstration purposes. No actual commercial offer is represented.', status: 'draft', createdAt: now(), updatedAt: now(),
        };
        set({ quotations: [q, ...s.quotations], counters: { ...s.counters, quotation: n + 1 } });
        get().logActivity({ area: 'Finance', title: 'Draft quotation created', detail: `${q.number}`, status: 'Draft', tone: 'dark' });
        return q;
      },
      updateQuotation: (id, patch) => set((s) => ({ quotations: s.quotations.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: now() } : q)) })),
      deleteQuotation: (id) => {
        const q = get().quotations.find((x) => x.id === id);
        set((s) => ({ quotations: s.quotations.filter((x) => x.id !== id) }));
        if (q) get().logActivity({ area: 'Finance', title: 'Quotation deleted', detail: q.number, status: 'Deleted', tone: 'red' });
      },
      convertQuotationToInvoice: (id) => {
        const s = get();
        const q = s.quotations.find((x) => x.id === id);
        if (!q || q.status === 'converted') return null;
        const n = s.counters.invoice;
        const today = todayIso();
        const inv: Invoice = {
          id: newId('inv'), number: `INV-D${pad(n)}`, customerId: q.customerId, date: today, dueDate: addDays(today, 30),
          items: q.items.map((it) => ({ ...it, id: newId('li') })), vatRate: q.vatRate, pricesIncludeVat: q.pricesIncludeVat,
          notes: `Converted from quotation ${q.number}. Fictional invoice for demonstration purposes only. Not a valid tax invoice.`,
          status: 'issued', sourceQuotationId: q.id, createdAt: now(), updatedAt: now(),
        };
        set({
          invoices: [inv, ...s.invoices],
          quotations: s.quotations.map((x) => (x.id === id ? { ...x, status: 'converted', convertedInvoiceId: inv.id, updatedAt: now() } : x)),
          counters: { ...s.counters, invoice: n + 1 },
        });
        get().logActivity({ area: 'Finance', title: 'Quotation converted to invoice', detail: `${q.number} → ${inv.number}`, status: 'Issued', tone: 'green' });
        return inv;
      },

      // --- invoices ----------------------------------------------------------
      createInvoice: (customerId) => {
        const s = get();
        const n = s.counters.invoice;
        const today = todayIso();
        const inv: Invoice = {
          id: newId('inv'), number: `INV-D${pad(n)}`, customerId: customerId ?? s.customers[0]?.id ?? '', date: today, dueDate: addDays(today, 30),
          items: [emptyLine()], vatRate: s.settings.vatRate, pricesIncludeVat: false,
          notes: 'Fictional invoice for demonstration purposes only. Not a valid tax invoice.', status: 'draft', createdAt: now(), updatedAt: now(),
        };
        set({ invoices: [inv, ...s.invoices], counters: { ...s.counters, invoice: n + 1 } });
        get().logActivity({ area: 'Finance', title: 'Draft invoice created', detail: inv.number, status: 'Draft', tone: 'dark' });
        return inv;
      },
      updateInvoice: (id, patch) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)) })),
      deleteInvoice: (id) => {
        const inv = get().invoices.find((x) => x.id === id);
        set((s) => ({
          invoices: s.invoices.filter((x) => x.id !== id),
          payments: s.payments.filter((p) => p.invoiceId !== id),
          quotations: s.quotations.map((q) => (q.convertedInvoiceId === id ? { ...q, status: 'accepted', convertedInvoiceId: undefined } : q)),
        }));
        if (inv) get().logActivity({ area: 'Finance', title: 'Invoice deleted', detail: inv.number, status: 'Deleted', tone: 'red' });
      },

      // --- payments ----------------------------------------------------------
      addPayment: (p) => {
        const payment: Payment = { ...p, id: newId('pay'), createdAt: now() };
        set((s) => ({ payments: [...s.payments, payment] }));
        const inv = get().invoices.find((i) => i.id === p.invoiceId);
        get().logActivity({ area: 'Finance', title: 'Payment recorded', detail: `${inv?.number ?? ''} · R${p.amount.toFixed(2)} (fictional)`, status: 'Received', tone: 'green' });
        return payment;
      },
      deletePayment: (id) => set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),

      // --- requests ----------------------------------------------------------
      createRequest: (kind) => {
        const s = get();
        const n = s.counters.request;
        const role = s.settings.role;
        const r: Request = {
          id: newId('req'), number: `REQ-D${pad(n, 3)}`, kind, title: '', department: '', requesterName: `Demo ${ROLE_LABELS[role]}`, requesterRole: role,
          neededBy: addDays(todayIso(), 14), justification: '', items: [emptyReqItem()], status: 'draft',
          history: [{ id: newId('h'), at: now(), byRole: role, byName: `Demo ${ROLE_LABELS[role]}`, action: 'Created draft' }],
          createdAt: now(), updatedAt: now(),
        };
        set({ requests: [r, ...s.requests], counters: { ...s.counters, request: n + 1 } });
        return r;
      },
      updateRequest: (id, patch) => set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)) })),
      deleteRequest: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
      transitionRequest: (id, to, note) => {
        const s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r) return { ok: false, reason: 'Request not found.' };
        const role = s.settings.role;
        const isOwn = r.requesterRole === role;
        const check = canTransition(role, r.status, to, isOwn);
        if (!check.ok) return check;
        if (to === 'submitted') {
          if (!r.title.trim()) return { ok: false, reason: 'Add a title before submitting.' };
          if (!r.items.length || r.items.some((it) => !it.description.trim() || it.qty <= 0)) return { ok: false, reason: 'Each item needs a description and a quantity above zero.' };
        }
        const labels: Record<RequestStatus, string> = { draft: 'Returned to draft', submitted: 'Submitted for approval', approved: 'Approved', rejected: 'Rejected', fulfilled: 'Marked fulfilled' };
        const entry: HistoryEntry = { id: newId('h'), at: now(), byRole: role, byName: `Demo ${ROLE_LABELS[role]}`, action: labels[to], note: note?.trim() || undefined };
        set((st) => ({ requests: st.requests.map((x) => (x.id === id ? { ...x, status: to, history: [...x.history, entry], updatedAt: now() } : x)) }));
        const tone = to === 'approved' || to === 'fulfilled' ? 'green' : to === 'rejected' ? 'red' : 'amber';
        get().logActivity({ area: r.kind === 'ppe' ? 'PPE' : 'Procurement', title: `${r.kind === 'ppe' ? 'PPE' : 'Procurement'} request ${labels[to].toLowerCase()}`, detail: `${r.number} · ${r.title}`, status: labels[to], tone });
        return { ok: true };
      },
      raisePurchaseOrder: (requestId, supplier, expected) => {
        const s = get();
        const r = s.requests.find((x) => x.id === requestId);
        if (!r || r.status !== 'approved') return null;
        const n = s.counters.po;
        const po: PurchaseOrder = { id: newId('po'), number: `PO-D${pad(n, 3)}`, requestId, supplier, date: todayIso(), expected, items: r.items.map((i) => ({ ...i })), status: 'open', createdAt: now() };
        const entry: HistoryEntry = { id: newId('h'), at: now(), byRole: s.settings.role, byName: `Demo ${ROLE_LABELS[s.settings.role]}`, action: 'Purchase order raised', note: po.number };
        set({
          purchaseOrders: [po, ...s.purchaseOrders],
          requests: s.requests.map((x) => (x.id === requestId ? { ...x, purchaseOrderId: po.id, history: [...x.history, entry], updatedAt: now() } : x)),
          counters: { ...s.counters, po: n + 1 },
        });
        get().logActivity({ area: 'Procurement', title: 'Purchase order raised', detail: `${po.number} · ${supplier}`, status: 'Open', tone: 'gold' });
        return po;
      },
      updatePurchaseOrder: (id, patch) => set((s) => ({ purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      // --- assets ------------------------------------------------------------
      createAsset: (kind) => {
        const s = get();
        const n = s.counters.asset;
        const a: Asset = {
          id: newId('ast'), ref: `${kind === 'vehicle' ? 'FLT' : 'EQP'}-${pad(n, 3)}`, kind, name: '', make: '', model: '', registration: '', status: 'active', assignedTo: '',
          notes: '', createdAt: now(), updatedAt: now(),
        };
        set({ assets: [a, ...s.assets], counters: { ...s.counters, asset: n + 1 } });
        return a;
      },
      updateAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now() } : a)) })),
      deleteAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

      // --- expenses ----------------------------------------------------------
      addExpense: (e) => {
        const expense: Expense = { ...e, id: newId('exp'), createdAt: now() };
        set((s) => ({ expenses: [expense, ...s.expenses] }));
        return expense;
      },
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      // --- hr ----------------------------------------------------------------
      createHrRecord: (kind) => {
        const s = get();
        const n = s.counters.hr;
        const r: HrRecord = { id: newId('hr'), ref: `HR-D${pad(n, 3)}`, kind, subject: '', position: '', date: todayIso(), status: 'open', stage: kind === 'hiring' ? 'Application received' : 'Reported', summary: '', createdAt: now() };
        set({ hrRecords: [r, ...s.hrRecords], counters: { ...s.counters, hr: n + 1 } });
        return r;
      },
      updateHrRecord: (id, patch) => set((s) => ({ hrRecords: s.hrRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteHrRecord: (id) => set((s) => ({ hrRecords: s.hrRecords.filter((r) => r.id !== id) })),

      // --- safety ------------------------------------------------------------
      createIncident: () => {
        const s = get();
        const n = s.counters.incident;
        const i: SafetyIncident = { id: newId('inc'), ref: `SAF-D${pad(n, 3)}`, date: todayIso(), location: '', category: 'Near miss', severity: 'low', description: '', status: 'open', followUp: '', followUpDue: addDays(todayIso(), 7), createdAt: now() };
        set({ incidents: [i, ...s.incidents], counters: { ...s.counters, incident: n + 1 } });
        return i;
      },
      updateIncident: (id, patch) => set((s) => ({ incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      deleteIncident: (id) => set((s) => ({ incidents: s.incidents.filter((i) => i.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // Persist data only — never the transient toast list or action functions.
        const { toasts: _toasts, ...rest } = s as Store;
        void _toasts;
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) if (typeof v !== 'function') data[k] = v;
        return data as unknown as Store;
      },
      version: 1,
    },
  ),
);

export { ROLE_LABELS };
