import { getSiteUrl } from '@/lib/site';

export const revalidate = 86400;

/** GET /llms.txt — a plain description of Orion and its public data, for language-model tools. */
export function GET() {
  const site = getSiteUrl();
  const text = `# Orion

> Orion is a workspace for open source contributors: it finds issues that fit a person's skills, tracks each one until the pull request merges, and keeps open source program deadlines (GSoC, LFX Mentorship, Outreachy, Hacktoberfest and more) in view. Every list is a live, cached GitHub query; Orion never writes to GitHub.

## Pages

- [Discover](${site}/discover): issues, projects and program organizations, ranked by the user's skills.
- [Starter projects](${site}/starter): projects that curate newcomer tasks, merged from Up For Grabs, goodfirstissue.dev, Awesome for Beginners and For Good First Issue.
- [Collections](${site}/collections): projects grouped by domain (curated by OSS Insight), with live GitHub figures.
- [Rising repositories](${site}/trending): repositories created recently, ranked by stars, by language and topic.
- [Open source companies](${site}/companies): Y Combinator companies with open source products, and which are hiring.
- [Compare repositories](${site}/repos/compare?a={owner}/{repo}&b={owner}/{repo}): two contributor reports side by side.
- [Repository report](${site}/repos): whether a repository welcomes contributors (review speed, merge rate, activity, good first issues, community files). Per repository: ${site}/repos/{owner}/{repo}
- [Programs](${site}/events): tracked programs with countdowns, and a community directory of other programs. Per edition: ${site}/events/{slug}
- [Bounties](${site}/bounties): open issues with stated rewards.
- [Contributor profiles](${site}/u): merged pull requests and projects for any GitHub account. Per account: ${site}/u/{username}
- [Assistant](${site}/assistant): explains repositories and answers program questions, grounded in repository files and program data; can also search Stack Overflow, Wikipedia and Hacker News and cite them.
- [Resources](${site}/resources): guides, communities and perks for students and maintainers.
- [Perks for open source](${site}/perks): free plans, credits and programs for open source projects, refreshed daily from Awesome OSS Perks (CC0).
- [Community](${site}/community): discussions about programs, issues and shipped work. Anyone can read; members post.
- [Leaderboard](${site}/leaderboard): members who opted in, ranked by pull requests merged in the last 30 days.
- [Alerts](${site}/alerts): saved issue searches with new-match counts, browser notifications, an RSS feed each and an optional daily email (members).
- [Repo bot](${site}/repo-bot): builds a GitHub Actions workflow that welcomes first-time contributors, thanks them on merge and answers slash commands, running in the maintainer's own repository.
- [Support Orion](${site}/support): Orion is free with no paid plan; ways to help.

## Data, as JSON or feeds

- ${site}/api/programs: tracked program editions with dates and their source (official or usual schedule), plus the community program directory.
- ${site}/api/events: program editions and upcoming deadlines.
- ${site}/calendar.ics: every tracked program's key dates as an iCalendar feed.
- ${site}/feed.xml: upcoming program deadlines as RSS.
- ${site}/feed/issues.xml?repos={owner}/{repo},{owner}/{repo}&labels={label}: new open issues in chosen repositories as RSS (add &daily=1 for one issue a day).
- ${site}/feed/alerts.xml?preset={good-first|help-wanted|first-timers|docs|unassigned|all}&language={language}&labels={a,b}&repos={owner/repo,…}&q={keywords}&stars={min}: any issue search as RSS.

## For agents (MCP)

- ${site}/api/mcp: a Model Context Protocol server (Streamable HTTP, no sign-in). Read-only tools: find_issues, list_programs, rising_repos, starter_projects, find_bounties, gsoc_organizations, repo_report and contribution_guides.
- ${site}/.well-known/mcp.json: its discovery card.
- In browsers with WebMCP (navigator.modelContext), every page registers the same tools plus open_orion_page.

## Where the data comes from

- GitHub REST and Search APIs: issues, repositories, pull requests, bounties.
- Google Summer of Code's public program API: GSoC dates, organizations and their history since 2016.
- LFX Mentorship's public project index: open mentorships and term dates.
- Outreachy's published round schedule; Social Winter of Code's and GirlScript Summer of Code's own sites; the MLH Fellowship's application form.
- Up For Grabs, goodfirstissue.dev, Awesome for Beginners and For Good First Issue (starter projects); OSS Insight (collections); yc-oss (companies).
- The community-maintained List of Open Source Programs (Apache-2.0): https://github.com/yashisrani/List-of-OpenSource-Programs
`;
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400' },
  });
}
