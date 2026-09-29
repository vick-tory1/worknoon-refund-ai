import { useState } from 'react'
import CustomerRefundView from './views/CustomerRefundView'
import AdminDashboardView from './views/AdminDashboardView'
import './App.css'

function App() {
  const [view, setView] = useState('customer')
  const [policySectionOpen, setPolicySectionOpen] = useState(false)
  const [fullPolicyOpen, setFullPolicyOpen] = useState(false)

  function togglePolicySection() {
    if (view !== 'customer') {
      setView('customer')
      setPolicySectionOpen(true)
      setFullPolicyOpen(false)
      return
    }

    setPolicySectionOpen((open) => {
      if (open) setFullPolicyOpen(false)
      return !open
    })
  }

  return <><header className="topbar"><a className="brand" href="#customer" onClick={() => setView('customer')}><span>W</span>worknoon</a><nav aria-label="Primary navigation"><button className={view === 'customer' ? 'active' : ''} onClick={() => setView('customer')}>Customer request</button><button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Support operations</button></nav><a className="secure" href="#refund-policy" onClick={togglePolicySection}><i />Policy-led decisions</a></header><main>{view === 'customer' ? <CustomerRefundView policySectionOpen={policySectionOpen} fullPolicyOpen={fullPolicyOpen} setFullPolicyOpen={setFullPolicyOpen} /> : <AdminDashboardView />}</main><footer>Worknoon · Refund operations, with decisions grounded in policy.</footer></>
}

export default App
