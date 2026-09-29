# Worknoon Refund AI

A refund-operations application with a React customer flow, support dashboard, Express API, SQLite persistence, deterministic refund decisions, and Gemini-assisted communication.

## Demo Video

[Watch the Worknoon Refund AI assessment demo](https://drive.google.com/file/d/13OoI9qKQZf4uL5q4Y7Q3CpOwQbt4A_dD/view?usp=drive_link)

## Architecture

```text
React / Vite -> Express API -> SQLite
                    |
                    -> Gemini
```

* React handles the customer request flow and support dashboard.
* Express validates requests, evaluates the refund policy, calls Gemini, and records audit events.
* SQLite stores the synthetic customers, orders, refund requests, and audit logs.
* The backend policy engine is authoritative. Gemini assists with classification, reasoning, and customer communication.

## Run locally

Requirements: Node.js 22+ and npm.

Create `backend/.env`:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
PORT=5001
DEMO_AI_MODE=false
```

Start the backend:

```bash
cd backend
npm ci
node database/seed.js
npm start
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

The frontend uses `http://localhost:5001/api` by default.

## Local demo

To run the demo without using Gemini quota:

```dotenv
PORT=5001
DEMO_AI_MODE=true
```

Start the backend and frontend, then open `http://localhost:5173`.

The seeded data includes:

| Customer       | Order                                           |      Amount | Outcome      |
| -------------- | ----------------------------------------------- | ----------: | ------------ |
| Amara Okafor   | `ORD-2026-1048` — AeroSound Wireless Headphones |   `$189.00` | Approved     |
| Daniel Adeyemi | `ORD-2026-1172` — Northstar 14 Laptop           | `$1,299.00` | Human review |
| Tolu Adebayo   | `ORD-2026-1104` — PulseFit Smartwatch           |   `$249.00` | Denied       |

Submit a request, then open **Support operations** to view the request, policy result, AI response, and audit trail.

For a clean demo, stop the backend, delete `backend/database/refunds.db`, and run:

```bash
node database/seed.js
```

## Docker

```bash
docker compose up --build
```

Frontend: `http://localhost:8081`
API: `http://localhost:5001`

Stop with:

```bash
docker compose down
```

## Refund policy

1. Final-sale orders are denied.
2. Orders older than 30 days are denied.
3. Suspicious or conflicting requests are escalated.
4. Requests above $500 require human review.
5. Other eligible requests are approved.

The 30-day window and $500 threshold are assumptions for this assessment. The $500 amount is a review threshold, not a refund cap.

See [`docs/refund-policy.md`](docs/refund-policy.md).

## Gemini integration

The backend sends the policy result to Gemini for classification and customer communication. Gemini cannot override the backend decision.

Live model:

`gemini-2.5-flash`

Gemini is called once per request. If it is unavailable because of quota, provider errors, timeout, or another failure, the request is escalated for human review and an `AI_UNAVAILABLE` audit event is recorded.

Set `DEMO_AI_MODE=true` for local demonstrations without using Gemini. Set it back to `false` for live Gemini requests.

Customer-provided refund reasons are treated as untrusted input. Inputs are limited and sanitized, and Gemini is instructed not to follow instructions contained in customer data or disclose protected information.

## Data and audit trail

* `customers` and `orders` contain synthetic data.
* `refund_requests` stores refund decisions, reasons, AI classification, and responses.
* `audit_logs` stores policy, AI, and unavailable-AI events.

The support dashboard displays the request status, policy reasons, AI response, and audit history.

## API

| Method | Endpoint                            | Purpose                     |
| ------ | ----------------------------------- | --------------------------- |
| `GET`  | `/api/health`                       | Health check                |
| `GET`  | `/api/customers`                    | List customers              |
| `GET`  | `/api/customers/:customerId/orders` | List customer orders        |
| `POST` | `/api/refunds`                      | Create refund request       |
| `GET`  | `/api/refunds`                      | List refund requests        |
| `GET`  | `/api/refunds/:refundId`            | Get request and audit trail |

## Tests

Run backend tests:

```bash
node --test backend/policy/refundPolicy.test.js backend/services/aiService.test.js backend/services/refundService.test.js backend/routes/refundRoutes.test.js
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Assumptions

* SQLite and synthetic data are used to keep the assessment self-contained.
* Authentication, RBAC, pagination, filtering, real-time updates, and human-review resolution are outside the current scope.
* `DEMO_AI_MODE` is for local demonstrations only and does not change the backend policy decision.
