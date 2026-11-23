# ElderCare OS --- Agent Task: Step 1 Repository Discovery

## Objective

Read the project documentation and inspect the existing codebase before
making implementation changes. The goal is to establish the real
starting point for development and identify what must be preserved,
changed or built.

## Mandatory reading

Read these files completely, in this order:

1.  `docs/README.md`
2.  `docs/PRD.md`
3.  `docs/architecture.md`
4.  `docs/database-schema.md`
5.  `docs/api-specification.md`
6.  `docs/security.md`
7.  `docs/runbook.md`

Do not rely only on filenames or summaries. Read the full contents and
use them as the product baseline.

## Task A --- Inspect the repository

Inspect the current repository without modifying it.

Identify and report:

-   Current folder/repository structure.
-   Frontend framework and version.
-   Backend framework and version.
-   Package manager and workspace/monorepo setup.
-   Database engine, ORM and current migration system.
-   Existing authentication and authorization implementation.
-   Existing file/document storage.
-   Existing background job/queue system.
-   Existing UI component library and styling system.
-   Existing testing, linting, type-checking and build commands.
-   Existing environment variable names (never reveal secret values).
-   Existing deployment and CI configuration.
-   Current Git branch and whether there are uncommitted changes.

Do not print secrets, tokens, passwords, private keys, connection
strings or personal data.

## Task B --- Compare the repository with the documentation

Create a gap analysis with these statuses:

-   `EXISTS` --- implemented and verified in the repository.
-   `PARTIAL` --- present but incomplete or not verified.
-   `MISSING` --- not present.
-   `CONFLICT` --- existing implementation conflicts with the proposed
    architecture or PRD.
-   `UNKNOWN` --- cannot determine from repository inspection.

Review at least:

-   Authentication and RBAC.
-   Organization/branch data scoping.
-   Resident management.
-   Rescue management.
-   Admissions.
-   Medical records and medication workflows.
-   Attendance and resident movement.
-   Visitor management.
-   Events and daily activities.
-   Staff and volunteer management.
-   Rooms and bed allocation.
-   Document vault and private storage.
-   OCR/AI document extraction.
-   Dynamic form generation and versioning.
-   Finance and donations.
-   Tasks and notifications.
-   Reports and exports.
-   Audit logs.
-   Backup and restore procedures.
-   Security controls and tests.

For each finding, cite the relevant repository file path and explain
whether the feature is actually functional, only a UI placeholder, or
not implemented.

## Task C --- Validate the proposed technical direction

Check whether the proposed architecture can fit the existing codebase.

Do not replace a working technology just because the documents mention a
preferred option. Recommend reuse where practical.

Identify decisions that must be confirmed before schema migrations,
including:

1.  One old age home, multiple branches of one NGO, or multiple
    independent NGOs.
2.  Expected resident count and staff accounts.
3.  Online-only or offline-capable operation.
4.  Existing authentication provider and database.
5.  Hosting and storage provider.
6.  OCR/AI provider, data region and budget.
7.  English/Hindi UI and document-processing requirements.
8.  Public rescue/admission forms and family portal scope.

Use the current PRD's planning assumption only where a decision is not
yet confirmed. Mark assumptions clearly.

## Task D --- Deliverables

Create or update the following files under `docs/`:

### `repository-audit.md`

Include: - Repository summary. - Current stack. - Current
architecture. - Existing modules and their actual implementation
status. - Existing scripts and how to run them. - Existing tests and
current test coverage evidence. - Infrastructure and integration
inventory. - Risks and preservation notes.

### `gap-analysis.md`

Include a module-by-module comparison against the PRD with status,
evidence (file paths), risks and recommended next action.

### `open-decisions.md`

List unresolved product and technical decisions, why each matters, a
recommended default and what is blocked until it is answered.

## Strict rules

-   Do not modify application source code in this task.
-   Do not create, alter or apply database migrations.
-   Do not delete files, dependencies, configuration or existing UI.
-   Do not run destructive commands.
-   Do not deploy.
-   Do not introduce Docker unless the product owner explicitly requests
    it.
-   Do not use real resident, medical, identity or financial data for
    testing.
-   Do not claim a feature works unless you have inspected and tested
    the relevant path.
-   Preserve existing local changes and uncommitted work.
-   If a command may modify files or state, explain it before running
    it.

## Final response format

Return a concise report with:

1.  Documentation read confirmation (list all seven files).
2.  Current repository stack.
3.  What already works.
4.  What is incomplete or missing.
5.  Any conflicts with the proposed architecture.
6.  Critical open decisions.
7.  Recommended next implementation step.
8.  Commands/tests executed and their results.
9.  Paths to `repository-audit.md`, `gap-analysis.md` and
    `open-decisions.md`.

Stop after repository discovery and reporting. Wait for approval before
implementing or changing the database.
