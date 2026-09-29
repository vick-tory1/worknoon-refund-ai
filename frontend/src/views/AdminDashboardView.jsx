import { useEffect, useState } from 'react'
import './AdminDashboardView.css'
import { api } from '../api/client'
import Notice from '../components/Notice'
import Status from '../components/Status'
import { dateTime, money } from '../utils/format'
import RefundDetailPanel from './RefundDetailPanel'

function classificationLabel(refund) {
  const classification = refund.ai_classification
    ? refund.ai_classification.replaceAll('_', ' ')
    : 'Not available'
  const isAiUnavailable = refund.policy_reasons?.includes('AI assistance is unavailable because the configured Gemini model could not respond.')
  return isAiUnavailable ? `AI unavailable — ${classification}` : classification
}

function AdminDashboardView() {
  const [refunds, setRefunds] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.refunds()
      .then(setRefunds)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  async function select(id) {
    try {
      setSelected(await api.refund(id))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return <section className="admin-shell">
    <div className="section-heading">
      <div>
        <p className="eyebrow">Refund operations</p>
        <h1>Refund requests</h1>
        <p>Review customer requests, policy outcomes, and support context.</p>
      </div>
      <div className="queue-count"><strong>{refunds.length}</strong><span>Requests in history</span></div>
    </div>
    {error && <Notice>{error}</Notice>}
    <div className={`admin-grid${selected ? ' admin-grid--selected' : ''}`}>
      <div className="table-wrap">
        <div className="table-title"><h2>Recent requests</h2><span>Most recent first</span></div>
        {loading ? <div className="empty-state">Loading refund requests…</div> : refunds.length === 0 ? <div className="empty-state">No refund requests have been submitted yet.</div> : <table>
          <thead><tr><th>Customer</th><th>Order / product</th><th>Amount</th><th>Status</th><th>AI classification</th><th>Submitted</th></tr></thead>
          <tbody>{refunds.map((item) => <tr key={item.id} onClick={() => select(item.id)} tabIndex="0" onKeyDown={(event) => event.key === 'Enter' && select(item.id)}>
            <td><strong>{item.customer_name}</strong><small>{item.customer_email}</small></td>
            <td><strong>{item.order_number}</strong><small>{item.product_name}</small></td>
            <td>{money(item.requested_amount)}</td>
            <td><Status value={item.decision} /></td>
            <td><span className="classification">{classificationLabel(item)}</span></td>
            <td>{dateTime(item.created_at)}</td>
          </tr>)}</tbody>
        </table>}
      </div>
      {selected && <RefundDetailPanel detail={selected} />}
    </div>
  </section>
}

export default AdminDashboardView
