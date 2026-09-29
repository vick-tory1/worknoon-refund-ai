function Notice({ children, tone = 'error' }) {
  return <div className={`notice notice--${tone}`} role="alert">{children}</div>
}

export default Notice
