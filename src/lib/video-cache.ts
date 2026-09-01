/**
 * IndexedDB Video Cache for SUBTHAITLE
 * Persists uploaded video Blobs/Files in the user's browser storage
 * so reopening Recent Projects restores the full video and re-renders automatically.
 */

const DB_NAME = 'subthaitle_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'project_videos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideoToCache(key: string, file: File | Blob): Promise<void> {
  if (!key || !file) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: key,
        blob: file,
        name: file instanceof File ? file.name : 'video.mp4',
        type: file.type || 'video/mp4',
        size: file.size,
        updatedAt: Date.now(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[VideoCache] Failed to save video to IndexedDB:', err);
  }
}

export async function getVideoFromCache(key: string): Promise<File | Blob | null> {
  if (!key) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[VideoCache] Failed to retrieve video from IndexedDB:', err);
    return null;
  }
}

export async function deleteVideoFromCache(key: string): Promise<void> {
  if (!key) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[VideoCache] Failed to delete video from IndexedDB:', err);
  }
}
