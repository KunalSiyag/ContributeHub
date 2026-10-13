'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Markdown from '@/components/Markdown';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { Menu } from '@/components/ui/Menu';
import { Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { IconArrowRight, IconClock, IconRefreshCw, IconSparkles, IconTrash } from '@/components/icons';
import LogoMark from '@/components/LogoMark';
import styles from './assistant.module.css';

interface Source {
  title: string;
  url: string;
  /** The citation number in the answer ("[2]"), for web results. */
  n?: number;
}

/** How a turn searched the web: Google Search, or the free search APIs. */
type WebMode = 'google' | 'free';

interface Turn {
  role: 'user' | 'model';
  text: string;
  sources?: Source[];
  /** The answer used a live GitHub issue search. */
  searchedIssues?: boolean;
  searchedWeb?: WebMode;
}

interface Chat {
  id: string;
  title: string;
  updated: number;
  turns: Turn[];
}

const SUGGESTIONS = [
  'Which open source programs can I still apply to this year?',
  'Explain zulip/zulip and where a newcomer should start',
  'Find good first issues in Rust about parsers',
  'Draft a pull request title and description for a change I made',
  'How do I write a strong GSoC proposal?',
  'How do I pick my first issue and ask to work on it?',
];

/** Chats stay in this browser only; nothing is stored on Orion's servers. */
const CHATS_KEY = 'orion_assistant_chats';
const WEB_KEY = 'orion_assistant_web';
const MAX_CHATS = 10;
const MAX_STORED_TURNS = 30;

function loadChats(): Chat[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHATS_KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? (raw as Chat[]).filter(chat => chat && typeof chat.id === 'string' && Array.isArray(chat.turns)).slice(0, MAX_CHATS) : [];
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  try {
    if (chats.length === 0) localStorage.removeItem(CHATS_KEY);
    else localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)));
  } catch {
    // Private windows can refuse storage; history then lasts for this page only.
  }
}

const titleOf = (turns: Turn[]) => (turns.find(turn => turn.role === 'user')?.text ?? 'Chat').replace(/\s+/g, ' ').slice(0, 70);

const WEB_NOTE: Record<WebMode, string> = {
  google: 'Searched the web with Google.',
  free: 'Searched Stack Overflow, Wikipedia and Hacker News.',
};

