# Pulse Support AI

A polished Next.js customer support assistant demo with a functional core, App Router UI, semantic commit history, and enforced 100% unit-test coverage.

## What it does

- Drafts a support reply from a customer issue.
- Detects the likely support lane such as billing, refund, delivery, account access, subscription, or damaged item.
- Returns next actions, escalation guidance, and a supporting policy reference.
- Ships in demo mode without secrets so it can be deployed immediately.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Vitest + Testing Library
- Functional support engine with pure decision helpers

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality gates

```bash
npm run lint
npm run build
npm run coverage
```

The coverage command is configured to fail unless statements, branches, functions, and lines all remain at 100%.

## Deploy on Vercel

This project is ready for a standard Vercel deployment with no extra configuration.

```bash
npx vercel deploy --prod
```

If you want to keep the current no-secret demo behavior, leave the environment as:

```bash
NEXT_PUBLIC_SUPPORT_ASSISTANT_MODE=demo
```

## Demo script

Use any of these in the quick prompts or paste them into the composer:

1. `My package has been stuck in transit for four days and I need it before Friday.`
2. `I was charged twice for the same order and my bank is asking questions.`
3. `The item arrived cracked and the customer wants a replacement today.`
4. `I cannot log in after changing my phone and I think 2FA is blocking me.`

When demoing, point out:

- The assistant writes a grounded reply instead of a generic summary.
- The side panel updates with confidence, sentiment, escalation lane, and follow-up.
- Every playbook and routing decision is backed by pure functions with full unit-test coverage.
