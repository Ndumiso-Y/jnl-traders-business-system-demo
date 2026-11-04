import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IcoArrow, IcoDownload, IcoPrint, IcoTrash, IcoWallet } from '../../components/Icons';
import { Confirm, Field, Modal, Notice, PageHeader, Panel, Tag, type TagTone } from '../../components/ui';
import { computeTotals, formatRand, hasErrors, parseNumber, toCents, validateLine } from '../../lib/money';
import { formatDate, formatDateTime, todayIso } from '../../lib/dates';
import { invoiceDerived } from '../../lib/selectors';
import { newId, useStore } from '../../store/useStore';
import type { Invoice, LineItem, Payment, Quotation } from '../../store/types';
import LineItemsEditor from './LineItemsEditor';

type Kind = 'quotation' | 'invoice';
type Doc = Quotation | Invoice;

const Q_STATUS: Record<Quotation['status'], [string, TagTone]> = { draft: ['Draft quotation', 'gold'], issued: ['Issued quotation', 'blue'], accepted: ['Accepted quotation', 'green'], converted: ['Converted to invoice', 'dark'], declined: ['Declined', 'red'] };
const I_STATE: Record<string, [string, TagTone]> = { draft: ['Draft invoice', 'gold'], open: ['Issued · unpaid', 'blue'], 'part-paid': ['Part paid', 'amber'], paid: ['Paid', 'green'], overdue: ['Overdue', 'red'], void: ['Void', 'dark'] };

/** Keyed wrapper: React would otherwise reuse editor state across quotation/invoice routes or different ids. */
export default function DocumentEditor({ kind }: { kind: Kind }) {
  const { id } = useParams();
  return <Editor key={`${kind}-${id}`} kind={kind} id={id} />;
}

