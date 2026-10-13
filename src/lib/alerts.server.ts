import 'server-only';
import { alertSearchQuery, queryOf, type AlertRule } from './alerts';
import { isMissingTable } from './community';
import { repoFullName, searchIssues } from './github';
import { createClient, isSupabaseConfigured } from './supabase/server';

export type AlertsState = 'ready' | 'signed-out' | 'not-configured' | 'not-set-up' | 'unavailable';

export interface AlertMatch {
  title: string;
  repository: string;
  number: number;
  url: string;
  created: string;
  labels: string[];
}

export interface CheckedAlert extends AlertRule {
  /** Issues opened since the member last looked; null when GitHub couldn't be asked. */
  newCount: number | null;
  /** The newest of them, up to five. */
  latest: AlertMatch[];
}

/** Runs `task` over `items`, `limit` at a time, keeping order. */
async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * New issues for each alert since it was last seen. Searches are cached for
 * five minutes and run three at a time, which keeps GitHub's search limits
 * comfortable; an alert GitHub couldn't check reports null.
 */
export async function checkAlerts(rules: AlertRule[]): Promise<CheckedAlert[]> {
  return mapLimit(rules, 3, async rule => {
    try {
      const result = await searchIssues(alertSearchQuery(queryOf(rule), rule.last_seen_at), { sort: 'created', perPage: 5, revalidate: 300 });
      return {
        ...rule,
        newCount: result.total_count,
        latest: result.items.map(issue => ({
          title: issue.title,
          repository: repoFullName(issue.repository_url),
          number: issue.number,
          url: issue.html_url,
          created: issue.created_at,
          labels: (issue.labels ?? []).map(label => label.name),
        })),
      };
    } catch {
      return { ...rule, newCount: null, latest: [] };
    }
  });
}

/** The signed-in member's alerts with their new matches. */
export async function getMyAlerts(): Promise<{ state: AlertsState; alerts: CheckedAlert[] }> {
  if (!isSupabaseConfigured()) return { state: 'not-configured', alerts: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: 'signed-out', alerts: [] };
  const { data, error } = await supabase.from('alert_rules').select('*').order('created_at');
  if (error) return { state: isMissingTable(error) ? 'not-set-up' : 'unavailable', alerts: [] };
  return { state: 'ready', alerts: await checkAlerts(data ?? []) };
}
