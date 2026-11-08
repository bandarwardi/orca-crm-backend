# Git Conventions

## Commit Messages
Use Conventional Commits format:
- `feat: add leads CRUD endpoints`
- `fix: tenant isolation on orders query`
- `refactor: extract TenantBaseEntity`
- `docs: add Swagger decorators to users controller`
- `test: add e2e tests for auth module`
- `chore: update dependencies`

## Branch Naming
- Feature: `feat/leads-module`
- Fix: `fix/tenant-leak-orders`
- Refactor: `refactor/base-entity`

## PR Rules
- One module per PR where possible.
- Every PR must pass: lint, unit tests, e2e tests.
- PR title follows conventional commit format.
- Include migration files in the same PR as the entity changes.
