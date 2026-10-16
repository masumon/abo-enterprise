import { create } from "zustand";
import { adminApi } from "@/lib/api";

/** Profile panel open/close + the signed-in admin's photo. The photo URL is saved as the
 * setting `admin_avatar_<id>` (private — the public settings list never returns it) and
 * mirrored in localStorage so it still shows if the account may not write settings. */
interface ProfileStore {
  open: boolean;
  avatar: string;
  setOpen: (v: boolean) => void;
  loadAvatar: (id: string) => Promise<void>;
  saveAvatar: (id: string, url: string) => Promise<"saved" | "device-only">;
}

const lsKey = (id: string) => `abo_admin_avatar_${id}`;
const read = (id: string) => { try { return localStorage.getItem(lsKey(id)) ?? ""; } catch { return ""; } };
const write = (id: string, url: string) => { try { localStorage.setItem(lsKey(id), url); } catch { /* private mode */ } };

export const useProfileStore = create<ProfileStore>((set) => ({
  open: false,
  avatar: "",
  setOpen: (open) => set({ open }),
  loadAvatar: async (id) => {
    set({ avatar: read(id) });
    try {
      const r = await adminApi.getSettings();
      const url = String(r.data.data?.[`admin_avatar_${id}`] ?? "").trim();
      if (url) { set({ avatar: url }); write(id, url); }
    } catch { /* keep the local copy */ }
  },
  saveAvatar: async (id, url) => {
    set({ avatar: url });
    write(id, url);
    try {
      await adminApi.upsertSettings([{ key: `admin_avatar_${id}`, value: url, data_type: "string" }]);
      return "saved";
    } catch {
      return "device-only";
    }
  },
}));