function Editor({ kind, id }: { kind: Kind; id: string | undefined }) {
  const navigate = useNavigate();
  const store = useStore();
  const source: Doc | undefined = kind === 'quotation' ? store.quotations.find((q) => q.id === id) : store.invoices.find((i) => i.id === id);
  const customers = store.customers;
  const payments = useMemo(() => store.payments.filter((p) => p.invoiceId === id), [store.payments, id]);

  const [draft, setDraft] = useState<Doc | undefined>(source);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => { if (source && !dirty) setDraft(source); }, [source, dirty]);

  if (!source || !draft) {
    return (
      <>
        <PageHeader kicker="Finance / Documents" title="Document not found" subtitle="This record is not in the demo data for this browser." actions={<Link className="btn" to={kind === 'quotation' ? '/finance/quotations' : '/finance/invoices'}>Back to list</Link>} />
      </>
    );
  }

  const totals = computeTotals(draft.items, draft.vatRate, draft.pricesIncludeVat);
  const customer = customers.find((c) => c.id === draft.customerId);
  const lineErrors = draft.items.some((it) => hasErrors(validateLine(it)));
  const headerErrors: Record<string, string> = {};
  if (!draft.customerId) headerErrors.customer = 'Choose a customer.';
  if (!draft.date) headerErrors.date = 'Enter a date.';
  if (kind === 'quotation' && !(draft as Quotation).validUntil) headerErrors.validUntil = 'Enter a validity date.';
  if (kind === 'invoice' && !(draft as Invoice).dueDate) headerErrors.dueDate = 'Enter a due date.';
  if (!Number.isFinite(draft.vatRate) || draft.vatRate < 0 || draft.vatRate > 100) headerErrors.vatRate = 'VAT rate must be between 0 and 100.';
  const invalid = lineErrors || Object.keys(headerErrors).length > 0;

  const locked = kind === 'quotation' ? (draft as Quotation).status === 'converted' : (draft as Invoice).status !== 'draft' && payments.length > 0;
  const readOnly = kind === 'quotation' && (draft as Quotation).status === 'converted';

  const patch = (p: Partial<Doc>) => { setDraft({ ...draft, ...p } as Doc); setDirty(true); };
  const newLine = (): LineItem => ({ id: newId('li'), description: '', qty: 1, unitPrice: 0, discountPct: 0 });

  const save = (): boolean => {
    setShowErrors(true);
    if (invalid) { store.toast('Please fix the highlighted fields before saving.', 'err'); return false; }
    if (kind === 'quotation') store.updateQuotation(draft.id, draft as Quotation); else store.updateInvoice(draft.id, draft as Invoice);
    setDirty(false);
    store.toast(`${draft.number} saved (this browser only).`);
    return true;
  };

  const setStatus = (status: Quotation['status'] | Invoice['status']) => {
    if (!save()) return;
    patch({ status } as Partial<Doc>);
    if (kind === 'quotation') store.updateQuotation(draft.id, { status: status as Quotation['status'] }); else store.updateInvoice(draft.id, { status: status as Invoice['status'] });
    setDirty(false);
    store.logActivity({ area: 'Finance', title: `${kind === 'quotation' ? 'Quotation' : 'Invoice'} ${status}`, detail: `${draft.number} · ${customer?.name ?? ''}`, status: status[0].toUpperCase() + status.slice(1), tone: status === 'issued' || status === 'accepted' ? 'green' : status === 'declined' || status === 'void' ? 'red' : 'dark' });
  };

  const convert = () => {
    setConfirmConvert(false);
    if (!save()) return;
    const inv = store.convertQuotationToInvoice(draft.id);
    if (inv) { store.toast(`${draft.number} converted to ${inv.number}.`); navigate(`/finance/invoices/${inv.id}`); }
  };

  const del = () => {
    setConfirmDelete(false);
    if (kind === 'quotation') store.deleteQuotation(draft.id); else store.deleteInvoice(draft.id);
    store.toast(`${draft.number} deleted.`, 'info');
    navigate(kind === 'quotation' ? '/finance/quotations' : '/finance/invoices');
  };

  const pdf = async (mode: 'download' | 'print') => {
    setShowErrors(true);
    if (invalid) { store.toast('Fix the highlighted fields before generating a PDF.', 'err'); return; }
    const { buildDocumentPdf } = await import('../../lib/pdf'); // lazy: keeps jsPDF out of the main bundle
    const doc = buildDocumentPdf(kind, draft, customer, store.settings.companyName);
    if (mode === 'download') { doc.save(`${draft.number}-DEMO.pdf`); store.toast(`${draft.number}-DEMO.pdf generated (fictional, watermarked).`); }
    else { doc.autoPrint(); window.open(doc.output('bloburl'), '_blank'); }
  };

  const derived = kind === 'invoice' ? invoiceDerived(draft as Invoice, store.payments) : undefined;
  const [statusLabel, statusTone] = kind === 'quotation' ? Q_STATUS[(draft as Quotation).status] : I_STATE[derived?.state ?? 'draft'];

  const journey = kind === 'quotation'
    ? [
      { t: 'Draft quotation', s: 'Calculate and review pricing', done: true },
      { t: 'Issued to customer', s: 'Record issue manually', done: ['issued', 'accepted', 'converted'].includes((draft as Quotation).status) },
      { t: 'Accepted quotation', s: 'Record acceptance manually', done: ['accepted', 'converted'].includes((draft as Quotation).status) },
      { t: 'Convert to invoice', s: 'Carry line items forward', done: (draft as Quotation).status === 'converted' },
    ]
    : [
      { t: 'Draft invoice', s: 'Check items and totals', done: true },
      { t: 'Issued', s: 'Appears on customer statement', done: (draft as Invoice).status === 'issued' },
      { t: 'Payments recorded', s: 'Fictional receipts reduce balance', done: (derived?.paid ?? 0) > 0 },
      { t: 'Settled', s: 'Balance reaches zero', done: derived?.state === 'paid' },
    ];
  const currentIdx = journey.findIndex((j) => !j.done);

  return (
    <>
      <PageHeader kicker={`Finance / ${kind === 'quotation' ? 'Quotations' : 'Invoices'}`} title={kind === 'quotation' ? 'Quotation' : 'Invoice'} subtitle={kind === 'quotation' ? 'Clear documents, accurate totals and a simple path from quote to invoice.' : 'Issue, record fictional payments and feed the customer statement.'}
        actions={<>
          <Link className="btn" to={kind === 'quotation' ? '/finance/quotations' : '/finance/invoices'}>Back</Link>
          <button className="btn" onClick={() => pdf('print')} title="Open a print view of the PDF"><IcoPrint />Print</button>
          <button className="btn primary" onClick={() => pdf('download')} data-testid="download-pdf"><IcoDownload />Download PDF</button>
        </>} />

      <div className="doc-grid">
        <div>
          <Panel>
            <div className="doc-head">
              <div>
                <Tag tone={statusTone}>{statusLabel}</Tag>
                <h2 className="doc-title">{kind === 'quotation' ? 'Quotation' : 'Invoice'} {draft.number}</h2>
                <div className="doc-id">Sample document · {dirty ? <span style={{ color: 'var(--warn)' }}>unsaved changes</span> : `saved ${formatDateTime(draft.updatedAt)}`}</div>
              </div>
              <div className="doc-meta">{kind === 'quotation' ? 'Issued' : 'Invoice date'}<b>{formatDate(draft.date)}</b></div>
            </div>
            <hr className="thin" />
            <div className="form-grid">
              <Field label="Customer" error={showErrors ? headerErrors.customer : undefined}>
                <select className="select" value={draft.customerId} onChange={(e) => patch({ customerId: e.target.value })} disabled={readOnly} aria-invalid={showErrors && !!headerErrors.customer} data-testid="customer-select">
                  <option value="">Select a customer…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              {kind === 'quotation' ? (
                <Field label="Quote valid until" error={showErrors ? headerErrors.validUntil : undefined}>
                  <input className="input" type="date" value={(draft as Quotation).validUntil} onChange={(e) => patch({ validUntil: e.target.value } as Partial<Doc>)} disabled={readOnly} />
                </Field>
              ) : (
                <Field label="Due date" error={showErrors ? headerErrors.dueDate : undefined}>
                  <input className="input" type="date" value={(draft as Invoice).dueDate} onChange={(e) => patch({ dueDate: e.target.value } as Partial<Doc>)} disabled={locked} />
                </Field>
              )}
              <Field label={kind === 'quotation' ? 'Quotation date' : 'Invoice date'} error={showErrors ? headerErrors.date : undefined}>
                <input className="input" type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} disabled={readOnly || locked} />
              </Field>
              <div className="field">
                <label>Pricing basis</label>
                <div className="segmented" role="group" aria-label="VAT basis">
                  <button type="button" aria-pressed={!draft.pricesIncludeVat} onClick={() => patch({ pricesIncludeVat: false })} disabled={readOnly || locked} data-testid="vat-excl">VAT exclusive</button>
                  <button type="button" aria-pressed={draft.pricesIncludeVat} onClick={() => patch({ pricesIncludeVat: true })} disabled={readOnly || locked} data-testid="vat-incl">VAT inclusive</button>
                </div>
              </div>
            </div>
            <hr className="thin" />
            <LineItemsEditor items={draft.items} totals={totals} onChange={(items) => patch({ items })} showErrors={showErrors} readOnly={readOnly || locked} newLine={newLine} />
            <hr className="thin" />
            <Field label="Additional notes">
              <textarea className="textarea" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} disabled={readOnly} />
            </Field>
            {!readOnly && (
              <div className="btns" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="btn danger" onClick={() => setConfirmDelete(true)} data-testid="delete-doc"><IcoTrash />Delete</button>
                <button className="btn" onClick={save} data-testid="save-doc">{dirty ? 'Save changes' : 'Saved'}</button>
                {kind === 'quotation' && (draft as Quotation).status === 'draft' && <button className="btn primary" onClick={() => setStatus('issued')} data-testid="issue-doc">Mark as issued</button>}
                {kind === 'quotation' && (draft as Quotation).status === 'issued' && <><button className="btn" onClick={() => setStatus('declined')}>Mark declined</button><button className="btn primary" onClick={() => setStatus('accepted')} data-testid="accept-doc">Mark accepted</button></>}
                {kind === 'quotation' && ['issued', 'accepted', 'declined'].includes((draft as Quotation).status) && <button className="btn gold" onClick={() => setConfirmConvert(true)} data-testid="convert-doc"><IcoArrow />Convert to invoice</button>}
                {kind === 'invoice' && (draft as Invoice).status === 'draft' && <button className="btn primary" onClick={() => setStatus('issued')} data-testid="issue-doc">Issue invoice</button>}
                {kind === 'invoice' && (draft as Invoice).status === 'issued' && <button className="btn gold" onClick={() => setPayOpen(true)} data-testid="record-payment"><IcoWallet />Record payment</button>}
              </div>
            )}
            {locked && kind === 'invoice' && <p className="field-hint" style={{ marginTop: 10, textAlign: 'right' }}>Items and dates are locked once a payment is recorded. Delete the payments to edit again.</p>}
          </Panel>

          {kind === 'invoice' && (draft as Invoice).status !== 'draft' && (
            <Panel title="Payments (fictional)" meta="Recorded receipts reduce the balance and update the customer statement" className="" >
              <div style={{ marginTop: 0 }}>
                {payments.length === 0 && <div className="empty">No payments recorded yet.</div>}
                {payments.length > 0 && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th /></tr></thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id}><td>{formatDate(p.date)}</td><td>{p.method.toUpperCase()}</td><td>{p.reference || '—'}</td><td className="num"><strong>{formatRand(toCents(p.amount))}</strong></td><td><button className="btn xs danger" onClick={() => { store.deletePayment(p.id); store.toast('Payment removed.', 'info'); }}>Remove</button></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel title="Document totals">
            <div className="totals" data-testid="totals">
              <div className="row"><span>Subtotal (excl. VAT)</span><b data-testid="subtotal">{formatRand(totals.subtotal)}</b></div>
              {totals.discount > 0 && <div className="row"><span>Discount</span><b data-testid="discount">-{formatRand(totals.discount)}</b></div>}
              <div className="row"><span>VAT ({draft.vatRate}% sample)</span><b data-testid="vat">{formatRand(totals.vat)}</b></div>
              <div className="grand"><span>Grand total</span><b data-testid="grand-total">{formatRand(totals.total)}</b></div>
              {derived && (draft as Invoice).status !== 'draft' && (
                <>
                  <div className="row"><span>Paid (fictional)</span><b data-testid="paid">{formatRand(derived.paid)}</b></div>
                  <div className="row"><span>Balance due</span><b data-testid="balance">{formatRand(derived.balance)}</b></div>
                </>
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="VAT rate for this document (%)" error={showErrors ? headerErrors.vatRate : undefined}>
                <input className="input sm" type="number" step="0.5" min={0} max={100} value={Number.isNaN(draft.vatRate) ? '' : draft.vatRate} onChange={(e) => patch({ vatRate: parseNumber(e.target.value) })} disabled={readOnly || locked} data-testid="vat-rate" />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Notice tone="gold" icon={false}>VAT shown for calculation testing only; verify registration and tax treatment before real use.</Notice>
            </div>
          </Panel>
          <Panel title="Document journey">
            <ol className="journey">
              {journey.map((j, i) => (
                <li key={j.t}><span className={`step ${j.done ? 'done' : i === currentIdx ? 'current' : ''}`}>{j.done ? '✓' : i + 1}</span><div><b>{j.t}</b><small>{j.s}</small></div></li>
              ))}
            </ol>
            {kind === 'quotation' && (draft as Quotation).convertedInvoiceId && <p style={{ marginTop: 14 }}><Link className="link-btn" to={`/finance/invoices/${(draft as Quotation).convertedInvoiceId}`}>Open invoice <IcoArrow /></Link></p>}
            {kind === 'invoice' && (draft as Invoice).sourceQuotationId && <p style={{ marginTop: 14 }}><Link className="link-btn" to={`/finance/quotations/${(draft as Invoice).sourceQuotationId}`}>Open source quotation <IcoArrow /></Link></p>}
            {kind === 'invoice' && customer && <p style={{ marginTop: 10 }}><Link className="link-btn" to={`/finance/statements?customer=${customer.id}`}>Customer statement <IcoArrow /></Link></p>}
          </Panel>
          <div className="notice dark"><div><b>Demonstration boundary</b>Documents are fictional and watermarked "{'DEMONSTRATION / NOT A VALID TAX INVOICE'}". Numbering, VAT registration and templates are not yet confirmed with the client.</div></div>
        </div>
      </div>

      <Confirm open={confirmDelete} title={`Delete ${draft.number}?`} danger confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={del}
        body={<>This removes the {kind} {kind === 'invoice' ? 'and any fictional payments recorded against it ' : ''}from this browser's demo data. This cannot be undone (use Settings → Reset to restore the sample set).</>} />
      <Confirm open={confirmConvert} title={`Convert ${draft.number} to an invoice?`} confirmLabel="Convert" onCancel={() => setConfirmConvert(false)} onConfirm={convert}
        body={<>A new invoice will be created with the same customer, line items, VAT basis and totals ({formatRand(totals.total)}). The quotation will be marked as converted and locked.</>} />
      {kind === 'invoice' && <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} invoice={draft as Invoice} balance={derived?.balance ?? 0} onAdd={(p) => { store.addPayment(p); setPayOpen(false); store.toast('Fictional payment recorded.'); }} />}
    </>
  );
}

function PaymentModal({ open, onClose, invoice, balance, onAdd }: { open: boolean; onClose: () => void; invoice: Invoice; balance: number; onAdd: (p: Omit<Payment, 'id' | 'createdAt'>) => void }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<Payment['method']>('eft');
  const [reference, setReference] = useState('');
  const [err, setErr] = useState<string>();
  useEffect(() => { if (open) { setAmount((balance / 100).toFixed(2)); setDate(todayIso()); setReference(`DEMO-${invoice.number}`); setErr(undefined); } }, [open, balance, invoice.number]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseNumber(amount);
    if (!Number.isFinite(n) || n <= 0) return setErr('Enter an amount greater than zero.');
    if (toCents(n) > balance) return setErr(`Amount exceeds the outstanding balance of ${formatRand(balance)}.`);
    if (!date) return setErr('Enter a payment date.');
    onAdd({ invoiceId: invoice.id, date, amount: Math.round(n * 100) / 100, method, reference });
  };

  return (
    <Modal open={open} title="Record fictional payment" sub={`Against ${invoice.number} · balance ${formatRand(balance)}`} onClose={onClose}>
      <form onSubmit={submit} className="form-grid" id="payment-form">
        <Field label="Amount (R)" error={err}><input className="input num" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="payment-amount" aria-invalid={!!err} /></Field>
        <Field label="Date"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Method"><select className="select" value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}><option value="eft">EFT</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></Field>
        <Field label="Reference"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
        <div className="span-2 modal-foot" style={{ marginTop: 6 }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" data-testid="payment-submit">Record payment</button>
        </div>
      </form>
    </Modal>
  );
}
