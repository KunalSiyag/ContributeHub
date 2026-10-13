'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/fetch-json';

interface AsyncState<T> {
  key: string;
  data?: T;
  error?: ApiError;
}

/**
 * Runs `run` whenever `key` changes (null = idle). State is stored with the
 * key it belongs to, so stale responses are ignored and no state is set
 * synchronously inside the effect.
 */
export function useAsync<T>(key: string | null, run: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    runRef.current(controller.signal).then(
      data => {
        if (!controller.signal.aborted) setState({ key, data });
      },
      err => {
        if (controller.signal.aborted) return;
        setState({
          key,
          error: err instanceof ApiError ? err : new ApiError('Something went wrong. Try again.', 0),
        });
      }
    );
    return () => controller.abort();
  }, [key, nonce]);

  const current = key && state?.key === key ? state : null;
  const reload = useCallback(() => {
    setState(null);
    setNonce(n => n + 1);
  }, []);

  return { data: current?.data, error: current?.error, loading: Boolean(key) && !current, reload };
}
