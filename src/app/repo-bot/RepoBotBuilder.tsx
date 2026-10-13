'use client';

import { useRef, useState } from 'react';
import { buildRepoBotWorkflow, newWorkflowUrl, REPO_BOT_DEFAULTS, REPO_BOT_LIMITS, repoBotProblems, type RepoBotConfig } from '@/lib/repo-bot';
import { enterRow, leaveRow } from '@/components/fx/rowMotion';
import { Button, ButtonAnchor } from '@/components/ui/Button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Field';
import { Notice, Panel } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { IconArrowUpRight, IconCopy, IconDownload, IconPlus, IconTrash } from '@/components/icons';
import { parseRepoInput } from '../repos/repo-input';
import styles from './repo-bot.module.css';

type MessageKey = 'welcomeIssue' | 'welcomePullRequest' | 'thanksOnMerge' | 'goodbyeOnClose';

const MESSAGES: Array<{ key: MessageKey; label: string; when: string }> = [
  { key: 'welcomeIssue', label: 'First issue', when: 'Someone opens their first issue here.' },
  { key: 'welcomePullRequest', label: 'First pull request', when: 'Someone opens their first pull request here.' },
  { key: 'thanksOnMerge', label: 'Pull request merged', when: 'Any pull request is merged.' },
  { key: 'goodbyeOnClose', label: 'Pull request closed without merging', when: 'A pull request is closed unmerged. Empty by default.' },
];

type Command = RepoBotConfig['commands'][number] & { id: number };

