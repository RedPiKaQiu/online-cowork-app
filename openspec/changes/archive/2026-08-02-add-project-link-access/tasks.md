## 1. Secure snapshot service

- [x] 1.1 Define browser-safe project, member, task and board snapshot DTOs.
- [x] 1.2 Implement token-hash lookup for active projects and ordered, project-scoped snapshot queries.
- [x] 1.3 Add unit coverage for valid snapshots, ordering, isolation and invalid/deleted tokens.

## 2. Project access surfaces

- [x] 2.1 Add `GET /api/projects/:token` with the shared snapshot service and uniform not-found response.
- [x] 2.2 Add the `/p/[token]` server page with the same invalid-link experience.
- [x] 2.3 Build a read-only board client that renders the supplied project, members and grouped tasks without demo data.

## 3. Verification

- [x] 3.1 Run targeted tests plus lint, typecheck and production build; resolve any regressions.
- [x] 3.2 Validate the OpenSpec change in strict mode.
