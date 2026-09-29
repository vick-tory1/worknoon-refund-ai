import Status from '../components/Status'
import { money } from '../utils/format'

const AI_UNAVAILABLE_CUSTOMER_MESSAGE = "Your request has been received, but it can't be approved right now. It has been escalated to the appropriate team. We will have someone reach out to you as soon as possible."

function RefundResultView({ result, onStartOver }) {
  const aiUnavailable = result.aiUnavailable === true
  if (aiUnavailable) {
    return <section className="result"><p className="result-lede">{AI_UNAVAILABLE_CUSTOMER_MESSAGE}</p></section>
  }

  const text = result.decision === 'APPROVED' ? 'Your refund request is approved.' : result.decision === 'DENIED' ? 'Your request could not be approved.' : 'Your request needs a quick human review.'
  const lede = result.ai.customerResponse

  return <section className="result"><div className="result-mark">{result.decision === 'APPROVED' ? '✓' : '!'}</div><Status value={result.decision} /><h1>{text}</h1><p className="result-lede">{lede}</p><div className="result-grid"><article><span>Requested amount</span><strong>{money(result.requestedAmount)}</strong></article><article><span>Order number</span><strong>{result.order.order_number}</strong><small>{result.order.product_name}</small></article><article><span>Next steps</span><strong>{result.decision === 'ESCALATED' ? 'A support specialist will review this request.' : result.decision === 'APPROVED' ? 'We’ll process the refund to the original payment method.' : 'If you need help, contact support with your order number.'}</strong></article></div><div className="explanation"><p className="eyebrow">Decision details</p>{result.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div><button className="button button--secondary" onClick={onStartOver}>Start another request</button></section>
}

export default RefundResultView
