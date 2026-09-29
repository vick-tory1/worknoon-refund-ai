const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
  return body
}

export const api = {
  customers: () => request('/customers'), orders: (id) => request(`/customers/${id}/orders`),
  refunds: () => request('/refunds'), refund: (id) => request(`/refunds/${id}`),
  createRefund: (payload) => request('/refunds', { method: 'POST', body: JSON.stringify(payload) }),
}
