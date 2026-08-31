# SupremeAI Ecosystem Test Frontend

Next.js 16 dashboard for the SupremeAI ecosystem. Connects to the backend microservice.

## Deploy to Vercel

1. Push this repo to GitHub
2. https://vercel.com → New Project → Import the repo
3. Framework: Next.js (auto-detected)
4. Environment Variables:
   - `NEXT_PUBLIC_ECOSYSTEM_API_URL` = `https://ecosystem-test-core.onrender.com`
   - `NEXT_PUBLIC_ECOSYSTEM_ADMIN_TOKEN` = (your ADMIN_TOKEN from Render)
5. Deploy

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Features

- 9-tab dashboard: Overview, Capabilities, Tasks, Resources, Approvals, Sources, Deployments, MCP, Settings
- Live provider health probing (Render, GitHub, Supabase)
- Task state machine (RECEIVED → COMPLETED)
- Approval workflow with decision memory
- MCP playground (governance-gated ACT ops)
