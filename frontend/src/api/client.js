const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'
const FALLBACK_ERROR = 'Something went wrong while processing your request. Please try again.'

function safeErrorMessage(value) {
  const message = typeof value === 'string' ? value : ''
  const blockedTerms = ['{', '}', '[', ']', 'gemini', 'quota', 'stack', 'prompt', 'credential', 'api key']
  return message.length > 0 && message.length <= 200 && !blockedTerms.some((term) => message.toLowerCase().includes(term))
    ? message
    : FALLBACK_ERROR
}

async function request(path, options) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(safeErrorMessage(body.error))
    }

    return body
  } catch (error) {
    throw new Error(safeErrorMessage(error instanceof Error ? error.message : ''), { cause: error })
  }
}

export const api = {
  customers: () => request('/customers'), orders: (id) => request(`/customers/${id}/orders`),
  refunds: () => request('/refunds'), refund: (id) => request(`/refunds/${id}`),
  createRefund: (payload) => request('/refunds', { method: 'POST', body: JSON.stringify(payload) }),
}
