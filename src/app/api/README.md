# Route handler convention

REST endpoints belong under this directory and use Next.js Route Handlers.

Each handler must validate input at the boundary with Zod, call its owning
business-module service, and return the shared response helpers from
`src/shared/api/response.ts`. Route handlers must not contain business rules or
access repositories directly.

S00 deliberately defines no domain endpoint path or request contract.