export default function AssistantClient({ initialRepo, googleSearch = false }: { initialRepo: string | null; googleSearch?: boolean }) {
  const { toast } = useToast();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Browser-only state loads after mount, so server and first client render agree.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setChats(loadChats());
      try {
        setWebSearch(localStorage.getItem(WEB_KEY) === 'on');
      } catch {
        // No storage: web search starts off.
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  /** Saves the conversation as the current chat (newest first). */
  const remember = (conversation: Turn[], id: string) => {
    setChats(current => {
      const next = [
        { id, title: titleOf(conversation), updated: Date.now(), turns: conversation.slice(-MAX_STORED_TURNS) },
        ...current.filter(chat => chat.id !== id),
      ].slice(0, MAX_CHATS);
      saveChats(next);
      return next;
    });
  };

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || pending) return;
    const next = [...turns, { role: 'user' as const, text }];
    const id = chatId ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setChatId(id);
    setTurns(next);
    setDraft('');
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, text: body }) => ({ role, text: body })), webSearch }),
      });
      const data = (await response.json()) as {
        available?: boolean;
        reply?: string;
        message?: string;
        sources?: Source[];
        searchedIssues?: boolean;
        webSearch?: WebMode | 'none' | 'unavailable' | 'off';
      };
      if (!response.ok) throw new Error(data.message ?? 'The assistant could not answer.');
      if (!data.available || !data.reply) throw new Error('The assistant is unavailable right now. Try again in a moment.');
      const searchedWeb = data.webSearch === 'google' || data.webSearch === 'free' ? data.webSearch : undefined;
      const answered = [
        ...next,
        { role: 'model' as const, text: data.reply, sources: data.sources?.length ? data.sources : undefined, searchedIssues: data.searchedIssues || undefined, searchedWeb },
      ];
      setTurns(answered);
      remember(answered, id);
      if (data.webSearch === 'unavailable') toast('Web search isn’t available right now, so this answer comes from Orion’s own data.');
      else if (data.webSearch === 'none') toast('The web search found nothing for this question, so this answer comes from Orion’s own data.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant could not answer.');
      // Give the question back so it can be retried as is.
      setTurns(current => current.slice(0, -1));
      setDraft(text);
    } finally {
      setPending(false);
    }
  };

  // Opened from a repository report: start with that repository.
  useEffect(() => {
    if (!initialRepo || started.current) return;
    started.current = true;
    void ask(`Explain ${initialRepo}: what it does, how it is organised and where a newcomer should start.`);
    // ask() is stable enough for a one-time kick-off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRepo]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    // The welcome reads from the top; a conversation follows its newest turn.
    if (turns.length === 0 && !pending) log.scrollTo({ top: 0 });
    else log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void ask(draft);
    }
  };

  const newChat = () => {
    setTurns([]);
    setChatId(null);
    setError(null);
  };

  const openChat = (chat: Chat) => {
    setTurns(chat.turns);
    setChatId(chat.id);
    setError(null);
  };

  const deleteHistory = () => {
    saveChats([]);
    setChats([]);
    newChat();
    toast('Chat history deleted from this browser.', { tone: 'success' });
  };

  const toggleWeb = (on: boolean) => {
    setWebSearch(on);
    try {
      localStorage.setItem(WEB_KEY, on ? 'on' : 'off');
    } catch {
      // The choice still applies to this page.
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.log} ref={logRef} aria-live="polite" aria-busy={pending || undefined}>
        {turns.length === 0 && !pending ? (
          <div className={styles.welcome}>
            <span className={styles.welcomeMark} aria-hidden="true">
              <LogoMark size={22} />
            </span>
            <p className={styles.welcomeTitle}>Ask about any repository or program</p>
            <p className={styles.welcomeText}>
              Name a repository (owner/repo or a GitHub link) and the assistant reads its README, layout and contributing
              guide. Ask about programs and it uses today&rsquo;s dates from Orion; ask it to find issues and it searches GitHub. Turn on
              Search the web for answers that cite Stack Overflow, Wikipedia and Hacker News.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map(suggestion => (
                <button key={suggestion} type="button" className={styles.suggestion} onClick={() => void ask(suggestion)}>
                  <IconSparkles size={13} aria-hidden="true" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className={styles.turns}>
            {turns.map((turn, index) => (
              <li key={index} className={turn.role === 'user' ? styles.userTurn : styles.modelTurn}>
                <span className="visually-hidden">{turn.role === 'user' ? 'You said:' : 'Assistant:'}</span>
                {turn.role === 'user' ? <p className={styles.userText}>{turn.text}</p> : <Markdown text={turn.text} />}
                {turn.searchedIssues && <p className={styles.turnNote}>Searched GitHub for open issues.</p>}
                {turn.searchedWeb && <p className={styles.turnNote}>{WEB_NOTE[turn.searchedWeb]}</p>}
                {turn.sources && (
                  <div className={styles.sources}>
                    <span className={styles.sourcesLabel}>Sources</span>
                    <ol className={styles.sourceList}>
                      {turn.sources.map(source => (
                        <li key={source.url} value={source.n}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            ))}
            {pending && (
              <li className={styles.modelTurn}>
                <span className={styles.thinking}>
                  <span aria-hidden="true" />
                  {webSearch ? 'Searching the web and reading the sources…' : 'Reading the sources…'}
                </span>
              </li>
            )}
          </ol>
        )}
      </div>

      {error && (
        <Notice tone="warning" className={styles.error}>
          {error}
        </Notice>
      )}

      <form className={styles.composer} onSubmit={onSubmit}>
        <label htmlFor="assistant-input" className="visually-hidden">
          Your question
        </label>
        <textarea
          id="assistant-input"
          className={styles.input}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about a repository, an issue or a program…"
          rows={2}
          maxLength={2000}
        />
        <div className={styles.composerActions}>
          <Checkbox
            label="Search the web"
            checked={webSearch}
            onChange={event => toggleWeb(event.target.checked)}
            className={styles.webToggle}
            aria-describedby="assistant-web-note"
          />
          <span className={styles.actionsSpacer} />
          {chats.length > 0 && (
            <Menu
              align="end"
              label="Chat history"
              items={[
                { type: 'label', label: 'Recent chats, in this browser' },
                ...chats.map(chat => ({ label: chat.title, icon: <IconClock size={14} />, onSelect: () => openChat(chat) })),
                { type: 'separator' as const },
                { label: 'Delete history', icon: <IconTrash size={14} />, onSelect: deleteHistory },
              ]}
              trigger={props => (
                <Button variant="ghost" size="sm" type="button" disabled={pending} {...props}>
                  <IconClock size={13} />
                  History
                </Button>
              )}
            />
          )}
          {turns.length > 0 && (
            <Button variant="ghost" size="sm" type="button" onClick={newChat} disabled={pending}>
              <IconRefreshCw size={13} />
              New chat
            </Button>
          )}
          <Button type="submit" variant="primary" size="sm" disabled={pending || !draft.trim()} loading={pending}>
            Ask
            <IconArrowRight size={13} />
          </Button>
        </div>
      </form>
      <p className={styles.disclaimer}>
        Answers come from a language model reading public sources. Check important details before you rely on them. Chats are kept in this browser only.{' '}
        <span id="assistant-web-note">
          {googleSearch
            ? 'Web search uses Google Search through Gemini, or the public search of Stack Overflow, Wikipedia and Hacker News when Google is unavailable.'
            : 'Web search sends keywords from your question to the public search of Stack Overflow, Wikipedia and Hacker News.'}
        </span>
      </p>
    </div>
  );
}
