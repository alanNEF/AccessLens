import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'accesslens.theme';
function isTheme(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Theme is UI-local; the host document never receives classes or variables. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onSystemChange);
    onSystemChange();
    void browser.storage.local.get(STORAGE_KEY).then(result => {
      if (mounted) setPreference(isTheme(result[STORAGE_KEY]) ? result[STORAGE_KEY] : 'system');
    }).catch(() => {
      if (mounted) setStorageError(true);
    }).finally(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
      media.removeEventListener('change', onSystemChange);
    };
  }, []);

  function changeTheme(next: ThemePreference) {
    setPreference(next);
    setStorageError(false);
    void browser.storage.local.set({ [STORAGE_KEY]: next }).catch(() => setStorageError(true));
  }

  return {
    ready, preference, changeTheme, storageError,
    theme: preference === 'system' ? (systemDark ? 'dark' : 'light') : preference,
  };
}
