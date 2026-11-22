import { useEffect, useState } from 'react';

let cached: Promise<boolean> | null = null;

/*
 * Checks once whether the GLB exists. Dev servers answer unknown paths with index.html,
 * so an HTML response counts as "missing", not as a model.
 */
function probe(url: string): Promise<boolean> {
  cached ??= fetch(url, { method: 'HEAD', cache: 'no-cache' })
    .then(r => r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))
    .catch(() => false);
  return cached;
}

/* null while checking, then true or false. */
export function useModelAvailable(url: string): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    probe(url).then(v => { if (alive) setOk(v); });
    return () => { alive = false; };
  }, [url]);
  return ok;
}
