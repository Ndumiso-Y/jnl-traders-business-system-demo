import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IcoAlert, IcoInfo, IcoX } from './Icons';
import { useStore } from '../store/useStore';

/* ---------- Page header ---------- */
export function PageHeader({ kicker, title, subtitle, actions }: { kicker: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <>
      <div className="page-kicker">{kicker}</div>
      <div className="title-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="btns">{actions}</div>}
      </div>
    </>
  );
}

/* ---------- Stat card ---------- */
export function Stat({ label, value, sub, tone, change }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'gold' | 'red'; change?: ReactNode }) {
  return (
    <div className="stat">
      <div className="metric-label">{label}</div>
      <div className={`metric-main ${tone ?? ''}`}>{value}</div>
      {(sub || change) && (
        <div className="metric-sub">
          {change}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------- Tag ---------- */
export type TagTone = 'green' | 'amber' | 'red' | 'dark' | 'gold' | 'blue';
export function Tag({ tone = 'dark', children, outline }: { tone?: TagTone; children: ReactNode; outline?: boolean }) {
  return <span className={`tag ${tone} ${outline ? 'outline' : ''}`}>{children}</span>;
}

/* ---------- Panel ---------- */
export function Panel({ title, meta, right, children, className = '', pad = true }: { title?: ReactNode; meta?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`panel ${pad ? 'panel-pad' : ''} ${className}`}>
      {(title || right) && (
        <div className="panel-head">
          <div>
            {title && <h2 className="panel-title">{title}</h2>}
            {meta && <div className="panel-meta">{meta}</div>}
          </div>
          {right && <div className="btns">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Notice ---------- */
export function Notice({ tone = 'gold', children, icon = true }: { tone?: 'gold' | 'amber' | 'red' | 'dark' | 'grey'; children: ReactNode; icon?: boolean }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'red' ? 'alert' : 'note'}>
      {icon && (tone === 'red' || tone === 'amber' ? <IcoAlert /> : <IcoInfo />)}
      <div>{children}</div>
    </div>
  );
}

/* ---------- Field ---------- */
export function Field({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, title, sub, onClose, children, footer, wide }: { open: boolean; title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 id={titleId}>{title}</h3>
            {sub && <p className="modal-sub">{sub}</p>}
          </div>
          <button className="circle-button" aria-label="Close dialog" onClick={onClose}><IcoX /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Confirm dialog ---------- */
export function Confirm({ open, title, body, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: { open: boolean; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} footer={
      <>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} data-testid="confirm-button">{confirmLabel}</button>
      </>
    }>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{body}</div>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <span style={{ flex: 1 }}>{t.text}</span>
          <button className="link-btn" style={{ color: '#c9ccc5' }} onClick={() => dismiss(t.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {body && <div>{body}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ---------- Due state tag ---------- */
export function DueTag({ state, label }: { state: 'overdue' | 'due-soon' | 'ok' | 'none'; label?: string }) {
  if (state === 'none') return <Tag tone="dark">Not set</Tag>;
  if (state === 'overdue') return <Tag tone="red">{label ?? 'Overdue'}</Tag>;
  if (state === 'due-soon') return <Tag tone="amber">{label ?? 'Due soon'}</Tag>;
  return <Tag tone="green">{label ?? 'On track'}</Tag>;
}
