import type { CatalogSource } from "@/lib/catalogLoader";

interface Props {
  show: boolean;
  source?: CatalogSource;
}

/** Fallback runs silently — no demo/cache network notices in the UI. */
export default function DemoModeBanner(_props: Props) {
  return null;
}
