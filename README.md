# mf-cloud-mcp-server

Money Forward Cloud MCP Server — Claude Code (and other MCP-compatible AI tools) from direct access to Money Forward Cloud APIs.

**Supported services:**

- **Cloud Expense (クラウド経費)** — Expense transactions, reports, approvals, journals, master data, members
- **Cloud Invoice (クラウド請求書)** — Billings, quotes, partners, items

## Prerequisites

- Node.js 18+
- Money Forward Cloud account
- OAuth app credentials from [MF App Portal](https://app-portal.moneyforward.com/authorized_apps/)

## Quick Start

### 1. Register an OAuth App

Go to [MF App Portal](https://app-portal.moneyforward.com/authorized_apps/) and create a new authorized app with:

- **Redirect URI**: `http://localhost:3456/callback`
- **Scopes**: `office_setting:write`, `user_setting:write`, `transaction:write`, `report:write`, `mfc/invoice/data.read`, `mfc/invoice/data.write`

### 2. Configure Claude Code

Add this to your Claude Code MCP settings (`.mcp.json`):

```json
{
  "mcpServers": {
    "mf-cloud": {
      "command": "npx",
      "args": ["@noahlogy/mf-cloud-mcp-server"],
      "env": {
        "MF_CLIENT_ID": "your-client-id",
        "MF_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### 3. Authenticate

On first use, the server opens your browser for OAuth authentication. Tokens are stored locally at `~/.mf-cloud/tokens.json` and refreshed automatically.

## Available Tools (60+)

### Common

| Tool | Description |
|------|-------------|
| `mf_auth_status` | Check authentication status and token expiry |
| `mf_auth_login` | Re-authenticate via browser OAuth flow |

### Cloud Expense (クラウド経費)

**Offices & User**

| Tool | Description |
|------|-------------|
| `expense_list_offices` | List organizations |
| `expense_get_me` | Current user info |

**Transactions**

| Tool | Description |
|------|-------------|
| `expense_list_my_transactions` | List my expense entries |
| `expense_create_my_transaction` | Create expense entry |
| `expense_get_my_transaction` | Get expense detail |
| `expense_update_my_transaction` | Update expense entry |
| `expense_delete_my_transaction` | Delete expense entry |
| `expense_list_transactions` | List all expenses (admin) |

**Reports & Approvals**

| Tool | Description |
|------|-------------|
| `expense_list_my_reports` | List my reports |
| `expense_get_my_report` | Get my report detail |
| `expense_list_reports` | List all reports (admin) |
| `expense_get_report` | Get report detail |
| `expense_list_report_transactions` | Transactions in a report |
| `expense_list_my_approving_reports` | Pending approvals |
| `expense_approve_report` | Approve a report |
| `expense_reject_report` | Reject a report |

**Master Data**

| Tool | Description |
|------|-------------|
| `expense_list_departments` | List departments |
| `expense_create_department` | Create department |
| `expense_update_department` | Update department |
| `expense_delete_department` | Delete department |
| `expense_list_projects` | List projects |
| `expense_create_project` | Create project |
| `expense_update_project` | Update project |
| `expense_delete_project` | Delete project |
| `expense_list_positions` | List positions |
| `expense_list_categories` | List expense categories |
| `expense_list_excises` | List tax classifications |

**Members**

| Tool | Description |
|------|-------------|
| `expense_list_members` | List employees |
| `expense_get_member` | Get employee detail |
| `expense_create_member` | Add employee |
| `expense_update_member` | Update employee |
| `expense_delete_member` | Remove employee |

**Journals**

| Tool | Description |
|------|-------------|
| `expense_get_transaction_journal` | Journal for a transaction |
| `expense_get_report_journal` | Journal for a report |
| `expense_list_journals_by_reports` | Journals by reports |
| `expense_list_journals_by_transactions` | Journals by transactions |

### Cloud Invoice (クラウド請求書)

**Billings**

| Tool | Description |
|------|-------------|
| `invoice_list_billings` | List invoices |
| `invoice_get_billing` | Invoice detail |
| `invoice_create_billing` | Create invoice |
| `invoice_update_billing` | Update invoice |
| `invoice_delete_billing` | Delete invoice |
| `invoice_add_billing_item` | Add line item |

**Quotes**

| Tool | Description |
|------|-------------|
| `invoice_list_quotes` | List quotes |
| `invoice_get_quote` | Quote detail |
| `invoice_create_quote` | Create quote |
| `invoice_update_quote` | Update quote |
| `invoice_delete_quote` | Delete quote |
| `invoice_add_quote_item` | Add line item |
| `invoice_convert_quote_to_billing` | Convert quote to invoice |

**Partners**

| Tool | Description |
|------|-------------|
| `invoice_list_partners` | List partners (search supported) |
| `invoice_get_partner` | Partner detail |
| `invoice_create_partner` | Create partner |
| `invoice_update_partner` | Update partner |
| `invoice_delete_partner` | Delete partner |
| `invoice_create_department` | Create partner department |

**Items**

| Tool | Description |
|------|-------------|
| `invoice_list_items` | List items (search supported) |
| `invoice_get_item` | Item detail |
| `invoice_create_item` | Create item |
| `invoice_update_item` | Update item |
| `invoice_delete_item` | Delete item |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MF_CLIENT_ID` | Yes | — | OAuth Client ID |
| `MF_CLIENT_SECRET` | Yes | — | OAuth Client Secret |
| `MF_REDIRECT_URI` | No | `http://localhost:3456/callback` | OAuth callback URL |

## Authentication

The server uses **OAuth 2.0 Authorization Code Flow** with the MF Cloud shared authorization server (`api.biz.moneyforward.com`).

1. On first run, a temporary HTTP server starts on port 3456
2. Your browser opens to the MF authorization page
3. After granting access, the callback receives the authorization code
4. The code is exchanged for access + refresh tokens
5. Tokens are stored at `~/.mf-cloud/tokens.json` (permission 0600)
6. On subsequent runs, tokens are loaded and auto-refreshed before expiry

## Security

- Client credentials are passed via environment variables only
- Token file uses restrictive permissions (owner-only read/write)
- `.env`, `tokens.json`, and `.mf-cloud/` are gitignored
- Browser is opened using `execFile` (no shell injection risk)
- Write operations include clear descriptions in tool definitions

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run lint

# Build
npm run build

# Watch mode
npm run dev
```

## License

ISC
