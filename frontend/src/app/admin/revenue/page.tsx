import { redirect } from "next/navigation";

/** Revenue reporting — unified view lives in Analytics */
export default function AdminRevenuePage() {
  redirect("/admin/analytics");
}
