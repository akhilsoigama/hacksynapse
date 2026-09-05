# Frontend API Binding Documentation

## API Client

**API Client:**
src/utils/axios.ts

**HTTP Library:**
Axios

**Base URL:**
Configured via environment variables / interceptors in xios.ts (e.g. import.meta.env.VITE_APP_BASE_URL generally).

**Authentication:**
The xios.ts file configures interceptors to attach authentication tokens to outbound requests. If an API request fails with a 401 Unauthorized, the error handler typically redirects to the login screen or refreshes the token.

## Global Request Flow
1. React Component uses a hook or calls an action directly from src/action/.
2. The action uses xiosInstance (or etcher) from src/utils/axios.ts to make HTTP requests.
3. Errors are captured using xios.isAxiosError(error) and passed to a centralized error handler (src/utils/errorHandler.ts).
