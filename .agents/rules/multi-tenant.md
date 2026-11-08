# Multi-Tenant Rules

## Core Principle
Every API request operates within a single tenant context.
The `tenant_id` is extracted from the JWT token payload and injected
into every database query automatically.

## How Tenant Context Flows

1. User logs in → JWT token includes `tenantId` in payload.
2. `JwtStrategy` validates the token and attaches `{ userId, tenantId, role }` 
   to `request.user`.
3. `TenantInterceptor` (global) reads `request.user.tenantId` and makes 
   it available via `@TenantId()` decorator.
4. Every service method that touches the database receives `tenantId` 
   as its first parameter (or uses it from the injected context).
5. Every TypeORM query includes `WHERE tenant_id = :tenantId`.

## Implementation Pattern

### Custom Decorator:
```typescript
// @TenantId() extracts tenantId from the request
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);
```

### Service Pattern:
```typescript
// Every service method is scoped by tenantId
async findAll(tenantId: string): Promise<Lead[]> {
  return this.leadRepo.find({
    where: { tenantId },
    relations: ['customer', 'assignedTo'],
  });
}
```

### Controller Pattern:
```typescript
@Get()
findAll(@TenantId() tenantId: string) {
  return this.leadsService.findAll(tenantId);
}
```

## Strict Rules
- **NEVER** write a query without `tenant_id` in the WHERE clause.
- **NEVER** let a user from tenant A see data from tenant B.
- **NEVER** pass `tenant_id` from the client request body or query 
  params — always extract it from JWT.
- **NEVER** hardcode a tenant ID anywhere in the code.
- When joining tables, ensure both sides of the join belong to the 
  same tenant (TypeORM relations handle this via foreign keys).
- Unique constraints (email, order_number, etc.) are always 
  scoped per-tenant using composite unique indexes.
