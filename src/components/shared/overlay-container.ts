import { createContext } from 'react';

/** Radix's default document.body portal would escape the extension's Shadow DOM. */
export const OverlayContainerContext = createContext<HTMLDivElement | null>(null);
