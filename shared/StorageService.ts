export interface StorageValue {
  value: any;
  expiry?: number;
}

export class StorageService {
  private prefix = "abo_";
  private useAsyncStorage: boolean;

  constructor() {
    // Detect if we are on React Native
    this.useAsyncStorage = typeof AsyncStorage !== "undefined";
  }

  async setItem(key: string, value: any, expiryMinutes?: number): Promise<void> {
    const prefixedKey = `${this.prefix}${key}`;
    const storage: StorageValue = {
      value,
      expiry: expiryMinutes ? Date.now() + expiryMinutes * 60 * 1000 : undefined,
    };

    if (this.useAsyncStorage) {
      // React Native
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem(prefixedKey, JSON.stringify(storage));
    } else {
      // Web
      localStorage.setItem(prefixedKey, JSON.stringify(storage));
    }
  }

  async getItem(key: string): Promise<any | null> {
    const prefixedKey = `${this.prefix}${key}`;
    let stored: string | null = null;

    if (this.useAsyncStorage) {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      stored = await AsyncStorage.getItem(prefixedKey);
    } else {
      stored = localStorage.getItem(prefixedKey);
    }

    if (!stored) return null;

    const { value, expiry } = JSON.parse(stored);

    // Check expiry
    if (expiry && Date.now() > expiry) {
      await this.removeItem(key);
      return null;
    }

    return value;
  }

  async removeItem(key: string): Promise<void> {
    const prefixedKey = `${this.prefix}${key}`;

    if (this.useAsyncStorage) {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.removeItem(prefixedKey);
    } else {
      localStorage.removeItem(prefixedKey);
    }
  }

  async clear(): Promise<void> {
    if (this.useAsyncStorage) {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const keys = await AsyncStorage.getAllKeys();
      const prefixedKeys = keys.filter((k: string) => k.startsWith(this.prefix));
      await AsyncStorage.multiRemove(prefixedKeys);
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  }
}

export const storage = new StorageService();