export default function RepoBotBuilder({ site, initialRepository = '' }: { site: string; initialRepository?: string }) {
  const { toast } = useToast();
  const nextId = useRef(REPO_BOT_DEFAULTS.commands.length + 1);
  const added = useRef(new Set<number>());
  const rows = useRef(new Map<number, HTMLLIElement>());
  const [messages, setMessages] = useState<Record<MessageKey, string>>({
    welcomeIssue: REPO_BOT_DEFAULTS.welcomeIssue,
    welcomePullRequest: REPO_BOT_DEFAULTS.welcomePullRequest,
    thanksOnMerge: REPO_BOT_DEFAULTS.thanksOnMerge,
    goodbyeOnClose: REPO_BOT_DEFAULTS.goodbyeOnClose,
  });
  const [commands, setCommands] = useState<Command[]>(() => REPO_BOT_DEFAULTS.commands.map((c, i) => ({ ...c, id: i + 1 })));
  const [deleteCommand, setDeleteCommand] = useState(REPO_BOT_DEFAULTS.deleteCommand);
  const [maintainersOnly, setMaintainersOnly] = useState(REPO_BOT_DEFAULTS.maintainersOnly);
  const [repository, setRepository] = useState(initialRepository);
  const [branch, setBranch] = useState('main');

  const config: RepoBotConfig = { ...messages, commands: commands.map(({ name, reply }) => ({ name, reply })), deleteCommand, maintainersOnly };
  const problems = repoBotProblems(config);
  const workflow = buildRepoBotWorkflow(config, site);
  const target = parseRepoInput(repository);
  const repoName = target ? `${target.owner}/${target.repo}` : null;

  function addCommand() {
    const id = nextId.current++;
    added.current.add(id);
    setCommands(list => [...list, { id, name: '', reply: '' }]);
  }

  function removeCommand(id: number) {
    leaveRow(rows.current.get(id) ?? null, () => setCommands(list => list.filter(c => c.id !== id)));
  }

  function rowRef(id: number) {
    return (el: HTMLLIElement | null) => {
      if (!el) {
        rows.current.delete(id);
        return;
      }
      rows.current.set(id, el);
      if (added.current.delete(id)) {
        enterRow(el);
        el.querySelector('input')?.focus();
      }
    };
  }

  function copy() {
    navigator.clipboard.writeText(workflow).then(
      () => toast('Workflow copied. Save it as .github/workflows/repo-bot.yml.', { tone: 'success' }),
      () => toast('Couldn’t copy. Select the text in the preview instead.', { tone: 'error' })
    );
  }

  function download() {
    const url = URL.createObjectURL(new Blob([workflow], { type: 'text/yaml' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'repo-bot.yml' });
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.layout}>
      <div className={styles.form}>
        <Panel as="section" className={styles.step} aria-labelledby="bot-messages">
          <h2 id="bot-messages" className={styles.stepTitle}>
            <span className={styles.stepNumber}>01</span> Messages
          </h2>
          <p className={styles.stepNote}>
            Leave a message empty to turn it off. <code>{'{user}'}</code> becomes the person’s GitHub name and <code>{'{repo}'}</code> your
            repository.
          </p>
          {MESSAGES.map(message => (
            <Field key={message.key} label={message.label} hint={message.when}>
              {(id, describedBy) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={3}
                  maxLength={REPO_BOT_LIMITS.message}
                  value={messages[message.key]}
                  onChange={event => setMessages(current => ({ ...current, [message.key]: event.target.value }))}
                />
              )}
            </Field>
          ))}
        </Panel>

        <Panel as="section" className={styles.step} aria-labelledby="bot-commands">
          <h2 id="bot-commands" className={styles.stepTitle}>
            <span className={styles.stepNumber}>02</span> Commands
          </h2>
          <p className={styles.stepNote}>When a comment starts with a command, the bot replies with your text.</p>
          <ul className={styles.commands}>
            {commands.map(command => (
              <li key={command.id} ref={rowRef(command.id)} className={styles.command}>
                <Field label="Command">
                  {id => (
                    <Input
                      id={id}
                      value={command.name}
                      placeholder="/guide"
                      spellCheck={false}
                      autoComplete="off"
                      className={styles.commandName}
                      onChange={event => setCommands(list => list.map(c => (c.id === command.id ? { ...c, name: event.target.value } : c)))}
                    />
                  )}
                </Field>
                <Field label="Reply">
                  {id => (
                    <Textarea
                      id={id}
                      rows={2}
                      maxLength={REPO_BOT_LIMITS.message}
                      value={command.reply}
                      onChange={event => setCommands(list => list.map(c => (c.id === command.id ? { ...c, reply: event.target.value } : c)))}
                    />
                  )}
                </Field>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${command.name || 'this command'}`} onClick={() => removeCommand(command.id)}>
                  <IconTrash size={14} />
                </Button>
              </li>
            ))}
          </ul>
          <div className={styles.commandActions}>
            <Button variant="secondary" size="sm" onClick={addCommand} disabled={commands.length >= REPO_BOT_LIMITS.commands}>
              <IconPlus size={14} />
              Add command
            </Button>
          </div>
          <div className={styles.options}>
            <Checkbox label="Remove the command comment once it’s answered" checked={deleteCommand} onChange={event => setDeleteCommand(event.target.checked)} />
            <Checkbox
              label="Only owners, members and collaborators can run commands"
              checked={maintainersOnly}
              onChange={event => setMaintainersOnly(event.target.checked)}
            />
          </div>
        </Panel>

        <Panel as="section" className={styles.step} aria-labelledby="bot-install">
          <h2 id="bot-install" className={styles.stepTitle}>
            <span className={styles.stepNumber}>03</span> Add it to your repository
          </h2>
          <div className={styles.repoFields}>
            <Field label="Repository" hint="owner/name or its GitHub URL">
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={repository}
                  placeholder="octo-org/octo-repo"
                  spellCheck={false}
                  autoComplete="off"
                  invalid={repository.trim() !== '' && !target}
                  onChange={event => setRepository(event.target.value)}
                />
              )}
            </Field>
            <Field label="Branch">
              {id => <Input id={id} value={branch} spellCheck={false} autoComplete="off" onChange={event => setBranch(event.target.value.trim())} />}
            </Field>
          </div>
          <ol className={styles.install}>
            <li>Copy the workflow.</li>
            <li>
              {repoName ? (
                <a href={newWorkflowUrl(repoName, branch || 'main')} target="_blank" rel="noopener noreferrer">
                  Create <code>.github/workflows/repo-bot.yml</code> in {repoName}
                  <IconArrowUpRight size={12} />
                </a>
              ) : (
                <>
                  Create <code>.github/workflows/repo-bot.yml</code> in your repository
                </>
              )}
              , paste, and commit.
            </li>
            <li>
              Optional: to reply as yourself instead of github-actions[bot], add a{' '}
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">
                fine-grained token
              </a>{' '}
              with Issues and Pull requests set to read and write as the{' '}
              {repoName ? (
                <a href={`https://github.com/${repoName}/settings/secrets/actions/new`} target="_blank" rel="noopener noreferrer">
                  repository secret
                </a>
              ) : (
                'repository secret'
              )}{' '}
              <code>REPO_BOT_TOKEN</code>.
            </li>
          </ol>
        </Panel>
      </div>

      <section className={styles.preview} aria-labelledby="bot-preview">
        <div className={styles.previewHead}>
          <h2 id="bot-preview" className={styles.previewTitle}>
            repo-bot.yml
          </h2>
          <div className={styles.previewActions}>
            <Button variant="secondary" size="sm" onClick={download} disabled={problems.length > 0}>
              <IconDownload size={14} />
              Download
            </Button>
            <Button variant="primary" size="sm" onClick={copy} disabled={problems.length > 0}>
              <IconCopy size={14} />
              Copy workflow
            </Button>
          </div>
        </div>
        <div aria-live="polite">
          {problems.length > 0 && (
            <Notice tone="warning" title="Fix these first">
              <ul className={styles.problems}>
                {problems.map(problem => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </Notice>
          )}
        </div>
        <pre className={styles.code} tabIndex={0} aria-label="Workflow file">
          <code>{workflow}</code>
        </pre>
        {repoName && (
          <ButtonAnchor href={`https://github.com/${repoName}/actions`} variant="ghost" size="sm" className={styles.actionsLink}>
            See runs in {repoName}’s Actions tab
            <IconArrowUpRight size={12} />
          </ButtonAnchor>
        )}
      </section>
    </div>
  );
}
