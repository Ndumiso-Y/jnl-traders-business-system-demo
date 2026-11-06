import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Activity, Asset, Customer, DataState, DemoUser, Expense, HrRecord, HistoryEntry, Invoice, LineItem, ModuleKey,
  Payment, PurchaseOrder, Quotation, Request, RequestItem, RequestStatus, Role, SafetyIncident, Settings,
} from './types';
import { ROLE_LABELS } from './types';
import { buildSeed, seedUsers } from './seed';
import { addDays, todayIso } from '../lib/dates';

export const STORAGE_KEY = 'jnl-bms-demo-v1';
export const STORE_VERSION = 2;

let seq = Date.now() % 100000;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
const now = () => new Date().toISOString();

type Toast = { id: string; text: string; tone: 'ok' | 'err' | 'info' };

export type Actions = {
  // users & simulated access
  signInAs: (userId: string) => void;
  setRole: (role: Role) => void; // signs in as the first user holding that role
  updateUser: (id: string, patch: Partial<DemoUser>) => void;
  addUser: (u: Omit<DemoUser, 'id'>) => DemoUser;
  deleteUser: (id: string) => { ok: boolean; reason?: string };
  resetUsers: () => void;
  // settings
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

/** What an actor may do in the request workflow (derived from a role or a demo user). */
export type Actor = { label: string; canApprove: boolean; canFulfil: boolean; overrideOwn: boolean };

export function actorForRole(role: Role): Actor {
  switch (role) {
    case 'requester': return { label: ROLE_LABELS[role], canApprove: false, canFulfil: false, overrideOwn: false };
    case 'manager': return { label: ROLE_LABELS[role], canApprove: true, canFulfil: true, overrideOwn: false };
    case 'finance': return { label: ROLE_LABELS[role], canApprove: false, canFulfil: true, overrideOwn: false };
    case 'owner': case 'admin': return { label: ROLE_LABELS[role], canApprove: true, canFulfil: true, overrideOwn: true };
  }
}

export function actorForUser(u: DemoUser): Actor {
  return { label: u.name, canApprove: u.canApprove, canFulfil: u.canApprove || u.canReviewFinance, overrideOwn: u.role === 'owner' || u.isSuperAdmin };
}

/** Who may move a request from -> to. Approval needs the approve permission; nobody but an owner/super admin may approve their own request. */
export function canTransition(who: Role | Actor, from: RequestStatus, to: RequestStatus, isOwnRequest: boolean): { ok: boolean; reason?: string } {
  const actor = typeof who === 'string' ? actorForRole(who) : who;
  const table: Record<RequestStatus, RequestStatus[]> = {
    draft: ['submitted'],
    submitted: ['approved', 'rejected', 'draft'],
    approved: ['fulfilled', 'rejected'],
    rejected: ['draft'],
    fulfilled: [],
  };
  if (!table[from].includes(to)) return { ok: false, reason: `Cannot move a ${from} request to ${to}.` };
  if (to === 'approved' || to === 'rejected') {
    if (!actor.canApprove) return { ok: false, reason: `${actor.label} does not have approval rights (simulated permission).` };
    if (isOwnRequest && !actor.overrideOwn) return { ok: false, reason: 'You cannot approve or reject your own request (simulated separation of duties).' };
  }
  if (to === 'fulfilled' && !actor.canFulfil) return { ok: false, reason: `${actor.label} cannot mark requests fulfilled; this needs finance review or approval rights (simulated permission).` };
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

      signInAs: (userId) => {
        const u = get().users.find((x) => x.id === userId);
        if (!u) return;
        set((s) => ({ settings: { ...s.settings, currentUserId: u.id, role: u.role } }));
        get().toast(`Signed in as ${u.name} (simulated — not real authentication)`, 'info');
      },
      setRole: (role) => {
        const u = get().users.find((x) => x.role === role);
        if (u) get().signInAs(u.id); else set((s) => ({ settings: { ...s.settings, role } }));
      },
      updateUser: (id, patch) => {
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
        const u = get().users.find((x) => x.id === id);
        if (u) get().logActivity({ area: 'System', title: 'Permissions updated', detail: `${u.name} · ${u.modules.length} module${u.modules.length === 1 ? '' : 's'}${u.canApprove ? ' · approver' : ''}`, status: 'Updated', tone: 'gold' });
      },
      addUser: (u) => {
        const user: DemoUser = { ...u, id: newId('u') };
        set((s) => ({ users: [...s.users, user] }));
        get().logActivity({ area: 'System', title: 'Demo user added', detail: `${user.name} · ${user.title}`, status: 'Added', tone: 'green' });
        return user;
      },
      deleteUser: (id) => {
        const s = get();
        const u = s.users.find((x) => x.id === id);
        if (!u) return { ok: false, reason: 'User not found.' };
        if (id === s.settings.currentUserId) return { ok: false, reason: 'You cannot remove the user you are signed in as.' };
        if (u.isSuperAdmin && s.users.filter((x) => x.isSuperAdmin).length === 1) return { ok: false, reason: 'At least one super admin must remain.' };
        set({ users: s.users.filter((x) => x.id !== id) });
        get().logActivity({ area: 'System', title: 'Demo user removed', detail: u.name, status: 'Removed', tone: 'red' });
        return { ok: true };
      },
      resetUsers: () => {
        set((s) => ({ users: seedUsers(), settings: { ...s.settings, currentUserId: 'u_supervisor', role: 'manager' } }));
        get().toast('Demo users and permissions restored.', 'info');
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
        const user = s.users.find((u) => u.id === s.settings.currentUserId);
        const r: Request = {
          id: newId('req'), number: `REQ-D${pad(n, 3)}`, kind, title: '', department: '', requesterName: user?.name ?? `Demo ${ROLE_LABELS[role]}`, requesterRole: role, requesterUserId: user?.id,
          neededBy: addDays(todayIso(), 14), justification: '', items: [emptyReqItem()], status: 'draft',
          history: [{ id: newId('h'), at: now(), byRole: role, byName: user?.name ?? `Demo ${ROLE_LABELS[role]}`, action: 'Created draft' }],
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
        const user = s.users.find((u) => u.id === s.settings.currentUserId);
        const isOwn = user && r.requesterUserId ? r.requesterUserId === user.id : r.requesterRole === role;
        const check = canTransition(user ? actorForUser(user) : role, r.status, to, isOwn);
        if (!check.ok) return check;
        if (to === 'submitted') {
          if (!r.title.trim()) return { ok: false, reason: 'Add a title before submitting.' };
          if (!r.items.length || r.items.some((it) => !it.description.trim() || it.qty <= 0)) return { ok: false, reason: 'Each item needs a description and a quantity above zero.' };
        }
        const labels: Record<RequestStatus, string> = { draft: 'Returned to draft', submitted: 'Submitted for approval', approved: 'Approved', rejected: 'Rejected', fulfilled: 'Marked fulfilled' };
        const entry: HistoryEntry = { id: newId('h'), at: now(), byRole: role, byName: user?.name ?? `Demo ${ROLE_LABELS[role]}`, action: labels[to], note: note?.trim() || undefined };
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
        const actorName = s.users.find((u) => u.id === s.settings.currentUserId)?.name ?? `Demo ${ROLE_LABELS[s.settings.role]}`;
        const entry: HistoryEntry = { id: newId('h'), at: now(), byRole: s.settings.role, byName: actorName, action: 'Purchase order raised', note: po.number };
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
      version: STORE_VERSION,
      migrate: (persisted, version) => {
        // v1 -> v2: introduce demo users and module permissions without discarding the visitor's records.
        const st = (persisted ?? {}) as Partial<DataState>;
        if (version < 2 || !st.users) {
          const users = seedUsers();
          const role = st.settings?.role ?? 'manager';
          const current = users.find((u) => u.role === role) ?? users[2];
          return { ...st, users, settings: { ...(st.settings ?? buildSeed().settings), currentUserId: current.id } } as unknown as Store;
        }
        return st as unknown as Store;
      },
    },
  ),
);

/** Current demo user, falling back to the first user when the id is stale. */
export function selectCurrentUser(s: Pick<DataState, 'users' | 'settings'>): DemoUser {
  return s.users.find((u) => u.id === s.settings.currentUserId) ?? s.users[0];
}

export function hasModule(u: DemoUser | undefined, key: ModuleKey): boolean {
  if (!u) return false;
  return u.isSuperAdmin || u.modules.includes(key);
}

export { ROLE_LABELS };
