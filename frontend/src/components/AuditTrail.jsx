import { dateTime } from '../utils/format'

const eventLabels = {
  POLICY_EVALUATION: 'Policy evaluation',
  AI_ANALYSIS: 'AI analysis',
  AI_UNAVAILABLE: 'AI assistance unavailable',
}

function AuditTrail({ logs }) {
  return <ol className="audit">{logs.map((log) => <li key={log.id} className={`audit--${log.event_type.toLowerCase()}`}><span aria-hidden="true" /><div><strong>{eventLabels[log.event_type] || log.event_type.replaceAll('_', ' ')}</strong><small>{dateTime(log.created_at)}</small></div></li>)}</ol>
}

export default AuditTrail
