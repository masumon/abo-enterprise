"use client";

import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmStore } from "@/store/confirm";

/** Renders askConfirm() questions (mounted once in the admin layout). */
export default function GlobalConfirm() {
  const req = useConfirmStore((s) => s.req);
  const close = useConfirmStore((s) => s.close);
  return (
    <ConfirmDialog
      open={!!req}
      title={req?.title ?? ""}
      message={req?.message}
      confirmLabel={req?.confirmLabel ?? "হ্যাঁ"}
      variant={req?.variant ?? "warning"}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );
}
