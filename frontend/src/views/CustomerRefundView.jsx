import { useEffect, useMemo, useState } from 'react'
import refundPolicy from '../../../docs/refund-policy.md?raw'
import { api } from '../api/client'
import Notice from '../components/Notice'
import { date, money } from '../utils/format'
import RefundResultView from './RefundResultView'

function CustomerRefundView({ policySectionOpen, fullPolicyOpen, setFullPolicyOpen }) {
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [orders, setOrders] = useState([])
  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [escalationMessage, setEscalationMessage] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.customers().then(setCustomers).catch(() => setError('We could not load customer accounts. Please refresh and try again.')).finally(() => setLoading(false))
  }, [])

  async function chooseCustomer(id) {
    setCustomerId(id); setOrders([]); setOrderId(''); setAmount(''); setError(''); setEscalationMessage('')
    if (!id) return
    try { setOrders(await api.orders(id)) } catch (requestError) { setError(requestError.message) }
  }

  const selectedOrder = useMemo(() => orders.find((order) => String(order.id) === orderId), [orders, orderId])

  async function submit(event) {
    event.preventDefault(); setError(''); setEscalationMessage(''); setResult(null)
    const requestedAmount = Number(amount)
    if (!customerId || !orderId || !reason.trim() || !amount) return setError('Select an account and order, then add a reason and requested amount.')
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return setError('Enter an amount greater than zero.')
    if (selectedOrder && requestedAmount > selectedOrder.amount) return setError('The requested amount cannot exceed the order amount.')
    setSubmitting(true)
    try {
      const createdRequest = await api.createRefund({ customerId: Number(customerId), orderId: Number(orderId), reason: reason.trim(), requestedAmount })
      if (createdRequest.aiUnavailable) setEscalationMessage(createdRequest.ai.customerResponse)
      else setResult(createdRequest)
    } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }

  if (result) return <RefundResultView result={result} onStartOver={() => { setResult(null); setReason(''); setAmount(''); setOrderId('') }} />

  return <section className="request-shell">
    <div className="section-heading"><div><p className="eyebrow">Customer request</p><h1>Request a refund</h1><p>Tell us about the order and the amount you’re requesting. We’ll confirm the next step after review.</p></div><span className="step">Step 1 of 1</span></div>
    {error && <Notice>{error}</Notice>}
    <form onSubmit={submit} className="request-form">
      <label>Customer account<select value={customerId} onChange={(event) => chooseCustomer(event.target.value)} disabled={loading}><option value="">{loading ? 'Loading accounts…' : 'Select customer'}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select></label>
      <label>Order<select value={orderId} onChange={(event) => { setOrderId(event.target.value); const order = orders.find((item) => String(item.id) === event.target.value); if (order) setAmount(order.amount) }} disabled={!customerId || !orders.length}><option value="">{customerId && !orders.length ? 'Loading orders…' : 'Select order'}</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.order_number} · {order.product_name} · {money(order.amount)}</option>)}</select></label>
      {selectedOrder && <div className="order-summary"><span>Order details</span><strong>{selectedOrder.product_name}</strong><small>{selectedOrder.order_number} · Placed {date(selectedOrder.order_date)} · Order total {money(selectedOrder.amount)}</small></div>}
      <div className="form-grid"><label>Requested amount<div className="input-prefix"><span>$</span><input type="number" min="0.01" max={selectedOrder?.amount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label><label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength="1000" placeholder="Briefly describe what happened and how we can help." /></label></div>
      <div className="form-footer"><p>We’ll use your request details to assess the applicable refund policy.</p><button className="button button--primary" disabled={submitting}>{submitting ? 'Submitting request…' : 'Submit refund request'}</button></div>
    </form>
    {escalationMessage && <Notice tone="escalation">{escalationMessage}</Notice>}
    {policySectionOpen && <section className="explanation" id="refund-policy" aria-labelledby="refund-policy-heading"><p className="eyebrow">Refund policy</p><h2 id="refund-policy-heading">What to expect</h2><ul><li>Final-sale items: no refund.</li><li>Requests over 30 days: no refund.</li><li>Requests above $500: human review.</li><li>Damaged or incorrect items may qualify.</li><li>Suspicious or conflicting requests: human review.</li></ul><button type="button" className="policy-link" onClick={() => setFullPolicyOpen(!fullPolicyOpen)} aria-expanded={fullPolicyOpen}>{fullPolicyOpen ? 'Close full policy' : 'View full policy'}</button>{fullPolicyOpen && <pre className="policy-full">{refundPolicy}</pre>}</section>}
  </section>
}

export default CustomerRefundView
