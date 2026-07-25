"use client";

import { useEffect, useMemo } from "react";
import { BD_DISTRICTS } from "@/lib/bdDistricts";
import { getUpazilasForDistrict } from "@/lib/bdUpazilas";

export { BD_DISTRICTS };

/**
 * The district → upazila cascade, in one place.
 *
 * Checkout and the service booking form both need "pick a district, get its
 * upazilas, and drop a stale upazila when the district changes". They had two
 * separate implementations that behaved differently: checkout cleared the
 * upazila only when it no longer belonged to the new district, the booking
 * form cleared it on every keystroke of the district select. This is the
 * checkout behaviour, which is the correct one — re-selecting the same
 * district must not wipe a valid pick.
 *
 * Form-library agnostic: callers pass the current values and a setter, so it
 * works with react-hook-form's `setValue` or a plain `useState` setter.
 */
export function useDistrictUpazila(
  district: string | undefined,
  upazila: string | undefined,
  setUpazila: (value: string) => void
) {
  const upazilaOptions = useMemo(
    () => (district ? getUpazilasForDistrict(district) : []),
    [district]
  );

  useEffect(() => {
    if (upazila && !upazilaOptions.includes(upazila)) {
      setUpazila("");
    }
    // setUpazila is a stable form setter in both call sites; including it would
    // re-run this on every render for callers passing an inline lambda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upazilaOptions, upazila]);

  return { districts: BD_DISTRICTS, upazilaOptions };
}
