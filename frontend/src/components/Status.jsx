function Status({ value, label }) {
  const displayLabel = label || (value === 'ESCALATED' ? 'Review required' : value?.charAt(0) + value?.slice(1).toLowerCase())

  return <span className={`status status--${value?.toLowerCase()}`}><span aria-hidden="true" />{displayLabel}</span>
}

export default Status
