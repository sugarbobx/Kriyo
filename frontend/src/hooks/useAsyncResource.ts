import { useCallback, useEffect, useState } from 'react';

export type AsyncStatus = 'loading' | 'ready' | 'error';

/**
 * Fetch-on-mount with a visible error + retry, instead of each screen
 * hand-rolling its own loading/error/data useState trio (and some of them
 * silently swallowing the error entirely -- see Accounts/Performance/
 * Tracking before this hook existed).
 */
export function useAsyncResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setStatus('loading');
    setError('');
    fetcher()
      .then((result) => {
        setData(result);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Network error.');
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, status, error, reload: load, setData };
}
