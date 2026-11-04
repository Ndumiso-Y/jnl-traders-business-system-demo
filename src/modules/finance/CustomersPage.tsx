import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IcoPlus, IcoSearch, IcoUsers } from '../../components/Icons';
import { Empty, Field, Modal, PageHeader, Panel } from '../../components/ui';
import { formatRand } from '../../lib/money';
import { invoiceDerived } from '../../lib/selectors';
import { useStore } from '../../store/useStore';
import type { Customer } from '../../store/types';

const blank = (): Omit<Customer, 'id'> => ({ name: '', contact: '', email: '', phone: '', address: '', vatNumber: '' });

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const toast = useStore((s) => s.toast);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Customer, 'id'>>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return customers.filter((c) => !term || c.name.toLowerCase().includes(term) || c.contact.toLowerCase().includes(term)).map((c) => {
      const inv = invoices.filter((i) => i.customerId === c.id && i.status === 'issued');
      const balance = inv.reduce((s, i) => s + Math.max(0, invoiceDerived(i, payments).balance), 0);
      return { c, count: inv.length, balance };
    });
  }, [customers, invoices, payments, q]);

  const openNew = () => { setForm(blank()); setErrors({}); setEditing('new'); };
  const openEdit = (c: Customer) => { const { id: _id, ...rest } = c; void _id; setForm({ ...blank(), ...rest }); setErrors({}); setEditing(c); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Customer name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address (use example.com for demo data).';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (editing === 'new') { addCustomer(form); toast('Fictional customer added.'); }
    else if (editing) { updateCustomer(editing.id, form); toast('Customer updated.'); }
    setEditing(null);
  };

  return (
    <>
      <PageHeader kicker="Finance / Customers" title="Customers" subtitle="Fictional customer records used by quotations, invoices and statements."
        actions={<button className="btn primary" onClick={openNew} data-testid="new-customer"><IcoPlus />Add customer</button>} />
      <Panel title="Customer register" meta={`${customers.length} fictional customers`}>
        <div className="toolbar"><label className="search-box"><IcoSearch /><input placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></label></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Customer</th><th>Contact</th><th>Issued invoices</th><th className="num">Balance</th><th /></tr></thead>
            <tbody>
              {rows.map(({ c, count, balance }) => (
                <tr key={c.id} data-testid="customer-row">
                  <td><div className="cell-flex"><span className="row-icon"><IcoUsers /></span><div><strong>{c.name}</strong><small>{c.address}</small></div></div></td>
                  <td>{c.contact}<small>{c.email}</small></td>
                  <td>{count}</td>
                  <td className="num"><strong>{formatRand(balance)}</strong></td>
                  <td><div className="btns"><button className="btn xs" onClick={() => openEdit(c)}>Edit</button><Link className="btn xs" to={`/finance/statements?customer=${c.id}`}>Statement</Link></div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5}><Empty title="No customers match" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <Modal open={editing !== null} title={editing === 'new' ? 'Add fictional customer' : 'Edit customer'} sub="Use placeholder names and example.com addresses only." onClose={() => setEditing(null)}>
        <form onSubmit={submit} className="form-grid">
          <Field label="Customer name" error={errors.name} className="span-2"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} data-testid="customer-name" /></Field>
          <Field label="Contact person"><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <Field label="Email" error={errors.email}><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="VAT number (sample)"><input className="input" value={form.vatNumber ?? ''} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} /></Field>
          <Field label="Address" className="span-2"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="span-2 modal-foot" style={{ marginTop: 4 }}>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn primary" data-testid="customer-save">Save customer</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
