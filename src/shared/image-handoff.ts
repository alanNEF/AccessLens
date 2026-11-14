export interface ImageHandoff {
  readonly id: string;
  readonly selector: string;
  readonly element: HTMLImageElement;
}

export function createImageHandoffStore() {
  let current: ImageHandoff | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    get: () => current,

    set(next: ImageHandoff | null) {
      current = next;
      notify();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    clear() {
      current = null;
      notify();
    },
  };
}

export type ImageHandoffStore =
  ReturnType<typeof createImageHandoffStore>;
