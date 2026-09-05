# StudentQuery Module - Complete Flow (Offline/Online & Data Isolation)

## Objective
Implement robust offline reading, offline data creation (mutation), and strict **Data Isolation (Tenant, Ownership & ID-Wise Access)** for the `studentQuery` module.

---

## 1. ID-Wise Access Control & Data Isolation (Row-Level Security)

Is module me na sirf list APIs balki single record (ID-wise) APIs par bhi strict security lagani hogi.

### A. ID-Wise Access (GET, PUT, DELETE by ID)
Jab bhi koi user kisi specific record ko uske **ID** se access karega (e.g., `/api/studentQuery/:id`), to backend ye verify karega:
- **Ownership Check:** Record ka `created_by` ID logged-in user ki ID se match hona chahiye (agar wo creator hai).
- **Institute Key Check:** Record ka `institute_id` logged-in user ke `institute_id` se match hona chahiye.
- **Unauthorized Handling:** Agar user dusre institute ka ID access karne ki koshish karta hai, to system ko `403 Forbidden` return karna chahiye, jisse frontend par error handler catch kar le.

### B. List Filtering (GET All)
- Jis user ne record create kiya hai, usse list me wahi data show hoga. 
- Backend Controller me `where('created_by', auth.user.id)` aur `where('institute_id', auth.user.institute_id)` automatically filter karega.

### C. Student & Department Specific Filtering
- Agar user `Student` hai, to system sirf uske `institute_id` aur `department_id` se linked record return karega.
- Offline mode me, frontend `getStudentQueryDB()` array filter karega: 
  `data.filter(item => item.instituteId === user.instituteId && item.departmentId === user.departmentId)`

---

## 2. Offline Reading (Data Fetching & Caching)

### A. IndexedDB Setup
**File:** `src/indexDB/studentQuery.ts`
- Functions: `getStudentQueryDB()`, `setStudentQueryDB(data)`, `clearStudentQueryDB()`, and `getStudentQueryByIdDB(id)`.
- Schema: `src/indexDB/db.ts` mein `studentQuery` table (e.g. `++id, uuid, instituteId, departmentId, createdBy`).

### B. Fetch Hook
**File:** `src/action/studentQuery.ts`
- Online hone par API se filtered data aayega.
- Offline hone par `getStudentQueryDB()` ko call karein aur tenant/ID based filter laga kar state update karein.

---

## 3. Offline Data Creation & Mutation Sync

### A. Sync Queue Setup
**File:** `src/indexDB/db.ts`
```typescript
studentQuery_sync_queue: '++id, uuid, action, status, instituteId, departmentId, createdBy'
```

### B. Offline Data Creation (Action)
**File:** `src/action/studentQuery.ts`
1. **Payload Prep:** Frontend data object me `uuid`, `instituteId`, aur `departmentId` inject karega (Jotai Auth state se).
2. **Offline Check:** Agar offline hai, to record `studentQuery_sync_queue` me jayega. UI turant update hoga.
3. **Online Mode:** Seedhe `POST /api/studentQuery` hit hoga.

### C. Background Sync Logic
**File:** `src/hooks/useStudentQueryOfflineSync.ts`
- `online` event fire hone par, `studentQuery_sync_queue` se pending tasks nikal kar bulk me `POST /api/studentQuery/sync` par bheje jayenge.

---

## 4. Backend Workflow (Controller Enforcement)

**Routes:**
- `POST /api/studentQuery/sync`
- `GET /api/studentQuery`
- `GET /api/studentQuery/:id` (ID-Wise Access)
- `PUT /api/studentQuery/:id` (ID-Wise Update)
- `DELETE /api/studentQuery/:id` (ID-Wise Delete)

**Logic Execution in `StudentQueryController`:**
- Bulk create (sync) karte waqt backend `auth.user.institute_id` overwrite karega.
- `show`, `update`, `destroy` routes pe sabse pehle `record.institute_id === auth.user.institute_id` check hoga, nahi to `Abort(403)`.

---

## Checklist for StudentQuery Module
- [ ] Enforce ID-Wise access control (`show`, `update`, `delete`) based on ownership and institute boundary in backend.
- [ ] Implement Offline ID-wise fetch fallback: `getStudentQueryByIdDB(id)` verifying tenant scope.
- [ ] Ensure all `GET` routes strictly return data matching user's `institute_id` and `department_id` (for Students).
- [ ] Add Tenant/Ownership properties into Sync queue schema.
