'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

// Keep reading sheets outside transformed/reordered cards and their text styles.
export function ModalPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, clientReady, serverReady);
  return mounted ? createPortal(<div className="hig-shell">{children}</div>, document.body) : null;
}
