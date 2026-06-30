import { useEffect, useState } from "react";
import { paymentMethodsPublicApi, type PaymentMethodRecord } from "@/lib/api";

let cache: PaymentMethodRecord[] | null = null;
let pending: Promise<PaymentMethodRecord[]> | null = null;

async function fetchMethods(): Promise<PaymentMethodRecord[]> {
  if (cache) return cache;
  if (pending) return pending;
  pending = paymentMethodsPublicApi
    .list()
    .then((r) => {
      cache = (r.data.data ?? []) as PaymentMethodRecord[];
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    fetchMethods().then((data) => {
      setMethods(data);
      setLoading(false);
    });
  }, []);

  return { methods, loading };
}

export function invalidatePaymentMethodsCache() {
  cache = null;
}
