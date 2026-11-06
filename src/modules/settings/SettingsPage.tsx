import { useState } from 'react';
import { IcoRefresh } from '../../components/Icons';
import RoleBar from '../../components/RoleBar';
import { Confirm, Field, Notice, PageHeader, Panel } from '../../components/ui';
import { formatDateTime } from '../../lib/dates';
import { parseNumber } from '../../lib/money';
import { useShallow } from 'zustand/react/shallow';
import { STORAGE_KEY, useStore } from '../../store/useStore';

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const seededAt = useStore((s) => s.seededAt);
  const update = useStore((s) => s.updateSettings);
  const resetDemo = useStore((s) => s.resetDemo);
  const toast = useStore((s) => s.toast);
  const counts = useStore(useShallow((s) => ({ quotations: s.quotations.length, invoices: s.invoices.length, payments: s.payments.length, requests: s.requests.length, assets: s.assets.length, expenses: s.expenses.length, hr: s.hrRecords.length, incidents: s.incidents.length })));
  const [vat, setVat] = useState(String(settings.vatRate));
  const [company, setCompany] = useState(settings.companyName);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseNumber(vat);
    if (!Number.isFinite(n) || n < 0 || n > 100) { setErr('VAT rate must be a number between 0 and 100.'); return; }
    setErr('');
    update({ vatRate: n, companyName: company.trim() || 'JNL Traders' });
    toast('Settings saved (this browser only).');
  };

  return (
    <>
      <PageHeader kicker="Workspace / Settings" title="Settings & demo reset" subtitle="Demonstration defaults stored in this browser only." />
      <RoleBar note="Settings and the demo reset stay open to every simulated user so the walkthrough can always be restored. Permissions are managed under Users & permissions." />
      <div className="grid-2-even">
        <Panel title="Demonstration defaults" meta="Applied to new documents">
          <form onSubmit={save} className="form-grid">
            <Field label="Default VAT rate (%)" error={err} hint="15% is a configurable demonstration default, not evidence of the client's VAT status."><input className="input" type="number" step="0.5" min={0} max={100} value={vat} onChange={(e) => setVat(e.target.value)} aria-invalid={!!err} data-testid="vat-default" /></Field>
            <Field label="Company name on documents"><input className="input" value={company} onChange={(e) => setCompany(e.target.value)} /></Field>
            <div className="span-2"><button type="submit" className="btn primary" data-testid="save-settings">Save settings</button></div>
          </form>
        </Panel>
        <Panel title="Demo data in this browser" meta={`Seeded ${formatDateTime(seededAt)} · storage key ${STORAGE_KEY}`}>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {Object.entries(counts).map(([k, v]) => <tr key={k}><td style={{ textTransform: 'capitalize' }}>{k}</td><td className="num"><strong>{v}</strong></td></tr>)}
              </tbody>
            </table>
          </div>
          <hr className="thin" />
          <button className="btn danger" onClick={() => setConfirm(true)} data-testid="reset-demo"><IcoRefresh />Reset demo data</button>
          <p className="field-hint" style={{ marginTop: 10 }}>Restores the fictional starting set and discards every change made in this browser.</p>
        </Panel>
      </div>
      <Notice tone="dark"><b>What this demo is</b>A static, browser-only prototype on GitHub Pages. Data lives in localStorage on this device and does not sync. Users, roles and permissions are simulated. No login, server, email, payment or integration exists. It is not a secure production application.</Notice>
      <Confirm open={confirm} title="Reset all demo data?" danger confirmLabel="Reset demo" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); resetDemo(); setVat('15'); setCompany('JNL Traders'); }} body="Every quotation, invoice, payment, request, asset, cost, HR record and incident you changed or created in this browser will be deleted and replaced with the fictional starting set. This cannot be undone." />
    </>
  );
}
