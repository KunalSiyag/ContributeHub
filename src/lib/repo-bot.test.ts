import { load } from 'js-yaml';
import { describe, expect, it, vi } from 'vitest';
import { buildRepoBotWorkflow, newWorkflowUrl, normalizeCommand, REPO_BOT_DEFAULTS, REPO_BOT_MARK, repoBotProblems, type RepoBotConfig } from './repo-bot';

type Workflow = {
  on: Record<string, { types: string[] }>;
  permissions: Record<string, string>;
  jobs: { reply: { steps: Array<{ uses: string; with: { 'github-token': string; script: string } }> } };
};

const parse = (config: RepoBotConfig) => load(buildRepoBotWorkflow(config, 'https://orion.test')) as Workflow;

/** Runs the workflow's script the way actions/github-script does, against a fake GitHub. */
async function run(config: RepoBotConfig, eventName: string, payload: Record<string, unknown>, earlier: number[] = []) {
  const script = parse(config).jobs.reply.steps[0].with.script;
  type Comment = { issue_number: number; body: string };
  const github = {
    rest: {
      search: {
        issuesAndPullRequests: vi.fn<(args: { q: string }) => Promise<{ data: { items: Array<{ number: number }> } }>>(async () => ({
          data: { items: earlier.map(number => ({ number })) },
        })),
      },
      issues: {
        createComment: vi.fn<(args: Comment) => Promise<object>>(async () => ({})),
        deleteComment: vi.fn<(args: { comment_id: number }) => Promise<object>>(async () => ({})),
      },
    },
  };
  const context = { eventName, payload, repo: { owner: 'acme', repo: 'widgets' } };
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  await new AsyncFunction('github', 'context', script)(github, context);
  return {
    comments: github.rest.issues.createComment.mock.calls.map(([args]) => args),
    deleted: github.rest.issues.deleteComment.mock.calls.map(([args]) => args.comment_id),
    searches: github.rest.search.issuesAndPullRequests.mock.calls.map(([args]) => args.q),
  };
}

const user = (login: string, type = 'User') => ({ login, type });

