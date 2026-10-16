import { create } from "zustand";

/** Promise-based confirm for admin pages — replaces the browser's plain
 * window.confirm() with the same ConfirmDialog used everywhere else.
 * Usage: `if (!(await askConfirm("মুছবেন?"))) return;` */
interface ConfirmRequest { title: string; message?: string; confirmLabel?: string; variant?: "danger" | "warning" | "info"; resolve: (ok: boolean) => void }
interface ConfirmStore { req: ConfirmRequest | null; close: (ok: boolean) => void }

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  req: null,
  close: (ok) => { get().req?.resolve(ok); set({ req: null }); },
}));

export function askConfirm(title: string, opts: { message?: string; confirmLabel?: string; variant?: "danger" | "warning" | "info" } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().req?.resolve(false); // a newer question cancels an open one
    useConfirmStore.setState({ req: { title, ...opts, resolve } });
  });
}
