# Testing Conventions

## Philosophy
- Test business logic (services), not framework wiring.
- Every service method that contains logic MUST have a unit test.
- Every controller endpoint MUST have at least one e2e test.
- Tests are NOT optional — they are part of the definition of done.

## File Naming
- Unit tests: `*.spec.ts` (co-located with the source file)
- E2E tests: `*.e2e-spec.ts` (in the `test/` directory)

## Unit Tests (Jest)
- Test services in isolation — mock all dependencies.
- Use `Test.createTestingModule()` from `@nestjs/testing`.
- Mock TypeORM repositories with `getRepositoryToken()`.
- Test all edge cases: empty results, not found, validation errors, 
  tenant isolation violations.

```typescript
// Example: leads.service.spec.ts
describe('LeadsService', () => {
  it('should only return leads for the given tenant', async () => {
    // Arrange: seed mock data for 2 different tenants
    // Act: call findAll(tenantIdA)
    // Assert: result contains ONLY tenantA leads
  });

  it('should throw NotFoundException when lead does not exist', async () => {
    // ...
  });
});
```

## E2E Tests
- Use `supertest` with the NestJS testing module.
- Test the full request → response cycle.
- Seed test data in `beforeAll`, clean up in `afterAll`.
- Test auth: unauthenticated requests return 401.
- Test RBAC: unauthorized role returns 403.
- Test tenant isolation: user from tenant A cannot access tenant B data.

## Coverage Requirements
- Minimum **80%** line coverage for services.
- Minimum **70%** line coverage overall.
- Run with: `npm run test:cov`

## What NOT to Test
- TypeORM entity definitions (they're just metadata).
- DTOs (class-validator handles validation).
- Module wiring (NestJS handles this).
- Third-party library internals.