describe('repo bot workflow', () => {
  it('is a valid workflow with only the triggers it needs', () => {
    const workflow = parse(REPO_BOT_DEFAULTS);
    expect(Object.keys(workflow.on)).toEqual(['issues', 'pull_request_target', 'issue_comment']);
    expect(workflow.on.pull_request_target.types).toEqual(['opened', 'closed']);
    expect(workflow.permissions).toEqual({ issues: 'write', 'pull-requests': 'write' });
    expect(workflow.jobs.reply.steps[0].uses).toBe('actions/github-script@v7');
    expect(workflow.jobs.reply.steps[0].with['github-token']).toBe('${{ secrets.REPO_BOT_TOKEN || secrets.GITHUB_TOKEN }}');

    const quiet = parse({ ...REPO_BOT_DEFAULTS, welcomeIssue: '', welcomePullRequest: '', goodbyeOnClose: '', commands: [] });
    expect(Object.keys(quiet.on)).toEqual(['pull_request_target']);
    expect(quiet.on.pull_request_target.types).toEqual(['closed']);
  });

  it('welcomes a first issue but not a returning author', async () => {
    const payload = { action: 'opened', issue: { number: 7, user: user('ada') } };
    const first = await run(REPO_BOT_DEFAULTS, 'issues', payload);
    expect(first.searches).toEqual(['repo:acme/widgets is:issue author:ada']);
    expect(first.comments).toEqual([
      { owner: 'acme', repo: 'widgets', issue_number: 7, body: expect.stringContaining('Thanks for opening your first issue here, @ada!') },
    ]);
    expect(first.comments[0].body.endsWith(REPO_BOT_MARK)).toBe(true);
    expect((await run(REPO_BOT_DEFAULTS, 'issues', payload, [3, 7])).comments).toEqual([]);
    // Search may not have indexed the new issue yet: still a first.
    expect((await run(REPO_BOT_DEFAULTS, 'issues', payload, [])).comments).toHaveLength(1);
  });

  it('welcomes first pull requests, thanks on merge and says goodbye only when set', async () => {
    const pr = (action: string, merged = false) => ({ action, pull_request: { number: 12, merged, user: user('lin') } });
    const opened = await run(REPO_BOT_DEFAULTS, 'pull_request_target', pr('opened'), [12]);
    expect(opened.comments[0].body).toContain('first pull request to acme/widgets');
    expect((await run(REPO_BOT_DEFAULTS, 'pull_request_target', pr('closed', true))).comments[0].body).toContain('Merged. Thank you for contributing, @lin!');
    expect((await run(REPO_BOT_DEFAULTS, 'pull_request_target', pr('closed'))).comments).toEqual([]);
    const withGoodbye = { ...REPO_BOT_DEFAULTS, goodbyeOnClose: 'Thanks for trying, @{user}.' };
    expect((await run(withGoodbye, 'pull_request_target', pr('closed'))).comments[0].body).toContain('Thanks for trying, @lin.');
    expect((await run(REPO_BOT_DEFAULTS, 'pull_request_target', { action: 'opened', pull_request: { number: 3, merged: false, user: user('dependabot[bot]', 'Bot') } })).comments).toEqual([]);
  });

  it('answers commands, removes them, and ignores itself', async () => {
    const comment = (body: string, association = 'NONE', type = 'User') => ({
      action: 'created',
      issue: { number: 4 },
      comment: { id: 99, body, author_association: association, user: user('sam', type) },
    });
    const answered = await run(REPO_BOT_DEFAULTS, 'issue_comment', comment('  /Guide please'));
    expect(answered.comments[0]).toMatchObject({ issue_number: 4, body: expect.stringContaining('New here? Read CONTRIBUTING.md first') });
    expect(answered.deleted).toEqual([99]);
    expect((await run({ ...REPO_BOT_DEFAULTS, deleteCommand: false }, 'issue_comment', comment('/guide'))).deleted).toEqual([]);
    expect((await run(REPO_BOT_DEFAULTS, 'issue_comment', comment('a /guide in the middle'))).comments).toEqual([]);
    expect((await run(REPO_BOT_DEFAULTS, 'issue_comment', comment(`/guide\n\n${REPO_BOT_MARK}`))).comments).toEqual([]);
    expect((await run(REPO_BOT_DEFAULTS, 'issue_comment', comment('/guide', 'NONE', 'Bot'))).comments).toEqual([]);

    const strict = { ...REPO_BOT_DEFAULTS, maintainersOnly: true };
    expect((await run(strict, 'issue_comment', comment('/guide'))).comments).toEqual([]);
    expect((await run(strict, 'issue_comment', comment('/guide', 'COLLABORATOR'))).comments).toHaveLength(1);
  });

  it('keeps messages from becoming workflow expressions or breaking the file', async () => {
    const tricky = {
      ...REPO_BOT_DEFAULTS,
      welcomeIssue: 'Hi @{user}: ${{ secrets.GITHUB_TOKEN }} `code` "quotes" \u2028 end\n# not a comment',
    };
    const file = buildRepoBotWorkflow(tricky, 'https://orion.test');
    expect(file.match(/\$\{\{/g)).toHaveLength(1); // only the github-token line
    const { comments } = await run(tricky, 'issues', { action: 'opened', issue: { number: 1, user: user('eve') } });
    expect(comments[0].body.startsWith('Hi @eve: ${{ secrets.GITHUB_TOKEN }} `code` "quotes" \u2028 end\n# not a comment')).toBe(true);
  });
});

describe('repo bot settings', () => {
  it('normalizes command names', () => {
    expect(normalizeCommand('Guide')).toBe('/guide');
    expect(normalizeCommand('//help-me')).toBe('/help-me');
    expect(normalizeCommand('/two words')).toBeNull();
    expect(normalizeCommand('')).toBeNull();
  });

  it('explains what has to change', () => {
    expect(repoBotProblems(REPO_BOT_DEFAULTS)).toEqual([]);
    expect(
      repoBotProblems({
        ...REPO_BOT_DEFAULTS,
        thanksOnMerge: 'x'.repeat(2001),
        commands: [
          { name: '/guide', reply: 'a' },
          { name: 'GUIDE', reply: 'b' },
          { name: 'no good', reply: '' },
        ],
      })
    ).toEqual([
      'The thank-you is longer than 2000 characters.',
      '/guide is listed twice.',
      '"no good" isn\'t a command: use one word after a slash, like /guide.',
      'no good needs a reply.',
    ]);
    expect(repoBotProblems({ ...REPO_BOT_DEFAULTS, welcomeIssue: '', welcomePullRequest: '', thanksOnMerge: '', commands: [] })).toEqual([
      'Turn on at least one message or command.',
    ]);
  });

  it('links to GitHub’s new-file page', () => {
    expect(newWorkflowUrl('acme/widgets')).toBe('https://github.com/acme/widgets/new/main?filename=.github/workflows/repo-bot.yml');
  });
});
