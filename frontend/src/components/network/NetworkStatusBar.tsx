"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, AlertTriangle, Loader2 } from "lucide-react";
import {
  getNetworkQuality,
  isConstrainedNetwork,
  isOffline,
  isCellularNetwork,
} from "@/lib/networkStatus";

type NetworkQuality = "online" | "offline" | "slow";

interface NetworkStatus {
  quality: NetworkQuality;
  isConstrained: boolean;
  isCellular: boolean;
  isOff: boolean;
}

export default function NetworkStatusBar() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setStatus({
        quality: getNetworkQuality(),
        isConstrained: isConstrainedNetwork(),
        isCellular: isCellularNetwork(),
        isOff: isOffline(),
      });
    };

    updateStatus();

    const handleOnline = () => {
      updateStatus();
      setIsVisible(false);
    };

    const handleOffline = () => {
      updateStatus();
      setIsVisible(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!status) return null;

  // Only show if offline or on constrained network
  if (!status.isOff && !status.isConstrained) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
        status.isOff
          ? "bg-red-50 text-red-700 border-b border-red-200"
          : "bg-amber-50 text-amber-700 border-b border-amber-200"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {status.isOff ? (
          <WifiOff className="w-4 h-4 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        )}

        <span>
          {status.isOff ? (
            "আপনি অফলাইন আছেন — সীমিত কার্যকারিতা উপলব্ধ"
          ) : status.isCellular ? (
            "মোবাইল নেটওয়ার্ক — কিছু কাজ ধীর হতে পারে"
          ) : (
            "ধীর ইন্টারনেট সংযোগ — দয়া করে অপেক্ষা করুন"
          )}
        </span>

        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
      </div>
    </div>
  );
}
