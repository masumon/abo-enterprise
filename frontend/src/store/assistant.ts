import { create } from "zustand";

/**
 * Screen 02b — the assistant's open state has to be reachable from outside the
 * widget. On screens that already carry an action bar the launcher moves into
 * the header, so the header button and the widget need one piece of truth
 * between them.
 *
 * Deliberately not persisted: a chat panel that reopens itself on the next
 * visit is a panel the visitor did not ask for.
 */
interface AssistantStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));
