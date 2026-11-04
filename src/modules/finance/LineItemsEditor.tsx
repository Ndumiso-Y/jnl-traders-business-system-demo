import { IcoPlus, IcoTrash } from '../../components/Icons';
import { formatRand, hasErrors, parseNumber, validateLine, type LineValidation } from '../../lib/money';
import type { LineItem } from '../../store/types';
import type { DocTotals } from '../../lib/money';

type Props = {
  items: LineItem[];
  totals: DocTotals;
  onChange: (items: LineItem[]) => void;
  showErrors: boolean;
  readOnly?: boolean;
  newLine: () => LineItem;
};

/** Editable line items table. Numeric inputs are kept as strings until parsed. */
export default function LineItemsEditor({ items, totals, onChange, showErrors, readOnly, newLine }: Props) {
  const update = (id: string, patch: Partial<LineItem>) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.length > 1 ? items.filter((it) => it.id !== id) : items.map((it) => (it.id === id ? { ...newLine() } : it)));

  const err = (it: LineItem): LineValidation => (showErrors ? validateLine(it) : {});

  return (
    <div>
      <div className="panel-head" style={{ marginBottom: 6 }}>
        <h3 className="panel-title" style={{ fontSize: 14 }}>Items &amp; services</h3>
        {!readOnly && <button type="button" className="link-btn" onClick={() => onChange([...items, newLine()])} data-testid="add-line"><IcoPlus style={{ width: 14, height: 14 }} />Add line item</button>}
      </div>
      <div className="table-wrap">
        <table className="table items-table">
          <thead>
            <tr><th style={{ minWidth: 220 }}>Description</th><th className="num" style={{ width: 90 }}>Qty</th><th className="num" style={{ width: 130 }}>Unit price</th><th className="num" style={{ width: 90 }}>Disc. %</th><th className="num" style={{ width: 120 }}>Total</th>{!readOnly && <th style={{ width: 44 }}><span className="sr-only">Remove</span></th>}</tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const e = err(it);
              const l = totals.lines[i];
              return (
                <tr key={it.id} data-testid="line-row">
                  <td>
                    {readOnly ? <strong>{it.description}</strong> : (
                      <input className="input" aria-label={`Line ${i + 1} description`} aria-invalid={!!e.description} placeholder="Describe the item or service" value={it.description} onChange={(ev) => update(it.id, { description: ev.target.value })} />
                    )}
                    {e.description && <span className="field-error" role="alert">{e.description}</span>}
                  </td>
                  <td className="num">
                    {readOnly ? it.qty : <input className="input num" type="number" inputMode="decimal" step="any" aria-label={`Line ${i + 1} quantity`} aria-invalid={!!e.qty} value={Number.isNaN(it.qty) ? '' : it.qty} onChange={(ev) => update(it.id, { qty: parseNumber(ev.target.value) })} />}
                    {e.qty && <span className="field-error" role="alert">{e.qty}</span>}
                  </td>
                  <td className="num">
                    {readOnly ? formatRand(Math.round(it.unitPrice * 100)) : <input className="input num" type="number" inputMode="decimal" step="0.01" aria-label={`Line ${i + 1} unit price`} aria-invalid={!!e.unitPrice} value={Number.isNaN(it.unitPrice) ? '' : it.unitPrice} onChange={(ev) => update(it.id, { unitPrice: parseNumber(ev.target.value) })} />}
                    {e.unitPrice && <span className="field-error" role="alert">{e.unitPrice}</span>}
                  </td>
                  <td className="num">
                    {readOnly ? `${it.discountPct || 0}%` : <input className="input num" type="number" inputMode="decimal" step="any" min={0} max={100} aria-label={`Line ${i + 1} discount percent`} aria-invalid={!!e.discountPct} value={Number.isNaN(it.discountPct) ? '' : it.discountPct} onChange={(ev) => update(it.id, { discountPct: ev.target.value === '' ? 0 : parseNumber(ev.target.value) })} />}
                    {e.discountPct && <span className="field-error" role="alert">{e.discountPct}</span>}
                  </td>
                  <td className="num"><strong data-testid="line-total">{formatRand(l?.incl ?? 0)}</strong><small>{formatRand(l?.excl ?? 0)} excl.</small></td>
                  {!readOnly && <td><button type="button" className="circle-button" style={{ width: 32, height: 32 }} aria-label={`Remove line ${i + 1}`} onClick={() => remove(it.id)}><IcoTrash style={{ width: 14, height: 14 }} /></button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showErrors && items.some((it) => hasErrors(validateLine(it))) && <p className="field-error" style={{ marginTop: 8 }}>Fix the highlighted lines before continuing.</p>}
    </div>
  );
}
