interface PendingAction {
  id: string;
  type: "booking" | "lead" | "order";
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
  private isOnline = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      window.addEventListener("online", () => this.onOnline());
      window.addEventListener("offline", () => this.onOffline());
    }
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
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
    type: "booking" | "lead" | "order",
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
    };

    const endpoint = endpoints[action.type];
    const method = action.action === "create" ? "POST" : action.action === "update" ? "PATCH" : "DELETE";

    const url = method === "PATCH" || method === "DELETE" 
      ? `${endpoint}/${action.data.id}` 
      : endpoint;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method !== "DELETE" ? JSON.stringify(action.data) : undefined,
    });

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
