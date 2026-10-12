import 'server-only';
import { parseRepoInput } from '@/app/repos/repo-input';
import { sortBounties } from './bounties';
import { fetchBounties } from './bounties.server';
import { getAllEvents } from './events';
import { buildIssueQuery, GitHubError, repoFullName, searchIssues, searchRepositories } from './github';
import { getCurrentGsocProgram, getGsocOrganizations } from './gsoc';
import { ToolError, type McpTool, type ToolArgs } from './mcp';
import { datesBasis } from './program-display';
import { getOfficialSchedules } from './programs.server';
import { getRepoHealth, healthChecks, healthScore } from './repo-health';
import { RESOURCE_CATEGORIES, RESOURCES, type ResourceCategory } from './resources';
import { getSiteUrl } from './site';
import { getStarterProjects, starterIssuesUrl } from './starter-projects';

export const MCP_INSTRUCTIONS =
  'Orion helps people contribute to open source. Use these tools to find issues that welcome newcomers, ' +
  'programs and their deadlines (GSoC, Outreachy, LFX Mentorship, GSSoC, Hacktoberfest and more), paid bounties, ' +
  'rising repositories and projects that curate starter tasks, and to judge how welcoming a repository is. ' +
  'Every tool reads public data from GitHub and the programs; nothing is written anywhere. Results link to Orion pages.';

/* Argument readers: lenient about types agents commonly send, strict about meaning. */

function text(args: ToolArgs, key: string, max = 100): string | undefined {
  const value = args[key];
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') throw new ToolError(`${key} must be a string.`);
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, max) || undefined;
}

