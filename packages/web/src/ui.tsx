import { createContext, useContext, useState, type ReactNode } from 'react';

export const configPathHint = '~/.config/dum-e/config.yaml';

export function statusColor(status: string): string {
  return `var(--st-${status})`;
}

export function priorityStyle(priority: string): { color: string; background: string } {
  const color = `var(--pr-${priority})`;
  return { color, background: 'transparent' };
}

/** Selected task id shared across views to drive the detail drawer. */
interface SelectionCtx {
  selectedId: string | null;
  select: (id: string | null) => void;
}
const Ctx = createContext<SelectionCtx>({ selectedId: null, select: () => {} });

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return <Ctx.Provider value={{ selectedId, select: setSelectedId }}>{children}</Ctx.Provider>;
}

export function useSelection(): SelectionCtx {
  return useContext(Ctx);
}
