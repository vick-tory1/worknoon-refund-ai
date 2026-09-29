import AuditTrail from '../components/AuditTrail'
import Status from '../components/Status'
import { date, money } from '../utils/format'

function RefundDetailPanel({ detail }) {
  if (!detail) return null

  const classification = detail.ai_classification?.replaceAll('_', ' ') || 'Not available'

  return <aside className="detail-panel">
    <div className="detail-top"><div><p className="eyebrow">Request #{detail.id}</p><h2>Request details</h2></div><Status value={detail.decision} /></div>
    <section><h3>Customer request</h3><p>{detail.reason}</p><dl><div><dt>Customer</dt><dd>{detail.customer_name}<small>{detail.customer_email}</small></dd></div><div><dt>Requested</dt><dd>{money(detail.requested_amount)}</dd></div></dl></section>
    <section><h3>Order information</h3><p><strong>{detail.product_name}</strong><br />{detail.order_number} · Ordered {date(detail.order_date)}<br />Order total {money(detail.order_amount)}</p></section>
    <section className="policy-card"><p className="eyebrow">Policy assessment</p>{detail.policy_reasons.map((reason) => <p key={reason}>{reason}</p>)}</section>
    <section className="ai-card"><p className="eyebrow">AI classification</p><strong>{classification}</strong><p>{detail.ai_response}</p></section>
    <section><h3>Audit trail</h3><AuditTrail logs={detail.audit_logs} /></section>
  </aside>
}

export default RefundDetailPanel
