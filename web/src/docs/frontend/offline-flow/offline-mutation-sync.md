# Offline Data Creation & Synchronization Workflow

Ye document explain karta hai ki offline rehne par naya data kaise create karna hai, usse local storage (IndexedDB) mein kaise save karna hai, aur internet wapas aane par usse main database (Backend) mein kaise load/sync karna hai.

---

## 1. Frontend Workflow (React + Dexie + Jotai)

### A. IndexedDB Setup (Sync Queue)
Jab app offline ho, to humein pending API requests (data creation) ko ek queue mein store karna hoga. Iske liye `dexie` mein ek naya table banayenge: `sync_queue`.

**File:** `src/indexDB/db.ts`
```typescript
import Dexie, { Table } from 'dexie';

export interface SyncTask {
  id?: number;          // Auto-increment primary key
  uuid: string;         // Unique ID generated on frontend to prevent duplicates
  module: string;       // e.g., 'assignment', 'student'
  action: string;       // e.g., 'CREATE', 'UPDATE'
  payload: any;         // The actual form data
  status: 'pending' | 'failed';
  createdAt: string;
}

export class AppDB extends Dexie {
  sync_queue!: Table<SyncTask, number>;

  constructor() {
    super('RuralSparkDB');
    this.version(2).stores({
      // Existing tables...
      sync_queue: '++id, uuid, module, status'
    });
  }
}
export const db = new AppDB();
```

### B. Offline Data Creation (Action Hook)
Jab user form submit kare, to check karein ki user online hai ya offline. Agar offline hai, to data ko `sync_queue` mein daal dein.

**File:** `src/action/anyModuleAction.ts`
```typescript
import { db } from '../indexDB/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export const createData = async (payload: any) => {
  const uuid = uuidv4();
  const dataWithId = { ...payload, uuid }; // Attach frontend UUID

  if (!navigator.onLine) {
    // 1. Store in IndexedDB Sync Queue
    await db.sync_queue.add({
      uuid,
      module: 'assignment',
      action: 'CREATE',
      payload: dataWithId,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // 2. Optimistic UI Update (Update Jotai Atom so user sees it immediately)
    // setModuleAtom((prev) => [...prev, dataWithId]);

    toast.info('You are offline. Data saved locally and will sync when online.');
    return;
  }

  // Normal Online Flow
  try {
    await axiosInstance.post('/api/assignments', dataWithId);
    toast.success('Created successfully');
  } catch (error) {
    // Fallback: If network fails during request, add to sync queue
  }
};
```

### C. Background Sync Logic (Jab Internet Wapas Aaye)
App ke root component (jaise `App.tsx` ya `main.tsx`) ya ek global hook mein `online` event listener lagayein.

**File:** `src/hooks/useOfflineSync.ts`
```typescript
import { useEffect } from 'react';
import { db } from '../indexDB/db';
import axiosInstance from '../utils/axios';
import { toast } from 'sonner';

export const useOfflineSync = () => {
  useEffect(() => {
    const syncData = async () => {
      if (!navigator.onLine) return;

      // 1. Fetch pending tasks from IndexedDB
      const pendingTasks = await db.sync_queue.where('status').equals('pending').toArray();
      if (pendingTasks.length === 0) return;

      toast.info(`Syncing ${pendingTasks.length} pending items...`);

      // 2. Send in a batch to the backend
      try {
        const response = await axiosInstance.post('/api/sync/batch', {
          tasks: pendingTasks
        });

        // 3. Remove successfully synced items from IndexedDB
        const syncedIds = response.data.syncedIds; // Array of UUIDs that backend saved successfully
        
        await db.transaction('rw', db.sync_queue, async () => {
          for (const task of pendingTasks) {
            if (syncedIds.includes(task.uuid)) {
              await db.sync_queue.delete(task.id!);
            }
          }
        });

        toast.success('Offline data synced successfully!');
      } catch (error) {
        console.error('Sync failed', error);
      }
    };

    window.addEventListener('online', syncData);
    
    // Attempt sync on app load if already online
    if (navigator.onLine) {
      syncData();
    }

    return () => window.removeEventListener('online', syncData);
  }, []);
};
```

---

## 2. Backend Workflow (AdonisJS / Node.js)

Backend pe ek dedicated route banana hoga jo offline se aane wale saare `tasks` ko bulk mein process kare. UUID (Unique ID) ka use karna zaruri hai taki agar sync 2 baar ho jaye to **duplicate entries na bane**.

### A. Sync Route & Controller
**File:** `start/routes.ts`
```typescript
router.post('/sync/batch', [SyncController, 'processBatch'])
  .use(middleware.auth({ guards: ['api'] }));
```

**File:** `app/Controllers/Http/SyncController.ts`
```typescript
import type { HttpContext } from '@adonisjs/core/http'
// Import your services/models...

export default class SyncController {
  public async processBatch({ request, response }: HttpContext) {
    const { tasks } = request.only(['tasks']);
    const syncedIds: string[] = [];
    const failedIds: string[] = [];

    for (const task of tasks) {
      try {
        // Idempotency check: Make sure this UUID doesn't already exist in the DB
        
        if (task.module === 'assignment' && task.action === 'CREATE') {
          // Check if already created
          const exists = await Assignment.findBy('uuid', task.uuid);
          if (!exists) {
            await Assignment.create({
              ...task.payload,
              uuid: task.uuid
            });
          }
          syncedIds.push(task.uuid); // Mark as success even if it already existed
        }
        
        // Add cases for other modules (student, faculty, etc.)
        else if (task.module === 'student' && task.action === 'CREATE') {
           // ... logic
        }

      } catch (error) {
        console.error(`Failed to sync task ${task.uuid}`, error);
        failedIds.push(task.uuid);
      }
    }

    return response.json({
      success: true,
      syncedIds,
      failedIds
    });
  }
}
```

### B. Database Migration (Adding UUID)
Offline data conflict or duplication rokne ke liye backend models mein ek naya column chahiye `uuid`.

**Migration Example:**
```typescript
table.string('uuid').unique().nullable();
```

---

## Summary of Complete Flow

1. **User action (Offline):** User form submit karta hai bina internet ke.
2. **Frontend Intercept:** Hook internet check karta hai -> Offline hai -> `sync_queue` (IndexedDB) me record daal deta hai `status: 'pending'` ke sath.
3. **Optimistic UI:** User ko screen pe naya data turant dikh jata hai (Jotai Atom me push karke).
4. **Internet Wapas Aata Hai:** `window.addEventListener('online')` trigger hota hai.
5. **Sync API Call:** `useOfflineSync` hook saare pending tasks uthata hai aur `/api/sync/batch` pe POST karta hai.
6. **Backend Processing:** Backend tasks ko loop me check karta hai. Check karta hai UUID pehle se DB me hai ya nahi. Agar nahi hai to main DB table me Save kar deta hai.
7. **Cleanup:** Backend response bhejta hai ki "Ye wale UUIDs save ho gaye". Frontend unhe apne `sync_queue` se delete kar deta hai.
