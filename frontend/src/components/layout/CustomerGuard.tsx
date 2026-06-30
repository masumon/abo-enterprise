"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCustomerStore } from "@/store/customer";

export default function CustomerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoggedIn } = useCustomerStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useCustomerStore.persist.rehydrate();
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !isLoggedIn()) router.replace("/login");
  }, [ready, isLoggedIn, router]);

  if (!ready || !isLoggedIn()) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}
