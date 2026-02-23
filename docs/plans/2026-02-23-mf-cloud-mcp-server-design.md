# MF Cloud MCP Server — Design Document

**Date**: 2026-02-23
**Author**: Yusuke Fukuju (Noahlogy)
**Status**: Approved

## Overview

A unified MCP (Model Context Protocol) Server that provides Claude Code (and other MCP-compatible AI tools) with direct access to Money Forward Cloud APIs for accounting workflow automation.

## Goals

- Enable Claude Code to perform expense management and invoice operations via natural language
- Provide automated OAuth 2.0 token management with browser-based initial authentication
- Publish as an npm package for easy installation (`npx @noahlogy/mf-cloud-mcp-server`)

## Non-Goals

- MF Cloud Accounting (会計) API integration (closed/limited API)
- MF Cloud Payroll (給与), Attendance (勤怠) integration
- Building a web UI or dashboard

## Architecture

### Approach: Unified Monolith MCP Server

Single MCP Server integrating Expense and Invoice services. OAuth token management is centralized since MF Cloud uses a shared authorization server.

### Project Structure

```
mf-cloud-mcp-server/
├── src/
│   ├── index.ts                 # MCP Server entry point (stdio transport)
│   ├── auth/
│   │   ├── oauth-client.ts      # OAuth 2.0 Authorization Code Flow
│   │   ├── token-store.ts       # Token persistence (~/.mf-cloud/tokens.json)
│   │   └── callback-server.ts   # Temporary HTTP server for OAuth callback
│   ├── client/
│   │   └── mf-api-client.ts     # Shared HTTP client (auto auth headers)
│   ├── tools/
│   │   ├── expense/             # Cloud Expense tools
│   │   │   ├── transactions.ts  # Expense transaction CRUD
│   │   │   ├── reports.ts       # Expense reports & approvals
│   │   │   ├── journals.ts      # Journal entries from expense data
│   │   │   ├── masters.ts       # Departments, projects, positions, categories
│   │   │   └── members.ts       # Employee management
│   │   ├── invoice/             # Cloud Invoice tools
│   │   │   ├── billings.ts      # Invoice CRUD
│   │   │   ├── quotes.ts        # Quote CRUD & conversion
│   │   │   ├── partners.ts      # Business partner management
│   │   │   └── items.ts         # Item/product management
│   │   └── common.ts            # mf_auth_status, mf_auth_login
│   └── types/
│       ├── expense.ts           # Expense API type definitions
│       └── invoice.ts           # Invoice API type definitions
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example
└── README.md
```

### Communication Flow

```
Claude Code ──(stdio)──> MCP Server
                            │
                            ├── Token Store (~/.mf-cloud/tokens.json)
                            │     └── Auto refresh on expiry
                            │
                            ├──► expense.moneyforward.com/api/external/v1/
                            └──► invoice.moneyforward.com/api/v3/
```

### Startup

```bash
npx @noahlogy/mf-cloud-mcp-server
```

- First run: Opens browser for OAuth authentication
- Subsequent runs: Uses stored tokens with automatic refresh

## API Coverage

### Cloud Expense (経費) — ~40 tools

Base URL: `https://expense.moneyforward.com/api/external/v1`

**Expense Transactions:**
- `expense_list_offices` — List organizations
- `expense_get_me` — Current user info
- `expense_list_my_transactions` — User's expense entries
- `expense_create_my_transaction` — Create expense entry
- `expense_get_my_transaction` — Get expense entry detail
- `expense_update_my_transaction` — Update expense entry
- `expense_delete_my_transaction` — Delete expense entry
- `expense_list_transactions` — Organization-wide expenses
- `expense_get_transaction` — Get org expense detail
- `expense_update_transaction` — Update org expense
- `expense_delete_transaction` — Delete org expense
- `expense_upload_receipt` — Upload receipt image (OCR)

**Reports & Approvals:**
- `expense_list_my_reports` — User's submitted reports
- `expense_get_my_report` — User's report detail
- `expense_list_reports` — Organization reports
- `expense_get_report` — Report detail
- `expense_list_report_transactions` — Transactions in a report
- `expense_list_my_approving_reports` — Pending approvals
- `expense_approve_report` — Approve report
- `expense_reject_report` — Reject report

**Aggregation:**
- `expense_list_report_units` — Report consolidations
- `expense_get_report_unit` — Consolidation detail

