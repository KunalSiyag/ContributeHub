# Orion

A workspace for open source contributors. Find issues that fit your stack, track each one until the pull
request merges, and keep every program deadline (GSoC, GSSoC, Hacktoberfest, Outreachy, LFX, MLH Fellowship)
in view. Every list in Orion is a live, cached GitHub query.

## What's inside

| Area | Route | What it does |
|---|---|---|
| Home | `/` | Live counts from GitHub, a preview of the tracker, program countdowns, this year's GSoC organizations, fresh good first issues and bounties |
| Discover | `/discover` | Search issues, repositories and program organizations (the official GSoC roster with logos, project ideas and every year since 2016 each took part); results ranked by your skills. Describe what you want in a sentence and the AI turns it into filters (needs a Gemini key); "Create alert" and RSS follow any search |
| Starter projects | `/starter` | Projects that set aside newcomer tasks, merged daily from Up For Grabs, goodfirstissue.dev, Awesome for Beginners and For Good First Issue (social-impact projects), with live GitHub figures |
| Collections | `/collections`, `/collections/:id` | Projects grouped by domain (OSS Insight's collections), with live GitHub figures |
| Open source companies | `/companies` | Y Combinator companies with open source products (yc-oss): search, batch year, industry, and which are hiring |
| Rising repositories | `/trending` | New repositories gaining stars fastest this week, month or year, by language and topic (AI, Web3, developer tools…) |
| Repository report | `/repos`, `/repos/:owner/:repo`, `/repos/compare` | Whether a project welcomes contributors: review speed, merge rate, activity, maintainers, good first issues and community files, scored out of 100; two side by side; a panel for maintainers on getting listed and welcoming contributors |
| Contributor profile | `/u`, `/u/:username` | Merged pull requests, projects contributed to, languages and the contribution calendar for any GitHub account |
| Assistant | `/assistant` | Explains any repository from its README, layout, manifests and contributing guide, and answers program questions from Orion's live dates (needs a Gemini key) |
| Issue detail | `/issues/:owner/:repo/:number` | Rendered issue, repository facts, a contributor checklist and an optional AI approach draft |
| Tracker | `/issues` | Board and list of tracked issues (Saved → Working → PR open → Merged) with drag and drop, notes, add-by-URL for any GitHub issue, saved repositories with a watchlist of their new issues |
| Command palette | ⌘K / Ctrl K | Jump to any page, tracked issue or program, or search GitHub issues |
| Overview | `/dashboard` | Pipeline counts, next deadlines, GitHub pull requests and contribution calendar, recommendations |
| Programs | `/events`, `/events/:slug` | Countdowns, a 12-month timeline and key dates (official for GSoC, LFX and Outreachy), open LFX mentorships, live program issues, and a directory of 25+ more programs |
| Bounties | `/bounties` | Open issues with a stated reward, filterable by source, language and claim status; reposts and brand-new repositories are hidden by default |
| Resources | `/resources` | Guided paths, a curated library and perks for students and maintainers |
| Community | `/community` | Discussions about programs, getting unstuck and shipped work, with replies, likes and dislikes, sharing, images from GitHub or Imgur and a related repository; anyone can read, members post (needs migrations 07 and 09) |
| Leaderboard | `/leaderboard` | Members who opt in from Preferences, with search, ranked by pull requests merged this month or (with `GITHUB_TOKEN`) all time, plus pull requests and issues (needs migration 07) |
| Alerts | `/alerts` | Saved issue searches: new-match counts in the sidebar, browser notifications, an RSS feed each (`/feed/alerts.xml`) and an optional daily email digest (needs migration 08; email needs the variables below). Discover's "Create alert" starts one from any search |
| Repo bot | `/repo-bot` | For maintainers: builds a GitHub Actions workflow that welcomes first-time contributors, thanks them on merge, says goodbye on closed pull requests and answers slash commands like `/guide`, posting as github-actions[bot] or as the maintainer |
| Support | `/support` | Orion is free with no paid plan; ways to help, and a sponsor link when `NEXT_PUBLIC_SPONSOR_URL` is set |
| Feeds and API | `/calendar.ics`, `/feed.xml`, `/feed/issues.xml`, `/api/programs`, `/llms.txt` | Subscribe to every deadline in a calendar, follow new issues in chosen repositories by RSS, or read program data as JSON |
| MCP server | `/api/mcp`, `/.well-known/mcp.json` | Read-only tools for AI agents: find issues, programs and deadlines, rising repositories, starter projects, bounties, GSoC organizations, repository reports and guides. In browsers with WebMCP (`navigator.modelContext`), every page offers the same tools |
| Resume match | `/resume` | Extract skills from a PDF/DOCX resume and get ranked issue matches |
| Preferences | `/preferences` | Languages, tools, interests and experience level that drive matching |

## Stack

- Next.js 16 (App Router, Turbopack) and React 19, TypeScript
- CSS Modules on a token-based design system (`src/app/globals.css`, documented in `docs/DESIGN.md`)
- Supabase: GitHub and Google OAuth (PKCE, cookie sessions via `@supabase/ssr`), Postgres with row level security
- GitHub REST and Search APIs through one cached, rate-limit-aware client (`src/lib/github.ts`)
- Optional Google Gemini (REST) for resume extraction and issue approach drafts

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | for accounts | Supabase project URL. Without it, public pages work and sign-in is disabled. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for accounts | Supabase anon key |
| `GITHUB_TOKEN` | strongly recommended | A classic token with no scopes, or a fine-grained token with public read-only access. Raises GitHub search from 10 to 30 requests/min and core calls from 60 to 5,000/hour, and enables the GraphQL contribution calendar. |
| `GOOGLE_GEMINI_API_KEY` | optional | Enables AI features. They stay hidden unless the key works. |
| `GEMINI_MODEL` | optional | Defaults to `gemini-3.5-flash-lite` |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only, for aggregate reads, alert email digests and unsubscribe links |
| `NEXT_PUBLIC_SITE_URL` | production | Absolute URL used in metadata, sitemap, RSS and emails |
| `RESEND_API_KEY`, `ALERTS_FROM_EMAIL` | for alert emails | Sends the daily alert digest through [Resend](https://resend.com) (`ALERTS_FROM_EMAIL` like `Orion <alerts@your-domain>`; set `ALERTS_EMAIL_API_URL` for another Resend-compatible API). With `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` set, members can turn on email per alert |
| `CRON_SECRET` | for alert emails | Vercel Cron sends it to `/api/cron/alert-digest` (daily at 07:00 UTC, in `vercel.json`); also signs unsubscribe links |
| `NEXT_PUBLIC_SPONSOR_URL` | optional | A GitHub Sponsors or Open Collective link for `/support`; the sponsor option stays hidden without it |

### Database

- **New Supabase project:** run `supabase/schema.sql` in the SQL editor.
- **Existing project from an earlier version:** run `supabase/migrations/05_orion_workspace.sql`, then
  `06_google_sign_in.sql`, then `07_community.sql` (the community forum: public reads, members post as
  themselves, an hourly cap per member; and the opt-in leaderboard), then `08_alerts.sql` (issue alerts:
  members see and change only their own, ten each), then `09_forum_reactions.sql` (likes and dislikes on
  discussions, one per member, and an optional related repository or organization). 05 adds the missing profile columns, fixes the signup trigger, backfills profiles,
  makes profiles readable only by their owner, adds the `saved_repos` update policy and closes the waitlist
  read policy. 06 keeps Google accounts out of the GitHub columns. Both are safe to run more than once.

### Sign-in

In Supabase → Authentication → URL Configuration, add `<your-site>/auth/callback` (and
`http://localhost:3000/**` while developing) to the redirect URLs. Then enable providers:

- **GitHub:** create an OAuth app at github.com/settings/developers with the callback
  `https://<project-ref>.supabase.co/auth/v1/callback`, and paste its client ID and secret into the GitHub provider.
- **Google:** in Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID
  (Web application) with the same callback as an authorized redirect URI, then paste its client ID and
  secret into the Google provider. Scopes stay at the defaults (email, profile).

The app reads which providers are enabled from Supabase, so the "Continue with Google" button appears on
its own once the provider is on. Google accounts can add their GitHub username in Preferences to see
pull requests and the contribution calendar.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
npm test         # Vitest: events and official program sources (GSoC, LFX, Outreachy, directory), bounties,
                 # matching, repository health, profiles, feeds, assistant Markdown, GitHub client, auth
                 # callback, identity, tracker state, toasts, stylesheet guards
```

## Project structure

```
src/
├── app/                  routes, API handlers, metadata (sitemap, robots, OG images, RSS)
│   └── api/              issues, repositories, bounties, organizations, github, resume, events
├── components/
│   ├── ui/               design-system primitives (buttons, fields, tabs, menu, dialog, toast)
│   ├── fx/               frames, section labels and effects (spotlight, beam, GSAP reveal and scroll tilt, count-up, marquee)
│   ├── home/             home page sections (star field, product preview, feature tabs, FAQ)
│   ├── auth/             sign-in dialog (GitHub and Google)
│   ├── shell/            app chrome: sidebar, marketing nav, footer, theme switch, account menu
│   └── *Row.tsx          list rows for issues, repositories, bounties, programs, organizations
├── contexts/             auth and workspace (tracked issues + saved repos, optimistic updates)
├── hooks/                skills, async data, live clock, auth providers, off-screen pause
├── lib/                  GitHub client, events engine, official program sources (GSoC, LFX, Outreachy), program
│                         directory, repository health, profiles, assistant, feeds, bounties, matching, Gemini
└── proxy.ts              refreshes the Supabase session cookie
docs/DESIGN.md            design system: tokens, rules, component inventory
supabase/                 schema and migrations
```

## How program dates work

Programs are defined as recurring templates in `src/lib/events.ts`. On each request the engine resolves the
current or next edition (including multi-cohort programs), computes its phase and next deadline, and keeps
older edition URLs such as `/events/gsoc-2026` working after a rollover.

Where a program publishes its dates, they replace the template, per edition or per cohort, and the edition is
marked "Official dates":

- **Google Summer of Code:** `src/lib/gsoc.ts` reads Google's public program API (milestones every 6 hours,
  organizations every 24, and the archive back to 2016 for each organization's history).
- **LFX Mentorship:** `src/lib/lfx.ts` reads LFX's public project index: the open mentorships, and each term's
  application and work dates (the dates most projects agree on win).
- **Outreachy:** `src/lib/outreachy.ts` reads the round schedule Outreachy publishes in its applicant guide,
  including the final application deadline and the results days.
- **Social Winter of Code, GirlScript Summer of Code and the MLH Fellowship:** `src/lib/program-sites.ts` reads
  the dates each publishes on its own site: SWoC's key dates, GSSoC's milestone timeline, and the terms and
  application deadlines on the MLH Fellowship's application form.
- **Everything else in the community list:** `src/lib/program-directory.ts` turns the dated events of the
  [List of Open Source Programs](https://github.com/yashisrani/List-of-OpenSource-Programs) into programs of
  their own (Season of KDE, Summer of Bitcoin…), marked "Community dates".

A year a program hasn't announced yet repeats last year's published dates, marked "Expected", until the program
publishes new ones. `src/lib/programs.server.ts` combines the sources; anything unreachable leaves the template in
place, so the page never breaks. Only Hacktoberfest (October) and 24 Pull Requests (1–24 December) stay on
calendar rules, because they run on the same days every year; a cohort a program hasn't listed yet follows its
usual pattern. Always confirm on the official site before applying.

## Where the data comes from

| Source | What |
|---|---|
| GitHub, live and cached | Issues, repositories, bounties, pull requests and the contribution calendar, recommendations, organization stats |
| Google, live and cached | GSoC dates, accepted organizations, logos, project idea links and participation since 2016 |
| LFX and Outreachy, live and cached | LFX open mentorships and term dates; Outreachy's current round schedule |
| Program sites, live and cached | Social Winter of Code's, GirlScript Summer of Code's and the MLH Fellowship's published dates; a year a program hasn't announced yet repeats last year's dates, marked "expected" |
| Starter lists, live and cached | [Up For Grabs](https://up-for-grabs.net), [goodfirstissue.dev](https://goodfirstissue.dev), [Awesome for Beginners](https://github.com/MunGell/awesome-for-beginners) and [For Good First Issue](https://forgoodfirstissue.dev) |
| OSS Insight and yc-oss, live and cached | Collections of projects by domain; Y Combinator companies with open source products |
| Community list, live and cached | 25+ more programs with timelines, stipends and eligibility ([List of Open Source Programs](https://github.com/yashisrani/List-of-OpenSource-Programs), Apache-2.0) |
| Gemini (optional) | Assistant answers, résumé extraction and issue approach drafts |
| Supabase | Your tracker, notes, skills and saved repositories |
| Curated in code | Fallback date rules for programs without an official feed, the non-GSoC organization rosters, the Resources library and perks |

Bounties are filtered before they are shown: re-posted listings from aggregator repositories are dropped, and
by default bounties from repositories with fewer than 10 stars are hidden (`ESTABLISHED_STARS` in
`src/lib/bounties.ts`); switch off "Established repos only" to see them.

## How Orion compares

`docs/FEATURES.md` maps what Ossium, goodfirstissue.dev, Up For Grabs, CodeTriage, OSS Insight, GSoC
Organizations, Algora and others offer to the Orion route that covers it, and explains what Orion leaves out.

## Contributing

Pull requests are welcome. Read `docs/DESIGN.md` before changing UI: it lists the tokens, the rules and the
components to reuse.
