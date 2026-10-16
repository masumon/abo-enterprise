import { redirect } from "next/navigation";

/** Combo packs moved into Offers (Coupons, Flash Sale, Combos). */
export default function CombosRedirect() {
  redirect("/sumon/coupons#combos");
}
