/**
 * The repo bot: a GitHub Actions workflow a maintainer adds to their own
 * repository. It welcomes people on their first issue and first pull request,
 * thanks them when a pull request merges, says goodbye when one closes
 * unmerged, and answers slash commands such as /guide. It runs inside the
 * maintainer's repository with that repository's token (or the maintainer's
 * own, to post as them), so Orion never holds write access to anything.
 */

export interface RepoBotCommand {
  /** Lowercase, starting with a slash: /guide */
  name: string;
  reply: string;
}

export interface RepoBotConfig {
  welcomeIssue: string;
  welcomePullRequest: string;
  thanksOnMerge: string;
  goodbyeOnClose: string;
  commands: RepoBotCommand[];
  /** Remove the command comment once the bot has answered it. */
  deleteCommand: boolean;
  /** Only owners, members and collaborators can run commands. */
  maintainersOnly: boolean;
}

export const REPO_BOT_LIMITS = { message: 2000, commands: 50 };

export const REPO_BOT_DEFAULTS: RepoBotConfig = {
  welcomeIssue:
    'Thanks for opening your first issue here, @{user}! A maintainer will look at it soon. In the meantime, CONTRIBUTING.md explains how we work.',
  welcomePullRequest:
    'Welcome, @{user}, and thank you for your first pull request to {repo}! Check that the tests pass; a maintainer will review it soon.',
  thanksOnMerge: 'Merged. Thank you for contributing, @{user}!',
  goodbyeOnClose: '',
  commands: [
    {
      name: '/guide',
      reply: 'New here? Read CONTRIBUTING.md first, then pick an issue labelled "good first issue" and comment that you are working on it.',
    },
  ],
  deleteCommand: true,
  maintainersOnly: false,
};

/** "Guide", "/guide" → "/guide"; anything that isn't one short word → null. */
export function normalizeCommand(value: string): string | null {
  const name = `/${value.trim().replace(/^\/+/, '').toLowerCase()}`;
  return /^\/[a-z0-9][a-z0-9-]{0,31}$/.test(name) ? name : null;
}

/** Problems with a configuration, in the words the form shows. Empty when it can be generated. */
export function repoBotProblems(config: RepoBotConfig): string[] {
  const problems: string[] = [];
  const messages: Array<[string, string]> = [
    ['The first-issue welcome', config.welcomeIssue],
    ['The first-pull-request welcome', config.welcomePullRequest],
    ['The thank-you', config.thanksOnMerge],
    ['The goodbye', config.goodbyeOnClose],
  ];
  for (const [label, text] of messages) {
    if (text.length > REPO_BOT_LIMITS.message) problems.push(`${label} is longer than ${REPO_BOT_LIMITS.message} characters.`);
  }
  if (config.commands.length > REPO_BOT_LIMITS.commands) problems.push(`Keep to ${REPO_BOT_LIMITS.commands} commands.`);
  const seen = new Set<string>();
  for (const command of config.commands) {
    const name = normalizeCommand(command.name);
    if (!name) problems.push(`"${command.name}" isn't a command: use one word after a slash, like /guide.`);
    else if (seen.has(name)) problems.push(`${name} is listed twice.`);
    else seen.add(name);
    if (!command.reply.trim()) problems.push(`${name ?? command.name} needs a reply.`);
    if (command.reply.length > REPO_BOT_LIMITS.message) problems.push(`The reply to ${name ?? command.name} is too long.`);
  }
  const anything = messages.some(([, text]) => text.trim()) || config.commands.length > 0;
  if (!anything) problems.push('Turn on at least one message or command.');
  return problems;
}

/**
 * JSON for the script, made safe inside a workflow file: "$" is written as
 * $ so a message can never form a ${{ }} expression GitHub would
 * evaluate, and line separators are escaped so the line stays one line.
 */
function scriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/\$/g, '\\u0024')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Hidden in every comment the bot writes, so it never answers itself. */
export const REPO_BOT_MARK = '<!-- orion-repo-bot -->';

