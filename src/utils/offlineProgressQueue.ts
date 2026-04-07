/**
 * Offline Progress Queue using IndexedDB
 * 
 * This utility manages a queue of progress updates that couldn't be synced
 * to Supabase due to network issues. Updates are stored locally and synced
 * when the connection is restored.
 */

const DB_NAME = 'ReadingProgressDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineProgressUpdates';

export interface OfflineProgressUpdate {
  id: string;
  bookId: string;
  userId: string;
  currentPage: number;
  totalPages: number;
  progressPercentage: number;
  isCompleted: boolean;
  timestamp: string;
  synced: boolean;
}

/**
 * Initialize IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for efficient querying
        objectStore.createIndex('bookId', 'bookId', { unique: false });
        objectStore.createIndex('userId', 'userId', { unique: false });
        objectStore.createIndex('synced', 'synced', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        
        console.log('✅ IndexedDB - Created offlineProgressUpdates store');
      }
    };
  });
}

/**
 * Add a progress update to the offline queue
 */
export async function queueProgressUpdate(update: Omit<OfflineProgressUpdate, 'id' | 'synced'>): Promise<void> {
  try {
    const db = await openDatabase();
    
    const progressUpdate: OfflineProgressUpdate = {
      ...update,
      id: `${update.userId}_${update.bookId}_${Date.now()}`,
      synced: false
    };

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.add(progressUpdate);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ IndexedDB - Progress update queued:', progressUpdate.id);
        resolve();
      };
      transaction.onerror = () => {
        reject(new Error('Failed to queue progress update'));
      };
    });

    db.close();
  } catch (error) {
    console.error('❌ IndexedDB - Error queueing progress update:', error);
    throw error;
  }
}

/**
 * Get all unsynced progress updates
 */
export async function getUnsyncedUpdates(): Promise<OfflineProgressUpdate[]> {
  try {
    const db = await openDatabase();
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('synced');
    
    const request = index.getAll(IDBKeyRange.only(false)); // Get all where synced = false

    const updates = await new Promise<OfflineProgressUpdate[]>((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error('Failed to get unsynced updates'));
      };
    });

    db.close();
    
    console.log(`📦 IndexedDB - Found ${updates.length} unsynced updates`);
    return updates;
  } catch (error) {
    console.error('❌ IndexedDB - Error getting unsynced updates:', error);
    return [];
  }
}

/**
 * Mark a progress update as synced
 */
export async function markUpdateAsSynced(updateId: string): Promise<void> {
  try {
    const db = await openDatabase();
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get(updateId);
    
    getRequest.onsuccess = () => {
      const update = getRequest.result;
      if (update) {
        update.synced = true;
        store.put(update);
      }
    };

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ IndexedDB - Update marked as synced:', updateId);
        resolve();
      };
      transaction.onerror = () => {
        reject(new Error('Failed to mark update as synced'));
      };
    });

    db.close();
  } catch (error) {
    console.error('❌ IndexedDB - Error marking update as synced:', error);
    throw error;
  }
}

/**
 * Delete a progress update from the queue
 */
export async function deleteProgressUpdate(updateId: string): Promise<void> {
  try {
    const db = await openDatabase();
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.delete(updateId);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ IndexedDB - Update deleted:', updateId);
        resolve();
      };
      transaction.onerror = () => {
        reject(new Error('Failed to delete update'));
      };
    });

    db.close();
  } catch (error) {
    console.error('❌ IndexedDB - Error deleting update:', error);
    throw error;
  }
}

/**
 * Clear all synced updates (cleanup)
 */
export async function clearSyncedUpdates(): Promise<void> {
  try {
    const db = await openDatabase();
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('synced');
    
    const request = index.openCursor(IDBKeyRange.only(true));
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ IndexedDB - Cleared synced updates');
        resolve();
      };
      transaction.onerror = () => {
        reject(new Error('Failed to clear synced updates'));
      };
    });

    db.close();
  } catch (error) {
    console.error('❌ IndexedDB - Error clearing synced updates:', error);
    throw error;
  }
}

/**
 * Get the most recent progress update for a specific book
 */
export async function getLatestProgressForBook(
  userId: string,
  bookId: string
): Promise<OfflineProgressUpdate | null> {
  try {
    const db = await openDatabase();
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.getAll();

    const updates = await new Promise<OfflineProgressUpdate[]>((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error('Failed to get progress updates'));
      };
    });

    db.close();

    // Filter by userId and bookId, then sort by timestamp
    const bookUpdates = updates
      .filter(u => u.userId === userId && u.bookId === bookId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return bookUpdates.length > 0 ? bookUpdates[0] : null;
  } catch (error) {
    console.error('❌ IndexedDB - Error getting latest progress:', error);
    return null;
  }
}
