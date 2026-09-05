# API Binding Map

| Frontend Feature | Component/Page | Hook/Function | API Method | Endpoint |
| ---------------- | -------------- | ------------- | ---------- | -------- |
| Login | src/auth/login/login.tsx | endpoints.auth.login | POST | /auth/login |
| Institutes | src/section/nabha-management/institute-management/view/institute-list-view.tsx | src/action/institute.ts | GET | /institutes |
| Departments | src/section/Institute-management/department-master/view/department-list-view.tsx | src/action/department.ts | GET | /departments |
| Assignments | src/action/assignment.ts | xiosInstance.post | POST | /assignments |
| Faculty Leaves | src/action/facultyLeave.ts | xiosInstance.post | POST | /faculty-leaves |

> **Note:** These are based on exact bindings found in src/action/ and components using Axios.
