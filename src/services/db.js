import { fsGet, fsGetAll, fsPut, fsDelete, fsClearStore } from './firebase.js';
import { appState } from './appState.js';

// IndexedDB + Cloud Firestore Dual Sync Database Manager
const DB_NAME = 'FitnessCoachDB';
const DB_VERSION = 2;

class HybridDBManager {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('user')) {
          db.createObjectStore('user', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('daily_logs')) {
          db.createObjectStore('daily_logs', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('user_progress')) {
          db.createObjectStore('user_progress', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chat_history')) {
          const chatStore = db.createObjectStore('chat_history', { keyPath: 'id', autoIncrement: true });
          chatStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getStore(storeName, mode = 'readonly') {
    await this.initPromise;
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // Local IndexedDB direct getter
  async getLocal(storeName, key) {
    try {
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // Local IndexedDB direct setter
  async putLocal(storeName, item) {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve) => {
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Local-First GET: Fast instant response from IndexedDB, background sync from Cloud Firestore
   */
  async get(storeName, key) {
    const localItem = await this.getLocal(storeName, key);
    if (localItem) {
      // Sync in background to keep local DB fresh without blocking UI
      fsGet(storeName, key).then(cloudItem => {
        if (cloudItem) this.putLocal(storeName, cloudItem);
      }).catch(() => {});
      return localItem;
    }
    // Fallback if not cached locally
    const cloudItem = await fsGet(storeName, key);
    if (cloudItem) {
      this.putLocal(storeName, cloudItem);
      return cloudItem;
    }
    return null;
  }

  /**
   * Local-First GET ALL: Instant local IndexedDB load + background Cloud sync
   */
  async getAll(storeName) {
    const localItems = await this.getLocalAll(storeName);
    if (Array.isArray(localItems) && localItems.length > 0) {
      fsGetAll(storeName).then(cloudItems => {
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          cloudItems.forEach(item => this.putLocal(storeName, item));
        }
      }).catch(() => {});
      return localItems;
    }

    const cloudItems = await fsGetAll(storeName);
    if (Array.isArray(cloudItems) && cloudItems.length > 0) {
      cloudItems.forEach(item => this.putLocal(storeName, item));
      return cloudItems;
    }
    return [];
  }

  async getLocalAll(storeName) {
    try {
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Dual PUT: Save to local IndexedDB immediately AND upload to Cloud Firestore
   */
  async put(storeName, item) {
    // Save to local cache for instant UI response
    await this.putLocal(storeName, item);
    // Sync asynchronously to Cloud Firestore
    fsPut(storeName, item).catch(err => {
      console.warn(`[Cloud Sync] fsPut warn for ${storeName}:`, err.message);
    });
    return item;
  }

  /**
   * Dual DELETE: Delete from local IndexedDB AND Cloud Firestore
   */
  async delete(storeName, key) {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      store.delete(key);
    } catch (e) {
      console.warn('Local delete warn:', e.message);
    }
    await fsDelete(storeName, key);
    return true;
  }

  async clearStore(storeName) {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      store.clear();
    } catch (e) {
      console.warn('Local clear warn:', e.message);
    }
    return true;
  }

  /**
   * Complete Web Data Purge: Closes DB connection, clears local stores & Cloud Firestore, deletes DB & web storage
   */
  async clearAllData() {
    const STORES = ['user', 'goals', 'daily_logs', 'photos', 'user_progress', 'chat_history', 'settings'];

    // 1. Purge Cloud Firestore backend data
    try {
      await Promise.allSettled(STORES.map(s => fsClearStore(s)));
    } catch (e) {
      console.warn('Cloud Firestore purge error:', e);
    }

    // 2. Clear local IndexedDB stores
    try {
      if (this.db) {
        for (const storeName of STORES) {
          try {
            if (this.db.objectStoreNames.contains(storeName)) {
              const tx = this.db.transaction(storeName, 'readwrite');
              tx.objectStore(storeName).clear();
            }
          } catch (e) {
            console.warn('Clear store warn:', e);
          }
        }
        this.db.close();
        this.db = null;
      }
    } catch (e) {
      console.warn('DB close error:', e);
    }

    // 3. Delete IndexedDB database
    try {
      indexedDB.deleteDatabase(DB_NAME);
    } catch (e) {
      console.warn('Delete DB error:', e);
    }

    // 4. Clear LocalStorage and SessionStorage & RAM State
    try {
      appState.reset();
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}

    this.initPromise = this.initDB();
  }
}

export const dbManager = new HybridDBManager();

