export type NotificationType = 
  | "booking_created" 
  | "booking_confirmed" 
  | "booking_completed"
  | "lead_created"
  | "lead_qualified"
  | "order_placed"
  | "order_shipped"
  | "payment_received"
  | "system_alert";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

class NotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  async init(registration: ServiceWorkerRegistration) {
    this.registration = registration;
    this.setupNotificationClickListener();
  }

  private setupNotificationClickListener() {
    if (!this.registration) return;

    self.addEventListener("notificationclick", (event: any) => {
      const notification = event.notification;
      const action = event.action;
      const data = notification.data;

      notification.close();

      const urlToOpen = this.getUrlForNotification(data.type, data);

      event.waitUntil(
        (self as any).clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients: any[]) => {
          // Check if window already open
          const existingWindow = clients.find((client: any) => client.url === urlToOpen);
          if (existingWindow) {
            return existingWindow.focus();
          }
          // Open new window
          return (self as any).clients.openWindow(urlToOpen);
        })
      );
    });
  }

  private getUrlForNotification(type: NotificationType, data: Record<string, any>): string {
    switch (type) {
      case "booking_created":
      case "booking_confirmed":
      case "booking_completed":
        return `/bookings/${data.booking_id || ""}`;

      case "lead_created":
      case "lead_qualified":
        return `/projects`;

      case "order_placed":
      case "order_shipped":
        return `/orders/${data.order_id || ""}`;

      case "payment_received":
        return `/orders/${data.order_id || ""}`;

      default:
        return "/";
    }
  }

  async sendNotification(payload: NotificationPayload) {
    if (!this.registration) return;

    try {
      await this.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.type,
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
        data: {
          type: payload.type,
          ...payload.data,
        },
      });
    } catch (error) {
      console.error("Send notification failed:", error);
    }
  }

  getNotificationData(type: NotificationType): NotificationPayload {
    const templates: Record<NotificationType, NotificationPayload> = {
      booking_created: {
        type: "booking_created",
        title: "বুকিং নিশ্চিত করা হয়েছে",
        body: "আপনার সেবা বুকিং সফলভাবে তৈরি হয়েছে।",
        requireInteraction: false,
      },
      booking_confirmed: {
        type: "booking_confirmed",
        title: "বুকিং নিশ্চিত",
        body: "আপনার বুকিং আমাদের দল দ্বারা নিশ্চিত করা হয়েছে।",
        requireInteraction: true,
      },
      booking_completed: {
        type: "booking_completed",
        title: "সেবা সম্পন্ন",
        body: "আপনার সেবা সম্পন্ন হয়েছে। পর্যালোচনা দিন।",
        requireInteraction: false,
      },
      lead_created: {
        type: "lead_created",
        title: "প্রকল্প জমা দেওয়া হয়েছে",
        body: "আপনার প্রকল্প অনুসন্ধান সফলভাবে জমা দেওয়া হয়েছে।",
        requireInteraction: false,
      },
      lead_qualified: {
        type: "lead_qualified",
        title: "প্রকল্প যোগ্য",
        body: "আপনার প্রকল্প আমাদের পরবর্তী পর্যায়ে অনুমোদিত হয়েছে।",
        requireInteraction: true,
      },
      order_placed: {
        type: "order_placed",
        title: "অর্ডার নিশ্চিত",
        body: "আপনার অর্ডার সফলভাবে নিশ্চিত করা হয়েছে।",
        requireInteraction: false,
      },
      order_shipped: {
        type: "order_shipped",
        title: "অর্ডার পাঠানো হয়েছে",
        body: "আপনার অর্ডার পাঠানো হয়েছে। ট্র্যাকিং বিবরণ দেখুন।",
        requireInteraction: false,
      },
      payment_received: {
        type: "payment_received",
        title: "পেমেন্ট পাওয়া গেছে",
        body: "আপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে।",
        requireInteraction: false,
      },
      system_alert: {
        type: "system_alert",
        title: "সিস্টেম বিজ্ঞপ্তি",
        body: "গুরুত্বপূর্ণ সিস্টেম আপডেট উপলব্ধ।",
        requireInteraction: true,
      },
    };

    return templates[type];
  }
}

export const notificationManager = new NotificationManager();
