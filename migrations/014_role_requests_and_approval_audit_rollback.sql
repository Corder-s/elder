-- ElderCare OS — Stage 3B-9 Rollback (Non-Destructive)

BEGIN;

DROP TABLE IF EXISTS role_assignment_history;
DROP TABLE IF EXISTS registration_requests;

COMMIT;
