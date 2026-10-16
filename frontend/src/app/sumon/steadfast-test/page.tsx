import { redirect } from "next/navigation";

/** The Steadfast test now lives on the courier page (with Pathao/RedX). */
export default function SteadfastTestRedirect() {
  redirect("/sumon/couriers#steadfast");
}
