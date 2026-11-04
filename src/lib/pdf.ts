import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Customer, Invoice, Payment, Quotation } from '../store/types';
import { computeTotals, formatRand, toCents } from './money';
import { formatDate } from './dates';

const INK: [number, number, number] = [33, 37, 33];
const MUTED: [number, number, number] = [110, 117, 111];
const GOLD: [number, number, number] = [180, 147, 88];
const LINE: [number, number, number] = [233, 232, 228];

export const DEMO_STAMP = 'DEMONSTRATION / NOT A VALID TAX INVOICE';

function header(doc: jsPDF, title: string, number: string, companyName: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text('JNL', 16, 20);
  const w = doc.getTextWidth('JNL');
  doc.setTextColor(...GOLD);
  doc.text('.', 16 + w, 20);
  doc.setFontSize(7);
  doc.setTextColor(...GOLD);
  doc.text('T R A D E R S', 16.2, 24.5);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyName} · Fictional demonstration workspace`, 16, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(title.toUpperCase(), 194, 20, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(number, 194, 26, { align: 'right' });

  doc.setDrawColor(...LINE);
  doc.line(16, 34, 194, 34);
}

function stamp(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    // Diagonal watermark
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(...INK);
    doc.text(DEMO_STAMP, 105, 160, { align: 'center', angle: 30 });
    doc.restoreGraphicsState();
    // Footer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text(DEMO_STAMP, 105, 285, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('All parties, items and amounts are fictional sample data generated for a discovery prototype. Page ' + p + ' of ' + pages, 105, 289.5, { align: 'center' });
  }
}

export function buildDocumentPdf(kind: 'quotation' | 'invoice', d: Quotation | Invoice, customer: Customer | undefined, companyName: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const title = kind === 'quotation' ? 'Quotation' : 'Invoice';
  header(doc, title, d.number, companyName);

  const totals = computeTotals(d.items, d.vatRate, d.pricesIncludeVat);
  const y0 = 42;
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER (FICTIONAL)', 16, y0);
  doc.text('DETAILS', 120, y0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const custLines = [customer?.name ?? '—', customer?.contact ?? '', customer?.address ?? '', customer?.email ?? '', customer?.vatNumber ? `VAT (sample): ${customer.vatNumber}` : ''].filter(Boolean);
  doc.text(custLines, 16, y0 + 5);
  const right: string[] = [`${title} date: ${formatDate(d.date)}`];
  if (kind === 'quotation') right.push(`Valid until: ${formatDate((d as Quotation).validUntil)}`);
  else right.push(`Due date: ${formatDate((d as Invoice).dueDate)}`);
  right.push(`Status: ${d.status}`);
  right.push(`Pricing: VAT ${d.pricesIncludeVat ? 'inclusive' : 'exclusive'} · rate ${d.vatRate}% (sample)`);
  if (kind === 'invoice' && (d as Invoice).sourceQuotationId) right.push('Converted from quotation');
  doc.text(right, 120, y0 + 5);

  autoTable(doc, {
    startY: y0 + 5 + custLines.length * 4.6 + 8,
    head: [['Description', 'Qty', 'Unit price', 'Disc.', 'Excl. VAT', 'VAT', 'Line total']],
    body: d.items.map((it, i) => {
      const l = totals.lines[i];
      return [it.description, String(it.qty), formatRand(toCents(it.unitPrice)), it.discountPct ? `${it.discountPct}%` : '—', formatRand(l.excl), formatRand(l.vat), formatRand(l.incl)];
    }),
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 3, lineColor: LINE, lineWidth: 0.2 },
    headStyles: { fillColor: [247, 247, 244], textColor: MUTED, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 16, right: 16 },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const rows: Array<[string, string, boolean?]> = [
    ['Subtotal (excl. VAT)', formatRand(totals.subtotal)],
  ];
  if (totals.discount) rows.push(['Discount', `-${formatRand(totals.discount)}`]);
  rows.push([`VAT (${d.vatRate}% sample)`, formatRand(totals.vat)]);
  rows.push(['Grand total', formatRand(totals.total), true]);
  let y = afterTable;
  for (const [label, value, bold] of rows) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 9.5);
    doc.setTextColor(...(bold ? INK : MUTED));
    doc.text(label, 130, y);
    doc.setTextColor(...INK);
    doc.text(value, 194, y, { align: 'right' });
    y += bold ? 8 : 6;
  }
  if (d.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('NOTES', 16, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(d.notes, 110), 16, y + 9);
  }
  stamp(doc);
  return doc;
}

export type StatementLine = { date: string; ref: string; description: string; debit: number; credit: number; balance: number };

export function buildStatementLines(invoices: Invoice[], payments: Payment[]): { lines: StatementLine[]; invoiced: number; received: number; balance: number } {
  const events: Array<{ date: string; order: number; ref: string; description: string; debit: number; credit: number; createdAt: string }> = [];
  for (const inv of invoices) {
    if (inv.status !== 'issued') continue;
    events.push({ date: inv.date, order: 0, ref: inv.number, description: `Invoice issued · due ${formatDate(inv.dueDate)}`, debit: computeTotals(inv.items, inv.vatRate, inv.pricesIncludeVat).total, credit: 0, createdAt: inv.createdAt });
  }
  const invIds = new Set(invoices.map((i) => i.id));
  for (const p of payments) {
    if (!invIds.has(p.invoiceId)) continue;
    const inv = invoices.find((i) => i.id === p.invoiceId);
    events.push({ date: p.date, order: 1, ref: p.reference || 'Payment', description: `Payment received (${p.method.toUpperCase()}) · ${inv?.number ?? ''}`, debit: 0, credit: toCents(p.amount), createdAt: p.createdAt });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  let bal = 0; let invoiced = 0; let received = 0;
  const lines = events.map((e) => { bal += e.debit - e.credit; invoiced += e.debit; received += e.credit; return { date: e.date, ref: e.ref, description: e.description, debit: e.debit, credit: e.credit, balance: bal }; });
  return { lines, invoiced, received, balance: bal };
}

export function buildStatementPdf(customer: Customer, invoices: Invoice[], payments: Payment[], companyName: string, asOf: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  header(doc, 'Customer statement', `As at ${formatDate(asOf)}`, companyName);
  const s = buildStatementLines(invoices, payments);
  doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER (FICTIONAL)', 16, 42);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
  doc.text([customer.name, customer.contact, customer.address].filter(Boolean), 16, 47);
  autoTable(doc, {
    startY: 64,
    head: [['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance']],
    body: s.lines.map((l) => [formatDate(l.date), l.ref, l.description, l.debit ? formatRand(l.debit) : '', l.credit ? formatRand(l.credit) : '', formatRand(l.balance)]),
    styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, cellPadding: 2.6, lineColor: LINE, lineWidth: 0.2 },
    headStyles: { fillColor: [247, 247, 244], textColor: MUTED, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 16, right: 16 },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const rows: Array<[string, string, boolean?]> = [['Total invoiced', formatRand(s.invoiced)], ['Total received', formatRand(s.received)], ['Balance outstanding', formatRand(s.balance), true]];
  for (const [label, value, bold] of rows) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 9.5); doc.setTextColor(...(bold ? INK : MUTED));
    doc.text(label, 130, y); doc.setTextColor(...INK); doc.text(value, 194, y, { align: 'right' }); y += bold ? 8 : 6;
  }
  stamp(doc);
  return doc;
}
