# Session & Logout Security — ElderCare OS

## Complete Logout (`POST /api/auth/logout`, `src/context/AuthContext.tsx`)
1. `POST /api/auth/logout` verifies the current JWT, revokes that specific `sessionId` in `user_sessions` (`revoked_at = CURRENT_TIMESTAMP`, `revoked_reason = 'user_logout'`), logs `session_revoked`, clears `eldercare_session` cookie, and returns `Cache-Control: no-store`.
2. Other active sessions for the same user on other devices remain intact unless `POST /api/auth/revoke-all-sessions` is explicitly called.
3. Client `logout()` clears React auth/workspace state, clears `localStorage` and `sessionStorage`, and navigates via `window.location.replace('/login')` so browser back-navigation cannot restore authenticated state.
4. `GET /api/auth/me` returns `Cache-Control: no-store, no-cache, must-revalidate, private`, and `verifyServerSession()` rejects any revoked `user_sessions` row with `401`.
