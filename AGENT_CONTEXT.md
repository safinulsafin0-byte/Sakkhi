# AGENT_CONTEXT.md — SakkhiAI

## Project Overview
**Sakkhi** (সাক্ষী — "The Witness", tagline: *"every taka, witnessed"*) is a digital accountability, evidence verification, and community fund transparency platform. It enables community organizers, relief efforts, and transparent initiatives to upload donation receipts, invoices, and field evidence (images, documents, GPS tracks), perform tamper-detection and forensic integrity analysis, track expenditures against campaign goals in BDT and USD, and issue verifiable receipts of witnessed impact.

## Design Philosophy & Anti-Patterns
- **No Cold SaaS Tropes**: Absolutely no Inter, no Roboto, no purple/blue neon gradients, no frosted glassmorphism.
- **Warm & Grounded Tone**: Earthen terracotta (`#b84c26`), soft unbleached paper canvas (`#fbf9f5`), deep charcoal ink (`#1f2421`), and forest green verified seals (`#2d6a4f`).
- **Typography**: 
  - Wordmark & Headings: `Literata` (Serif via `next/font/google`)
  - Body & Numbers: `Source Sans 3` (Humanist Sans via `next/font/google`)
  - Bengali & Multilingual: `Hind Siliguri` (Bengali Sans via `next/font/google`)
- **Reading Comfort**: Default body text is **18px** with a generous line-height of **1.7**.
- **Touch & Accessibility**: Every interactive element has at least a **44px tap target** (`min-h-[44px] min-w-[44px]`) and high-contrast, visible focus rings.
- **Honest Human Copy**: Written like a kind, clear human neighbor—never hype, corporate buzzwords, or manipulative guilt-tripping.

## Architecture Principles
1. **Next.js 14 App Router**: Single unified full-stack application using TypeScript, Tailwind CSS, and Server/Client Components.
2. **Deterministic & Mockable AI**: All AI verification engines support a `mock` mode (`AI_PROVIDER=mock`) or `DEMO_MODE=true` so the app runs completely standalone without requiring paid API keys.
3. **Privacy & Security First**: Zero secret leakage. Health checks and public endpoints report booleans only.
4. **Prisma + SQLite**: Embedded, portable relational storage with full relational integrity and typed client generation.

## Operational Rules for Agents
- Never build outside the current project root (`E:\SakkhiAI`).
- Always run environment checks via `lib/env.ts` using strict Zod parsing.
- Always provide mock fallbacks when API keys are absent.
- Maintain test coverage for core forensic parsing and hashing utilities.
- Update `docs/TASKS.md` to keep implementation progress transparent.
