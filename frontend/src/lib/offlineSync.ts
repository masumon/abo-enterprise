import { getApiBaseUrl } from "@/lib/apiBase";
import { getNetworkQuality } from "@/lib/networkStatus";

interface PendingAction {
  id: string;
  type: "booking" | "lead" | "order" | "service_booking" | "service_lead";
  action: "create" | "update" | "delete";
  data: Record<string, any>;
  timestamp: number;
  retry: number;
  maxRetries: number;
}

const DB_NAME = "aboenterprise";
const DB_VERSION = 1;
const STORES = {
  PENDING_ACTIONS: "pending_actions",
  CACHED_DATA: "cached_data",
};

class OfflineDataSync {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isOnline: boolean = typeof navigator === "undefined" ? true : navigator.onLine;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.onOnline());
      window.addEventListener("offline", () => this.onOffline());
    }
  }

  async init(): Promise<void> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.db = null;
        this.initPromise = null;
        reject(request.error);
      };
      request.onsuccess = async () => {
        this.db = request.result;
        try {
          try {
            await this.clearExpiredCache();
          } catch (error) {
            throw new Error(`Cache cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          try {
            await this.syncPendingActions();
          } catch (error) {
            throw new Error(`Pending action sync failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          resolve();
        } catch (error) {
          this.db = null;
          reject(error);
        } finally {
          this.initPromise = null;
        }
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Pending actions store
        if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
          const store = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: "id" });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Cached data store
        if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
          const store = db.createObjectStore(STORES.CACHED_DATA, { keyPath: "key" });
          store.createIndex("expiry", "expiry", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private onOnline(): void {
    this.isOnline = true;
    console.log("Online detected. Syncing offline actions...");
    this.syncPendingActions();
  }

  private onOffline(): void {
    this.isOnline = false;
    console.log("Offline detected.");
  }

  async addPendingAction(
    type: "booking" | "lead" | "order" | "service_booking" | "service_lead",
    action: "create" | "update" | "delete",
    data: Record<string, any>
  ): Promise<string> {
    if (!this.db) await this.init();

    const actionId = `${type}-${Date.now()}-${Math.random()}`;
    const pendingAction: PendingAction = {
      id: actionId,
      type,
      action,
      data,
      timestamp: Date.now(),
      retry: 0,
      maxRetries: 3,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.PENDING_ACTIONS], "readwrite");
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      const request = store.add(pendingAction);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(actionId);
    });
  }

  async getPendingActions(type?: string): Promise<PendingAction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.PENDING_ACTIONS], "readonly");
      const store = tx.objectStore(STORES.PENDING_ACTIONS);

      let request;
      if (type) {
        request = store.index("type").getAll(type);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async removePendingAction(actionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.PENDING_ACTIONS], "readwrite");
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      const request = store.delete(actionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cacheData(key: string, data: any, expiryMinutes: number = 60): Promise<void> {
    if (!this.db) await this.init();

    const cached = {
      key,
      data,
      expiry: Date.now() + expiryMinutes * 60 * 1000,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CACHED_DATA], "readwrite");
      const store = tx.objectStore(STORES.CACHED_DATA);
      const request = store.put(cached);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CACHED_DATA], "readonly");
      const store = tx.objectStore(STORES.CACHED_DATA);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiry > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();

    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CACHED_DATA], "readwrite");
      const store = tx.objectStore(STORES.CACHED_DATA);
      const index = store.index("expiry");
      const range = IDBKeyRange.upperBound(now);
      const request = index.getAll(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const itemsToDelete = request.result;
        itemsToDelete.forEach((item) => store.delete(item.key));
        resolve();
      };
    });
  }

  async syncPendingActions(): Promise<void> {
    if (!this.isOnline) return;

    const pendingActions = await this.getPendingActions();

    for (const action of pendingActions) {
      try {
        await this.syncAction(action);
        await this.removePendingAction(action.id);
        console.log(`Synced: ${action.id}`);
      } catch (error) {
        action.retry++;
        if (action.retry < action.maxRetries) {
          await this.updatePendingAction(action);
          console.error(`Sync failed, will retry: ${action.id}`, error);
        } else {
          await this.removePendingAction(action.id);
          console.error(`Max retries exceeded: ${action.id}`, error);
        }
      }
    }
  }

  private async syncAction(action: PendingAction): Promise<void> {
    const endpoints: Record<string, string> = {
      booking: "/api/v1/bookings",
      lead: "/api/v1/leads",
      order: "/api/v1/orders",
      service_booking: "/api/v1/service-bookings",
      service_lead: "/api/v1/service-leads",
    };

    const endpoint = endpoints[action.type];
    const method = action.action === "create" ? "POST" : action.action === "update" ? "PATCH" : "DELETE";

    const url = method === "PATCH" || method === "DELETE" 
      ? `${endpoint}/${action.data.id}` 
      : endpoint;

    const apiBase = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutMs = (() => {
      switch (getNetworkQuality()) {
        case "offline":
          return 5000;
        case "slow":
          return 45000;
        case "online":
        default:
          return 20000;
      }
    })();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${apiBase}${url}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method !== "DELETE" ? JSON.stringify(action.data) : undefined,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
  }

  private async updatePendingAction(action: PendingAction): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.PENDING_ACTIONS], "readwrite");
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      const request = store.put(action);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const offlineSync = new OfflineDataSync();