/** The script actions/github-script runs; github and context are provided by the action. */
const SCRIPT = String.raw`const MARK = '${REPO_BOT_MARK}';
const { owner, repo } = context.repo;
const fill = (text, user) => text.replaceAll('{user}', user).replaceAll('{repo}', owner + '/' + repo);
const say = async (number, text, user) => {
  if (!text) return;
  await github.rest.issues.createComment({ owner, repo, issue_number: number, body: fill(text, user) + '\n\n' + MARK });
};
// First time = no other issue (or pull request) by this person in this repository.
const firstTime = async (kind, user, number) => {
  const { data } = await github.rest.search.issuesAndPullRequests({ q: 'repo:' + owner + '/' + repo + ' is:' + kind + ' author:' + user, per_page: 5 });
  return data.items.every(item => item.number === number);
};
const payload = context.payload;
if (context.eventName === 'issues' && payload.action === 'opened') {
  const issue = payload.issue;
  if (issue.user.type === 'Bot' || !config.welcomeIssue) return;
  if (await firstTime('issue', issue.user.login, issue.number)) await say(issue.number, config.welcomeIssue, issue.user.login);
} else if (context.eventName === 'pull_request_target') {
  const pr = payload.pull_request;
  if (pr.user.type === 'Bot') return;
  const login = pr.user.login;
  if (payload.action === 'opened' && config.welcomePullRequest && (await firstTime('pr', login, pr.number))) await say(pr.number, config.welcomePullRequest, login);
  if (payload.action === 'closed' && pr.merged) await say(pr.number, config.thanksOnMerge, login);
  if (payload.action === 'closed' && !pr.merged) await say(pr.number, config.goodbyeOnClose, login);
} else if (context.eventName === 'issue_comment' && payload.action === 'created') {
  const comment = payload.comment;
  if (comment.user.type === 'Bot' || comment.body.includes(MARK)) return;
  const word = comment.body.trim().split(/\s+/)[0].toLowerCase();
  const command = config.commands.find(c => c.name === word);
  if (!command) return;
  if (config.maintainersOnly && !['OWNER', 'MEMBER', 'COLLABORATOR'].includes(comment.author_association)) return;
  await say(payload.issue.number, command.reply, comment.user.login);
  if (config.deleteCommand) await github.rest.issues.deleteComment({ owner, repo, comment_id: comment.id });
}`;

/** The workflow file, ready to save as .github/workflows/repo-bot.yml. */
export function buildRepoBotWorkflow(config: RepoBotConfig, site: string): string {
  const commands = config.commands
    .map(command => ({ name: normalizeCommand(command.name), reply: command.reply.trim() }))
    .filter((command): command is RepoBotCommand => command.name !== null && command.reply.length > 0);
  const settings = {
    welcomeIssue: config.welcomeIssue.trim(),
    welcomePullRequest: config.welcomePullRequest.trim(),
    thanksOnMerge: config.thanksOnMerge.trim(),
    goodbyeOnClose: config.goodbyeOnClose.trim(),
    commands,
    deleteCommand: config.deleteCommand,
    maintainersOnly: config.maintainersOnly,
  };
  const triggers = [
    settings.welcomeIssue && '  issues:\n    types: [opened]',
    (settings.welcomePullRequest || settings.thanksOnMerge || settings.goodbyeOnClose) &&
      `  # Safe here: the bot only comments and never checks out the pull request's code.\n  pull_request_target:\n    types: [${[
        settings.welcomePullRequest && 'opened',
        (settings.thanksOnMerge || settings.goodbyeOnClose) && 'closed',
      ]
        .filter(Boolean)
        .join(', ')}]`,
    commands.length > 0 && '  issue_comment:\n    types: [created]',
  ].filter(Boolean);
  const script = [`const config = ${scriptLiteral(settings)};`, ...SCRIPT.split('\n')].map(line => (line ? `            ${line}` : '')).join('\n');

  return `# Repo bot, made with Orion (${site}/repo-bot).
# Welcomes first-time contributors, thanks them when a pull request merges and
# answers slash commands. It runs in this repository; Orion has no access to it.
# Replies come from github-actions[bot]. To post them as yourself, add a
# fine-grained personal access token with Issues and Pull requests set to
# "Read and write" as the repository secret REPO_BOT_TOKEN.
name: Repo bot

on:
${triggers.join('\n')}

permissions:
  issues: write
  pull-requests: write

jobs:
  reply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.REPO_BOT_TOKEN || secrets.GITHUB_TOKEN }}
          script: |
${script}
`;
}

/** GitHub's "new file" page for the workflow, on the default branch. */
export function newWorkflowUrl(repository: string, branch = 'main') {
  return `https://github.com/${repository}/new/${encodeURIComponent(branch)}?filename=.github/workflows/repo-bot.yml`;
}
