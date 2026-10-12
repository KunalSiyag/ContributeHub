# How Orion compares

This page lists what other tools for open source contributors offer and where each capability lives in Orion. It
also says what Orion leaves out on purpose, and where Orion's data comes from so that no list is maintained by hand.

Each tool was checked on 11 and 12 October 2026 against its own site: pages, `llms.txt`, sitemap and published
API or data files (links below). These products change, so re-check a row before relying on it.

## Tools compared

| Tool | What it is | Checked |
|---|---|---|
| [Ossium](https://ossium.in) | All-in-one helper: trending repositories, issues, GSoC, programs, bounties, contributors, YC companies, forum, the Ossistant assistant, alerts, Selfbot and Premium | [llms.txt](https://ossium.in/llms.txt), [llms-full.txt](https://ossium.in/llms-full.txt), [sitemap](https://ossium.in/sitemap.xml), [openapi.json](https://ossium.in/openapi.json), [mcp.json](https://ossium.in/.well-known/mcp.json) |
| [goodfirstissue.dev](https://goodfirstissue.dev) | Good first issues from popular projects, by language | Home page; [repository list](https://github.com/deepsourcelabs/good-first-issue/blob/master/data/repositories.toml) |
| [Up For Grabs](https://up-for-grabs.net) | Projects that curate tasks for new contributors, each with its own label | Home page; [projects.json](https://up-for-grabs.net/javascripts/projects.json) |
| [For Good First Issue](https://forgoodfirstissue.dev) | Accessible issues from social-impact projects, tagged with the UN Sustainable Development Goals | Home page; [generated.json](https://github.com/github/forgoodfirstissue/blob/main/generated.json) (MIT) |
| [Awesome for Beginners](https://github.com/MunGell/awesome-for-beginners) | Beginner-friendly projects by technology | [data.json](https://github.com/MunGell/awesome-for-beginners/blob/main/data.json) |
| [CodeTriage](https://www.codetriage.com) | Subscribe to repositories and get one open issue a day by email | Home page |
| [OSS Insight](https://ossinsight.io) | GitHub analytics: repository analysis, comparison, collections, trending, a natural-language data explorer and an agent API | Home page, [llms.txt](https://ossinsight.io/llms.txt) |
| [GSoC Organizations](https://www.gsocorganizations.dev) | Every Google Summer of Code organization with filters and yearly history | Home page |
| [First Contributions](https://firstcontributions.github.io) | Step-by-step tutorial for a first pull request to a practice repository | Home page |
| [Algora](https://algora.io) | Bounties on open source issues, now mainly hiring open source engineers, plus coding challenges | Home page |

## Capability by capability

| Capability | Offered by | In Orion |
|---|---|---|
| Issues for newcomers, by language | Ossium, goodfirstissue.dev, For Good First Issue | `/discover`: good first issue, help wanted, first-timers-only, documentation and unassigned presets, ranked by your skills; `/resume` ranks issues against a résumé |
| Projects that curate newcomer tasks | Up For Grabs, goodfirstissue.dev, Awesome for Beginners, For Good First Issue | `/starter`, merged daily from all four lists; each project links to issues under its own starter label |
| Social-impact projects | For Good First Issue | `/starter`, "social good" tag, plus a tag for each Sustainable Development Goal |
| One issue a day from chosen repositories | CodeTriage (email) | Tracker → Repositories → Today's pick, and `/feed/issues.xml?repos=…&daily=1` as RSS |
| New issues from a chosen list of repositories | Ossium (custom issue timelines) | Tracker → Repositories watchlist, and `/feed/issues.xml?repos=…&labels=…` |
| Track issues until the pull request merges | Ossium (tracked issues) | `/issues`: board and list, drag and drop, notes, add any issue by URL; `/dashboard` |
| Bookmarked repositories | Ossium | Save on any repository row; listed under Tracker → Repositories |
| Trending or rising repositories | Ossium, OSS Insight | `/trending`: new repositories gaining stars this week, month or year, by language and topic, with a help-wanted filter |
| Web3 projects | Ossium (Web3 page) | `/trending?topic=web3`, and OSS Insight's Web3 collection in `/collections` |
| Collections by domain | OSS Insight | `/collections`, `/collections/:id`, with live GitHub figures |
| Repository analysis | Ossium (Repolyze), OSS Insight | `/repos/:owner/:repo`: contributor score out of 100 from review speed, merge rate, activity, maintainers, starter issues and community files |
| Compare two repositories | OSS Insight | `/repos/compare` |
| Getting a project listed | Ossium (eligibility review) | Repository reports → "Maintain this repository?": links to the repo bot and to the three starter lists that feed Orion; labelling issues `good first issue` is enough for Discover and alerts. No review queue |
| Searching in plain language | OSS Insight (Data Explorer, natural language to SQL) | Discover → "Describe what you want instead": a sentence becomes a GitHub issue search (preset, language, keywords, labels, star floor), shown as the query it runs (needs the Gemini key) |
| GSoC organizations with filters and history | Ossium, GSoC Organizations | `/discover` → Organizations: Google's official roster with logos, ideas pages and every year since 2016 each took part; the GSoC program page |
| Programs with deadlines | Ossium | `/events`: tracked programs with countdowns, key dates and where the dates come from, plus a directory of 25+ more programs |
| Deadlines in a calendar or feed reader | None of the above | `/calendar.ics`, `/feed.xml` |
| Bounties | Ossium, Algora | `/bounties`: GitHub and Algora bounties with search, claim status, an established-repository filter, sorting by reward, recency or discussion, and how to claim. Ossium's bounty API returns the same kind of GitHub and Algora issues; its difficulty, estimated-hours and expiry fields were defaults or empty on every listing checked (12 October 2026) |
| Contributor profiles | Ossium, OSS Insight | `/u/:username`: merged pull requests, projects, languages and the contribution calendar |
| Leaderboard | Ossium (contributors: search, merged pull requests, commits, a score) | `/leaderboard`: members who opt in from Preferences, with search; pull requests merged in the last 30 days, and with a GitHub token also merged all time, pull requests and issues, ranked by month or all time |
| Open source companies backed by Y Combinator | Ossium (search, batches) | `/companies`: search, YC batch year, industry, active or all, and which are hiring |
| Forum | Ossium (posts with likes, dislikes, reposts, an image and an organization) | `/community`: programs, help, showcase and general threads with replies; likes and dislikes (one per member), Share for reposting a link, images from GitHub or Imgur, and an optional related repository or organization; anyone can read, members post |
| AI assistant | Ossium (Ossistant) | `/assistant`: explains a repository from its README, layout, manifests and contributing guide, and answers program questions from Orion's live dates |
| Guides and learning paths | Ossium, First Contributions | `/resources`: guided paths and a library; First Contributions is the practice step of the first path |
| Community writing | Ossium (blog) | `/resources` → Fresh from DEV: the week's most-liked #opensource posts, refreshed every six hours |
| Repository bot: welcome and goodbye messages, slash commands | Ossium (GitHub Selfbot) | `/repo-bot`: builds a GitHub Actions workflow the maintainer commits; it greets first issues and pull requests, thanks on merge, says goodbye when a pull request closes unmerged and answers commands like `/guide`, removing the command comment. It posts as github-actions[bot], or as the maintainer once they add their own token as a repository secret |
| Perks for contributors | Ossium | `/resources` → Perks: 17 offers, each checked by hand |
| Alerts for matching issues | Ossium (account alerts, "advanced alert rules" in Premium), CodeTriage (email) | `/alerts`: up to ten saved searches per member, with new-match counts in the sidebar, browser notifications, an RSS feed each and an optional daily email digest; Discover's "Create alert" starts one from any search |
| Access for AI agents | Ossium (MCP, WebMCP), OSS Insight (agent API) | `/api/mcp`: a Model Context Protocol server with 8 read-only tools, `/.well-known/mcp.json` and `/llms.txt`; in browsers with WebMCP, every page registers the same tools plus `open_orion_page` |
| Public data API | Ossium, OSS Insight | `/api/programs`, `/api/events` |

## Left out on purpose

| Capability | Offered by | Why Orion doesn't |
|---|---|---|
| A paid plan | Ossium (Premium, ₹149 a month) | The project owner chose on 13 October 2026 to keep every feature free. Ossium's premium page names no specific perks (checked 12 October 2026), and the extras its llms-full.txt mentions (advanced alert rules, priority support, early access) are covered free by `/alerts` and `/community`. `/support` offers sponsorship instead. |
| A bot that posts from Orion's servers | Ossium (GitHub Selfbot) | The project owner chose the workflow bot on 13 October 2026 (`/repo-bot`): it sends the same welcome, thank-you and goodbye messages and answers the same commands, and it can post as the maintainer with their own token. Because it runs in each maintainer's repository, Orion never holds write access to anyone's code. |
| Claiming and verifying a repository | Ossium (verified badge) | Repository reports come from public GitHub data anyone can check, so there is nothing to claim; maintainers get their own panel on each report instead. |
| Paywalled articles | Ossium (Premium Medium posts) | Orion has no paid plan, and its reading list links to free community writing instead. |
| SQL over the full GitHub event archive, company analytics | OSS Insight | These need OSS Insight's warehouse of every GitHub event; Orion searches GitHub live instead, including in plain language. |
| Hiring marketplace and coding challenges | Algora | Hiring is outside Orion's scope, and challenges have no public feed. Algora bounties do appear in `/bounties`. |

## No longer comparable

| Tool | Status when checked (11–12 October 2026) |
|---|---|
| OpenSauced | Site unreachable |
| issuehub.io | Domain serves unrelated content |
| IssueHunt | Now a security bug-bounty platform in Japan |
| Opire | Site unreachable |
| goodfirstissues.com | Server error (Cloudflare 521) |
| Ossium marketplace | Its API (`/api/marketplace`) returned an error (503) on 12 October 2026, and its documentation does not describe it |

## Where Orion's data comes from

Every list is read from a published source and cached. Nothing in this table is typed in by hand except the last row.

| Data | Source | Refreshed |
|---|---|---|
| GSoC dates, organizations and their history | Google's GSoC program API | Every 6 hours (dates), daily (organizations) |
| LFX Mentorship terms and open mentorships | LFX's public project index | Every 6 hours |
| Outreachy round | Outreachy's applicant guide | Every 12 hours |
| Social Winter of Code, GirlScript Summer of Code and MLH Fellowship dates | Each program's own site (SWoC key dates, GSSoC timeline, MLH application form) | Every 12 hours |
| 25+ more programs, such as Season of KDE and Summer of Bitcoin | [List of Open Source Programs](https://github.com/yashisrani/List-of-OpenSource-Programs) (Apache-2.0) | Every 6 hours |
| A year a program hasn't announced yet | Last year's published dates, marked "Expected" | With the sources above |
| Hacktoberfest and 24 Pull Requests | Fixed calendar: October, and 1–24 December | Not needed |
| Starter projects | Up For Grabs, goodfirstissue.dev, Awesome for Beginners, For Good First Issue | Daily |
| Collections | OSS Insight API | Daily |
| Companies | [yc-oss](https://github.com/yc-oss/api) open source tag | Daily |
| Community writing | DEV's public API, posts tagged #opensource | Every 6 hours |
| Issues, repositories, bounties, profiles, reports | GitHub REST and Search APIs | 5 minutes to 6 hours, by page |
| Guides and perks | Checked by hand (`RESOURCES_REVIEWED` in `src/lib/resources.ts`), because no feed exists | When reviewed |

A cohort that a program hasn't listed yet, such as an MLH term that isn't on the application form, follows the
program's usual pattern and is labelled that way.