**Journal Entries:**
- `expense_get_transaction_journal` — Journal for a transaction
- `expense_get_report_journal` — Journal for a report
- `expense_list_journals_by_reports` — Journals by reports
- `expense_list_journals_by_transactions` — Journals by transactions

**Master Data:**
- `expense_list_departments` / `create` / `update` / `delete`
- `expense_list_projects` / `create` / `update` / `delete`
- `expense_list_positions`
- `expense_list_categories`
- `expense_list_excises` — Tax classifications

**Employee Management:**
- `expense_list_members` / `create` / `get` / `update` / `delete`

### Cloud Invoice (請求書) — ~20 tools

Base URL: `https://invoice.moneyforward.com/api/v3`

**Invoices:**
- `invoice_list_billings` — List invoices
- `invoice_get_billing` — Invoice detail
- `invoice_create_billing` — Create invoice (new template format)
- `invoice_update_billing` — Update invoice
- `invoice_delete_billing` — Delete invoice
- `invoice_add_billing_item` — Add line item

**Quotes:**
- `invoice_list_quotes` — List quotes
- `invoice_get_quote` — Quote detail
- `invoice_create_quote` — Create quote
- `invoice_update_quote` — Update quote
- `invoice_delete_quote` — Delete quote
- `invoice_add_quote_item` — Add line item
- `invoice_convert_quote_to_billing` — Convert quote to invoice

**Partners:**
- `invoice_list_partners` — List partners (search supported v3.5.0)
- `invoice_get_partner` / `create` / `update` / `delete`
- `invoice_create_department` — Create partner department

**Items:**
- `invoice_list_items` — List items (search supported v3.5.0)
- `invoice_get_item` / `create` / `update` / `delete`

### Common Tools

- `mf_auth_status` — Check authentication status & token expiry
- `mf_auth_login` — Re-authenticate (when refresh fails)

## OAuth 2.0 Authentication

### Flow

1. **Initial auth**: Server starts temporary HTTP server on `localhost:3456`
2. Opens browser to MF authorization URL with required scopes
3. User grants access → callback receives authorization code
4. Exchange code for access_token + refresh_token
5. Store tokens in `~/.mf-cloud/tokens.json` (permission 0600)

### Required Scopes

**Expense:**
- `office_setting:write`
- `user_setting:write`
- `transaction:write`
- `report:write`

**Invoice:**
- `mfc/invoice/data.read`
- `mfc/invoice/data.write`

### Token Management

- Tokens persisted at `~/.mf-cloud/tokens.json`
- File permission: 0600 (owner read/write only)
- Automatic refresh before expiry
- Refresh failure triggers re-authentication prompt

### Configuration

Environment variables:
- `MF_CLIENT_ID` — OAuth Client ID (from MF App Portal)
- `MF_CLIENT_SECRET` — OAuth Client Secret
- `MF_REDIRECT_URI` — Callback URL (default: `http://localhost:3456/callback`)

## Error Handling

| Error | Strategy |
|-------|----------|
| 401 Unauthorized | Auto-refresh token → retry once |
| 403 Forbidden | Return scope-insufficient message |
| 404 Not Found | Return "resource not found" with ID |
| 429 Rate Limit | Return rate limit info (invoice: 3req/s) |
| 500 Server Error | Retry once, then return failure |
| Token refresh failure | Prompt user to run `mf_auth_login` |

## Security

- **No secrets in code**: Client ID/Secret via environment variables only
- **Token file permissions**: 0600 on `~/.mf-cloud/tokens.json`
- **gitignore**: `.env`, `tokens.json`, `*.secret` excluded
- **.env.example**: Template with placeholder values only
- **Write operations**: Tools that modify data include clear parameter descriptions

## Testing Strategy

**Phase 1 (MVP):**
- OAuth flow unit tests (mocked)
- Request construction tests per tool
- Token store/refresh tests

**Phase 2 (Stabilization):**
- Integration tests with response mocks
- E2E tests if MF sandbox available

## Phased Rollout

### Phase 1 — Core (MVP)

- OAuth authentication flow
- Expense: list offices, transactions CRUD, reports list/detail
- Invoice: billings CRUD, partners list, items list
- Common: auth status/login

### Phase 2 — Full Coverage

- All expense tools (masters, members, journals, approvals, receipt upload)
- All invoice tools (quotes, partner CRUD, item CRUD)
- Rate limiting & retry logic

### Phase 3 — Polish

- npm publish as `@noahlogy/mf-cloud-mcp-server`
- Comprehensive README with setup guide
- Claude Code plugin configuration guide
