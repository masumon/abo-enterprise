"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import type { Category } from "@/types";
import { getApiBaseUrl } from "@/lib/apiBase";

// Module-level cache: the taxonomy is small and rarely changes, so one fetch
// per page-load serves every consumer (menus, pickers).
let memory: Category[] | null = null;
let pending: Promise<Category[]> | null = null;

async function fetchTaxonomy(): Promise<Category[]> {
  if (memory) return memory;
  if (pending) return pending;
  pending = axios
    .get<{ data: Category[] }>(`${getApiBaseUrl()}/api/v1/categories`, { timeout: 30000 })
    .then((r) => {
      memory = r.data.data ?? [];
      return memory;
    })
    .catch(() => [] as Category[])
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Live taxonomy roots, optionally filtered by kind ('product'/'service').
 * Returns [] until loaded or on failure — callers keep their fallbacks. */
export function useTaxonomy(kind?: "product" | "service"): Category[] {
  const [cats, setCats] = useState<Category[]>(memory ?? []);

  useEffect(() => {
    let active = true;
    fetchTaxonomy().then((data) => {
      if (active) setCats(data);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!kind) return cats;
  return cats.filter((c) => (c.applies_to ?? []).includes(kind));
}
