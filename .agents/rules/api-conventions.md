# REST API Conventions

## URL Structure
- Base path: `/api`
- Resource names are **plural**, **lowercase**, **kebab-case**:
  - ✅ `/api/leads`, `/api/audit-logs`, `/api/lead-notes`
  - ❌ `/api/Lead`, `/api/auditLog`, `/api/leadNote`
- Nested resources for strong ownership:
  - `/api/orders/:orderId/payments` — payments belong to an order
  - `/api/leads/:leadId/notes` — notes belong to a lead
  - `/api/conversations/:conversationId/messages`
- Action endpoints use PATCH with a verb suffix:
  - `PATCH /api/leads/:id/stage` — change lead stage
  - `PATCH /api/users/:id/toggle-active` — toggle user status
  - `PATCH /api/notifications/read-all` — mark all as read
  - `PATCH /api/orders/:id/renew` — renew subscription

## HTTP Methods
| Method | Usage |
|--------|-------|
| GET | Retrieve resource(s) — never mutates data |
| POST | Create a new resource |
| PATCH | Partial update of an existing resource |
| DELETE | Remove a resource |
| PUT | Not used — always use PATCH for updates |

## Request Format
- Content-Type: `application/json`
- All request bodies validated by `class-validator` DTOs.
- Query parameters for filtering, sorting, pagination on GET endpoints.

## Response Format

### Success (Single Resource)
```json
{
  "data": { ... },
  "message": "تم بنجاح"
}
```

### Success (List with Pagination)
```json
{
  "data": [ ... ],
  "meta": {
    "total": 142,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "البريد الإلكتروني غير صالح" }
  ]
}
```

## Pagination
- Default page size: **20**
- Max page size: **100**
- Query params: `?page=1&pageSize=20`
- Always return `meta` object with pagination info.

## Filtering & Search
- Use query parameters for simple filters:
  - `?status=active&stage=negotiation`
- Use `?search=query` for text search across multiple fields.
- Filter values are validated — invalid enum values return 400.

## Sorting
- Use `?sortBy=createdAt&sortOrder=DESC`
- Default sort: `created_at DESC` (newest first).

## Swagger
- Every controller class: `@ApiTags('module-name')`
- Every endpoint: `@ApiOperation({ summary: '...' })`
- Every DTO property: `@ApiProperty({ description: '...' })`
- Auth-protected endpoints: `@ApiBearerAuth()`
- Response types: `@ApiResponse({ status: 200, type: ResponseDto })`

## Versioning
- No versioning for now — single version served at `/api/...`
- Will add `/api/v2/` prefix only when breaking changes are needed.
