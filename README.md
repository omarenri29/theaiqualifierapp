# The AI Qualifier

Helps sales teams identify their ideal customers and qualify leads using AI.

## What it does

Solves two problems:

1. **Don't know your ICP?** - Enter your company domain and get an Ideal Customer Profile with buyer personas generated automatically.

2. **Need to qualify leads fast?** - Paste a list of prospect domains and get them scored against your ICP with detailed reasoning.

## Tech Stack

- **Next.js** - Full-stack framework, handles frontend and API routes
- **Supabase** - Managed Postgres with built-in auth and RLS
- **OpenAI GPT-4** - Company analysis and lead qualification
- **TypeScript** - Type safety throughout

Kept it simple - everything runs in Next.js API routes, no microservices.

## Setup

Get your API keys first:
- OpenAI API key from platform.openai.com
- Supabase project from supabase.com (free tier works)

Then:

```bash
npm install

# Copy .env.example to .env and add your keys
cp .env.example .env

# Run the SQL schema in your Supabase dashboard
# SQL Editor → paste database/schema.sql → Run

npm run dev
```

Open http://localhost:3000

## How it works

1. Sign up with email/password
2. Enter your company domain - scrapes and analyzes your site
3. Get your ICP - generates 3-5 buyer personas, target company size, industries
4. Qualify prospects - paste domains and get scored results

Each prospect gets scored 0-100 with:
- Fit level (Excellent/Good/Moderate/Poor)
- Reasoning for the score
- Strengths and weaknesses vs your ICP
- Recommendation on next steps

## Project structure

```
pages/
  api/
    company/analyze.ts      → Scrapes company, generates ICP
    prospects/qualify.ts    → Scores prospects against ICP
  icp/[icpId].tsx          → Shows ICP details
  dashboard.tsx            → Lists all your ICPs
  qualify.tsx              → Prospect qualification interface
lib/
  scraper.ts              → Web scraping + AI analysis
  icp-generator.ts        → ICP creation logic
  qualifier.ts            → Scoring logic
database/
  schema.sql              → Postgres tables
```

## Design decisions

**Monolithic architecture** - Everything in Next.js API routes. Microservices would be overkill for this.

**Supabase for database** - Didn't want to manage Postgres myself. Gets me auth and RLS for free.

**Web scraping instead of enrichment APIs** - Clearbit/FullContact are expensive. Scraping + GPT-4 is cheaper and works well enough.

**Synchronous processing** - Qualification blocks the UI right now. Would add Redis + Bull for background jobs in production.

## What's implemented

**Security**
- Environment validation (fails fast if keys missing)
- Input validation on all endpoints
- Custom error classes with proper status codes
- Structured logging

**Code quality**
- Full TypeScript with strict mode
- ESLint + Prettier
- Reusable middleware for auth and validation

**Testing**
- Jest + React Testing Library
- Unit tests for validation, errors, cache
- GitHub Actions runs tests on every PR

## What's missing (would add for production)

**Testing**
- Integration tests for API routes
- E2E tests with Playwright
- Higher coverage (currently ~40%)

**Infrastructure**
- Redis for caching (using in-memory now)
- Job queue for background processing
- Rate limiting

**Monitoring**
- Sentry for error tracking
- APM for performance
- Cost tracking per user

**Data enrichment**
- Replace scraping with Clearbit/FullContact
- More accurate company data

## Deployment

Easiest with Vercel:

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard. Keep using Supabase's hosted Postgres.

## Limitations

- Scraping fails on JavaScript-heavy sites (needs headless browser)
- No retry logic for OpenAI timeouts
- Synchronous qualification blocks UI
- No cost tracking

