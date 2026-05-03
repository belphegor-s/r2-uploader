'use client';

import { useCallback, useEffect, useState } from 'react';

export default function useDriveData(scope, prefix) {
  const [data, setData] = useState({ folders: [], files: [], prefix });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    setError(null);
    try {
      const url = new URL(`/api/drive/${scope}/list`, window.location.origin);
      if (prefix) url.searchParams.set('prefix', prefix);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [scope, prefix]);

  useEffect(() => {
    setLoading(true);
    fetchList();
  }, [fetchList]);

  return { data, loading, error, refresh: fetchList };
}
