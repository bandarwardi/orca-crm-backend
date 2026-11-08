# orca CRM Backend — NestJS API

## Project Overview
Backend REST API for the orca CRM system — a multi-tenant CRM for IPTV 
subscription companies serving Arab-American customers in the US.
Built with NestJS 11 + TypeORM + MySQL 8.

The Angular frontend already exists at `f:\apps\orca\crm` and currently 
runs on mock data. This backend replaces all mock data with real API endpoints.

## Source of Truth
- The frontend Angular code at `f:\apps\orca\crm\src\app\features\` 
  defines the exact data shapes each screen expects.
- The backend plan at `f:\apps\orca\crm\docs\BACKEND_PLAN.md` is the 
  canonical reference for database schema, endpoints, and architecture.

## Detailed Rules
Read these BEFORE working on any task:
- `.agents/rules/tech-stack.md` — framework versions, packages, and patterns
- `.agents/rules/architecture.md` — folder structure and module boundaries
- `.agents/rules/database.md` — schema conventions and TypeORM patterns
- `.agents/rules/multi-tenant.md` — tenant isolation enforcement
- `.agents/rules/security.md` — sensitive data handling and auth
- `.agents/rules/api-conventions.md` — REST API design standards
- `.agents/rules/testing.md` — test coverage expectations
- `.agents/rules/git-conventions.md` — commit and PR conventions

## Non-Negotiables
- Every database table MUST include `tenant_id` (except the `tenants` table itself).
- Every query MUST be scoped by `tenant_id` — no cross-tenant data leaks.
- Device MAC addresses, Device Keys, and usernames are SENSITIVE — 
  never log them, never expose in error responses.
- All DTOs use `class-validator` decorators — never trust raw input.
- Every endpoint MUST have Swagger decorators.
- Use UUID v4 for all primary keys — never auto-increment integers.

## Before Making Structural Changes
Always propose the plan first (which modules/files will change) 
before generating code for anything beyond a single file edit.
