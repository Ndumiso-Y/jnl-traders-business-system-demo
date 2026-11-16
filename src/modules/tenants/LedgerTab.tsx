import { useEffect, useMemo, useState } from 'react';
import { IcoDownload, IcoWallet } from '../../components/Icons';
import { Empty, Field, Modal, Panel, Stat, Tag } from '../../components/ui';
import { formatRand, parseNumber, toCents } from '../../lib/money';
import { formatDate, todayIso } from '../../lib/dates';
import { describeLease, rentLedger } from '../../lib/rent';
import { useStore } from '../../store/useStore';
import type { RentPayment } from '../../store/types';

export default function LedgerTab({ tenantId, onPick }: { tenantId: string | null; onPick: (id: string) => void }) {
  const store = useStore();
  const tenants = store.tenants.filter((t) => t.status !== 'ended' || t.id === tenantId);
  const tenant = store.tenants.find((t) => t.id === tenantId) ?? tenants[0];
  const ledger = useMemo(() => (tenant ? rentLedger(tenant, store.rentPayments) : null), [tenant, store.rentPayments]);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<RentPayment['method']>('eft');
  const [reference, setReference] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { if (payOpen && tenant) { setAmount(String(tenant.rent)); setDate(todayIso()); setReference(`DEMO-RENT-${todayIso().slice(0, 7)}`); setErr(''); } }, [payOpen, tenant]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    const n = parseNumber(amount);
    if (!Number.isFinite(n) || n <= 0) return setErr('Enter an amount greater than zero.');
    if (!date) return setErr('Enter a payment date.');
    store.addRentPayment({ tenantId: tenant.id, date, amount: Math.round(n * 100) / 100, method, reference });
    setPayOpen(false);
    store.toast('Fictional rent payment recorded.');
  };

  const download = async () => {
    if (!tenant || !ledger) return;
    const { buildRentStatementPdf } = await import('../../lib/pdf');
    buildRentStatementPdf(tenant, store.properties.find((p) => p.id === tenant.propertyId)?.name ?? '', ledger.lines, { charged: ledger.charged, paid: ledger.paid, balance: ledger.balance }, store.settings.companyName, todayIso()).save(`${tenant.ref}-RENT-STATEMENT-DEMO.pdf`);
    store.toast('Rent statement PDF generated (fictional, watermarked).');
  };

  if (!tenant || !ledger) return <Panel><Empty title="No tenants yet" body="Add a tenant to see a rent ledger." /></Panel>;
  const property = store.properties.find((p) => p.id === tenant.propertyId);

  return (
    <>
      <div className="toolbar">
        <label className="field" style={{ minWidth: 300 }}>
          <span className="field-label">Tenant</span>
          <select className="select" value={tenant.id} onChange={(e) => onPick(e.target.value)} data-testid="ledger-tenant">{tenants.map((t) => <option key={t.id} value={t.id}>{t.name || t.ref} · {t.unitRef ?? 'no unit'}</option>)}</select>
        </label>
        <div className="btns" style={{ marginLeft: 'auto' }}>
          <button className="btn" onClick={download} data-testid="rent-statement-pdf"><IcoDownload />Statement PDF</button>
          <button className="btn gold" onClick={() => setPayOpen(true)} data-testid="record-rent"><IcoWallet />Record rent payment</button>
        </div>
      </div>
      <div className="stat-grid">
        <Stat label="Charged to date" value={formatRand(ledger.charged)} sub={`${ledger.monthsCharged} month${ledger.monthsCharged === 1 ? '' : 's'} of rent + deposit`} />
        <Stat label="Received" value={formatRand(ledger.paid)} sub="Fictional payments" />
        <Stat label="Balance" value={formatRand(ledger.balance)} tone={ledger.balance > 0 ? 'red' : undefined} sub={ledger.balance > 0 ? `${ledger.monthsInArrears} month${ledger.monthsInArrears === 1 ? '' : 's'} in arrears` : ledger.balance < 0 ? 'Paid in advance' : 'Up to date'} />
        <Stat label="Lease" value={formatRand(Math.round(tenant.rent * 100))} sub={`per month · ${describeLease(tenant)}`} />
      </div>
      <Panel title={`Rent ledger — ${tenant.name || tenant.ref}`} meta={`${property?.name ?? ''} · ${tenant.unitRef ?? ''} · ${tenant.ref}`} right={<Tag tone={tenant.status === 'active' ? 'green' : tenant.status === 'notice' ? 'amber' : 'dark'}>{tenant.status}</Tag>}>
        <div className="table-wrap">
          <table className="table" data-testid="rent-ledger">
            <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th className="num">Charged</th><th className="num">Received</th><th className="num">Balance</th><th /></tr></thead>
            <tbody>
              {ledger.lines.map((l, i) => {
                const payment = l.credit ? store.rentPayments.find((p) => p.tenantId === tenant.id && p.date === l.date && toCents(p.amount) === l.credit && (p.reference || 'Payment') === l.ref) : undefined;
                return (
                  <tr key={i}><td>{formatDate(l.date)}</td><td><strong>{l.ref}</strong></td><td>{l.description}</td><td className="num">{l.debit ? formatRand(l.debit) : ''}</td><td className="num">{l.credit ? formatRand(l.credit) : ''}</td><td className="num"><strong style={{ color: l.balance > 0 ? 'var(--danger)' : undefined }}>{formatRand(l.balance)}</strong></td><td>{payment && <button className="btn xs danger" onClick={() => { store.deleteRentPayment(payment.id); store.toast('Payment removed.', 'info'); }}>Remove</button>}</td></tr>
                );
              })}
              {!ledger.lines.length && <tr><td colSpan={7}><Empty title="Nothing charged yet" body="Charges start in the lease's first month." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <Modal open={payOpen} title="Record fictional rent payment" sub={`${tenant.name || tenant.ref} · balance ${formatRand(ledger.balance)}`} onClose={() => setPayOpen(false)}>
        <form onSubmit={submit} className="form-grid">
          <Field label="Amount (R)" error={err}><input className="input num" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!err} data-testid="rent-amount" /></Field>
          <Field label="Date"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Method"><select className="select" value={method} onChange={(e) => setMethod(e.target.value as RentPayment['method'])}><option value="eft">EFT</option><option value="debit-order">Debit order</option><option value="cash">Cash</option><option value="other">Other</option></select></Field>
          <Field label="Reference"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          <div className="span-2 modal-foot"><button type="button" className="btn" onClick={() => setPayOpen(false)}>Cancel</button><button type="submit" className="btn primary" data-testid="rent-submit">Record payment</button></div>
        </form>
      </Modal>
    </>
  );
}