function whole(args: ToolArgs, key: string, min: number, max: number, fallback: number): number {
  const value = args[key];
  if (value == null || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new ToolError(`${key} must be a number.`);
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function oneOf<T extends string>(args: ToolArgs, key: string, allowed: readonly T[], fallback: T): T {
  const value = args[key];
  if (value == null || value === '') return fallback;
  const match = allowed.find(option => option === String(value).toLowerCase());
  if (!match) throw new ToolError(`${key} must be one of: ${allowed.join(', ')}.`);
  return match;
}

/** GitHub failures, worded for the model. */
function github(error: unknown): never {
  if (error instanceof ToolError) throw error;
  if (error instanceof GitHubError && error.rateLimited) throw new ToolError('GitHub is rate limiting Orion right now. Try again in a minute.');
  if (error instanceof GitHubError && error.status === 404) throw new ToolError('Not found on GitHub.');
  if (error instanceof GitHubError && error.status === 422) throw new ToolError('GitHub could not run that search. Try simpler words or another language name.');
  throw new ToolError('GitHub could not be reached. Try again shortly.');
}

const limitSchema = (max: number, fallback: number) => ({ type: 'integer', minimum: 1, maximum: max, default: fallback });
const day = (iso: string | undefined | null) => (iso ? iso.slice(0, 10) : null);

const ISSUE_PRESETS = ['good-first', 'help-wanted', 'first-timers', 'docs', 'unassigned'] as const;
const PROGRAM_STATUSES = ['all', 'applications-open', 'upcoming', 'running'] as const;
const WINDOWS = { week: { days: 7, minStars: 10 }, month: { days: 30, minStars: 25 }, year: { days: 365, minStars: 100 } };
const BOUNTY_SOURCES = ['all', 'github', 'algora'] as const;
const GUIDE_CATEGORIES = RESOURCE_CATEGORIES.map(c => c.id);

export function mcpTools(site = getSiteUrl()): McpTool[] {
  return [
    {
      name: 'find_issues',
      title: 'Find issues to work on',
      description:
        'Open, unassigned GitHub issues that welcome outside contributors, most recently updated first. Presets: good-first ("good first issue"), help-wanted, first-timers ("first-timers-only"), docs ("documentation") and unassigned (any label).',
      inputSchema: {
        type: 'object',
        properties: {
          preset: { type: 'string', enum: [...ISSUE_PRESETS], default: 'good-first' },
          language: { type: 'string', description: 'GitHub language name, such as TypeScript or Python.' },
          text: { type: 'string', description: 'Words to look for in titles and descriptions.' },
          minStars: { type: 'integer', minimum: 0, description: 'Only repositories with at least this many stars.' },
          limit: limitSchema(25, 10),
        },
        additionalProperties: false,
      },
      async run(args) {
        const query = buildIssueQuery({
          preset: oneOf(args, 'preset', ISSUE_PRESETS, 'good-first'),
          language: text(args, 'language', 40),
          text: text(args, 'text', 120),
          minStars: whole(args, 'minStars', 0, 1_000_000, 0),
        });
        const data = await searchIssues(query, { sort: 'updated', perPage: whole(args, 'limit', 1, 25, 10), revalidate: 600 }).catch(github);
        return {
          query,
          total: data.total_count,
          issues: data.items.map(issue => {
            const repository = repoFullName(issue.repository_url);
            return {
              title: issue.title,
              repository,
              url: issue.html_url,
              orion: `${site}/issues/${repository}/${issue.number}`,
              labels: issue.labels.map(label => label.name),
              comments: issue.comments,
              updated: day(issue.updated_at),
            };
          }),
        };
      },
    },
    {
      name: 'list_programs',
      title: 'Programs and deadlines',
      description:
        'Open source programs and events (GSoC, Outreachy, LFX Mentorship, GSSoC, SWoC, Hacktoberfest, MLH Fellowship and programs found in a community directory) with their current dates, next deadline and where the dates come from: official, community, expected (last year repeated) or usual pattern.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: [...PROGRAM_STATUSES], default: 'all', description: 'upcoming means applications have not opened yet.' },
          paidOnly: { type: 'boolean', default: false, description: 'Only programs that pay a stipend or prizes.' },
        },
        additionalProperties: false,
      },
      async run(args) {
        const status = oneOf(args, 'status', PROGRAM_STATUSES, 'all');
        const paidOnly = args.paidOnly === true || args.paidOnly === 'true';
        const phase = status === 'upcoming' ? 'pre-announcement' : status;
        const events = getAllEvents(new Date(), await getOfficialSchedules())
          .filter(event => (phase === 'all' || event.phase === phase) && (!paidOnly || event.isPaid))
          .sort((a, b) => (a.nextDeadline?.date ?? '9999').localeCompare(b.nextDeadline?.date ?? '9999'));
        return {
          programs: events.map(event => {
            const basis = datesBasis(event);
            return {
              name: event.name,
              organizer: event.organizer,
              phase: event.phase ?? null,
              paid: event.isPaid,
              applicationsOpen: day(event.applicationStart),
              applicationDeadline: day(event.applicationDeadline),
              programStart: day(event.contributionStart),
              programEnd: day(event.contributionEnd),
              nextDeadline: event.nextDeadline ? { label: event.nextDeadline.label, date: day(event.nextDeadline.date) } : null,
              dates: { basis: basis.kind, note: basis.sentence, source: basis.url ?? null },
              website: event.website,
              orion: `${site}/events/${event.slug}`,
            };
          }),
        };
      },
    },
    {
      name: 'rising_repos',
      title: 'Rising repositories',
      description: 'New repositories gaining stars fastest in the last week, month or year, optionally by language or GitHub topic (for example llm, web3, developer-tools).',
      inputSchema: {
        type: 'object',
        properties: {
          window: { type: 'string', enum: Object.keys(WINDOWS), default: 'week' },
          language: { type: 'string' },
          topic: { type: 'string', description: 'A GitHub topic, such as ai-agents or web3.' },
          helpWanted: { type: 'boolean', default: false, description: 'Only repositories with open help-wanted issues.' },
          limit: limitSchema(30, 10),
        },
        additionalProperties: false,
      },
      async run(args) {
        const window = WINDOWS[oneOf(args, 'window', ['week', 'month', 'year'] as const, 'week')];
        const language = text(args, 'language', 40)?.replace(/"/g, '');
        const topic = text(args, 'topic', 50)?.toLowerCase();
        if (topic && !/^[a-z0-9][a-z0-9-]*$/.test(topic)) throw new ToolError('topic must be a GitHub topic: lowercase letters, numbers and hyphens.');
        const since = new Date(Date.now() - window.days * 86_400_000).toISOString().slice(0, 10);
        const query = [
          `created:>=${since}`,
          `stars:>=${window.minStars}`,
          language && `language:"${language}"`,
          topic && `topic:${topic}`,
          (args.helpWanted === true || args.helpWanted === 'true') && 'help-wanted-issues:>0',
          'archived:false',
        ]
          .filter(Boolean)
          .join(' ');
        const data = await searchRepositories(query, { sort: 'stars', perPage: whole(args, 'limit', 1, 30, 10), revalidate: 1800 }).catch(github);
        return {
          query,
          repositories: data.items.map(repo => ({
            repository: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            language: repo.language,
            created: day(repo.created_at),
            url: repo.html_url,
            orion: `${site}/repos/${repo.full_name}`,
          })),
        };
      },
    },
    {
      name: 'starter_projects',
      title: 'Projects with starter tasks',
      description:
        'Projects that label tasks for newcomers, merged from Up For Grabs, goodfirstissue.dev, Awesome for Beginners and For Good First Issue (social-impact projects). Search by words or filter by tag, such as python or "social good".',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          tag: { type: 'string' },
          limit: limitSchema(50, 15),
        },
        additionalProperties: false,
      },
      async run(args) {
        const needle = text(args, 'query', 80)?.toLowerCase();
        const tag = text(args, 'tag', 40)?.toLowerCase();
        const matches = (await getStarterProjects()).filter(
          project =>
            (!tag || project.tags.includes(tag)) &&
            (!needle || [project.repo, project.name, project.description, ...project.tags].some(value => value.toLowerCase().includes(needle)))
        );
        return {
          total: matches.length,
          projects: matches.slice(0, whole(args, 'limit', 1, 50, 15)).map(project => ({
            repository: project.repo,
            description: project.description || null,
            starterLabel: project.label,
            tags: project.tags,
            lists: project.sources,
            starterIssues: starterIssuesUrl(project),
            orion: `${site}/repos/${project.repo}`,
          })),
        };
      },
    },
    {
      name: 'find_bounties',
      title: 'Paid bounties',
      description: 'Open issues with a cash bounty on GitHub or Algora, largest first. Amounts are as posted; check the issue before starting.',
      inputSchema: {
        type: 'object',
        properties: {
          language: { type: 'string' },
          source: { type: 'string', enum: [...BOUNTY_SOURCES], default: 'all' },
          limit: limitSchema(30, 10),
        },
        additionalProperties: false,
      },
      async run(args) {
        const { bounties, partial } = await fetchBounties({
          source: oneOf(args, 'source', BOUNTY_SOURCES, 'all'),
          language: text(args, 'language', 40),
        }).catch(github);
        return {
          incomplete: partial,
          bounties: sortBounties(bounties, 'amount')
            .slice(0, whole(args, 'limit', 1, 30, 10))
            .map(bounty => ({
              title: bounty.title,
              repository: bounty.repo,
              amount: bounty.bountyAmount,
              source: bounty.source,
              url: bounty.url,
              assignees: bounty.assignees,
              comments: bounty.comments,
              updated: day(bounty.updatedAt ?? bounty.createdAt),
            })),
        };
      },
    },
    {
      name: 'gsoc_organizations',
      title: 'GSoC organizations',
      description: "Organizations in the current or latest Google Summer of Code, as Google publishes them, filtered by name, technology or topic.",
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words in the name or tagline.' },
          technology: { type: 'string', description: 'Such as python, rust or javascript.' },
          topic: { type: 'string', description: 'Such as machine learning or web.' },
          limit: limitSchema(50, 20),
        },
        additionalProperties: false,
      },
      async run(args) {
        const program = await getCurrentGsocProgram();
        if (!program) throw new ToolError('Google’s GSoC data is unavailable right now. Try again later.');
        const needle = text(args, 'query', 80)?.toLowerCase();
        const technology = text(args, 'technology', 40)?.toLowerCase();
        const topic = text(args, 'topic', 40)?.toLowerCase();
        const orgs = (await getGsocOrganizations(program.year)).filter(
          org =>
            (!needle || `${org.name} ${org.tagline}`.toLowerCase().includes(needle)) &&
            (!technology || org.tech.some(t => t.toLowerCase().includes(technology))) &&
            (!topic || [...org.topics, ...org.categories].some(t => t.toLowerCase().includes(topic)))
        );
        return {
          year: program.year,
          total: orgs.length,
          organizations: orgs.slice(0, whole(args, 'limit', 1, 50, 20)).map(org => ({
            name: org.name,
            tagline: org.tagline,
            technologies: org.tech,
            topics: org.topics,
            ideas: org.ideas,
            sourceCode: org.sourceCode,
            gsocPage: org.url,
          })),
        };
      },
    },
    {
      name: 'repo_report',
      title: 'Contributor report for a repository',
      description:
        'How welcoming a GitHub repository is to outside contributors: a 0–100 score, the checks behind it (contributing guide, code of conduct, labelled starter issues, review speed, recent activity, bus factor) and key figures.',
      inputSchema: {
        type: 'object',
        properties: { repository: { type: 'string', description: 'owner/name or a GitHub URL.' } },
        required: ['repository'],
        additionalProperties: false,
      },
      async run(args) {
        const parsed = parseRepoInput(text(args, 'repository', 200) ?? '');
        if (!parsed) throw new ToolError('repository must look like owner/name or a GitHub URL.');
        const health = await getRepoHealth(parsed.owner, parsed.repo).catch(github);
        const checks = healthChecks(health);
        return {
          repository: health.repo.full_name,
          description: health.repo.description,
          stars: health.repo.stargazers_count,
          score: healthScore(checks),
          checks: checks.map(check => ({ check: check.label, ok: check.ok, detail: check.detail })),
          figures: {
            medianHoursToMerge: health.pulls?.medianMergeHours == null ? null : Math.round(health.pulls.medianMergeHours),
            recentPullRequestsMerged: health.pulls ? `${health.pulls.mergedRecently} of ${health.pulls.closedRecently}` : null,
            goodFirstIssuesUnassigned: health.issues.goodFirstUnassigned,
            helpWantedIssues: health.issues.helpWanted,
            medianDaysToCloseIssue: health.issues.medianCloseDays == null ? null : Math.round(health.issues.medianCloseDays * 10) / 10,
            commitsLastFourWeeks: health.weeklyCommits ? health.weeklyCommits.slice(-4).reduce((a, b) => a + b, 0) : null,
            topContributorShare: health.topContributorShare == null ? null : Math.round(health.topContributorShare * 100) / 100,
            languages: health.languages.slice(0, 3).map(l => l.name),
            latestRelease: health.latestRelease,
          },
          orion: `${site}/repos/${health.repo.full_name}`,
        };
      },
    },
    {
      name: 'contribution_guides',
      title: 'Guides and perks',
      description: `Hand-checked guides for contributing (Git, pull requests, licensing, programs, careers) and perks for open source contributors. Categories: ${GUIDE_CATEGORIES.join(', ')}.`,
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: GUIDE_CATEGORIES },
          query: { type: 'string' },
          limit: limitSchema(40, 15),
        },
        additionalProperties: false,
      },
      async run(args) {
        const category = args.category == null || args.category === '' ? undefined : oneOf(args, 'category', GUIDE_CATEGORIES, GUIDE_CATEGORIES[0]);
        const needle = text(args, 'query', 80)?.toLowerCase();
        const matches = RESOURCES.filter(
          resource =>
            (!category || resource.category === (category as ResourceCategory)) &&
            (!needle || [resource.title, resource.description, ...resource.tags].some(value => value.toLowerCase().includes(needle)))
        );
        return {
          total: matches.length,
          guides: matches.slice(0, whole(args, 'limit', 1, 40, 15)).map(resource => ({
            title: resource.title,
            url: resource.url,
            description: resource.description,
            category: resource.category,
            level: resource.level,
          })),
          more: `${site}/resources`,
        };
      },
    },
  ];
}
