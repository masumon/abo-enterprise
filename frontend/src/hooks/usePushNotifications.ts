import { useEffect, useState } from "react";

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  data?: Record<string, any>;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      initServiceWorker();
    }
  }, []);

  async function initServiceWorker() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      setRegistration(reg);
      checkSubscription(reg);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  async function checkSubscription(reg: ServiceWorkerRegistration) {
    try {
      const subscription = await reg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }

  async function requestNotificationPermission() {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Notification permission request failed:", error);
      return false;
    }
  }

  async function showLocalNotification(options: PushNotificationOptions) {
    if (!registration) return;

    try {
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || "/icons/icon-192.png",
        badge: options.badge || "/icons/icon-192.png",
        tag: options.tag || "default",
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
        data: options.data || {},
      } as NotificationOptions & { actions?: Array<{ action: string; title: string }> });
    } catch (error) {
      console.error("Show notification failed:", error);
    }
  }

  async function subscribeToPushNotifications(vapidKey: string) {
    if (!registration || !isSupported) return false;

    try {
      const permission = await requestNotificationPermission();
      if (!permission) return false;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      setIsSubscribed(true);

      // Save subscription to backend
      await fetch("/api/v1/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      return true;
    } catch (error) {
      console.error("Push subscription failed:", error);
      return false;
    }
  }

  async function unsubscribeFromPushNotifications() {
    if (!registration) return false;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        return true;
      }
    } catch (error) {
      console.error("Unsubscribe failed:", error);
    }
    return false;
  }

  return {
    isSupported,
    isSubscribed,
    requestNotificationPermission,
    showLocalNotification,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
  };
}
