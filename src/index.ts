#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "node:path";
import { homedir } from "node:os";

import { TokenStore } from "./auth/token-store.js";
import { OAuthClient } from "./auth/oauth-client.js";
import { AuthManager } from "./auth/auth-manager.js";
import { MfApiClient } from "./client/mf-api-client.js";
import { registerCommonTools } from "./tools/common.js";
import { registerExpenseTransactionTools } from "./tools/expense/transactions.js";
import { registerExpenseReportTools } from "./tools/expense/reports.js";
import { registerExpenseMasterTools } from "./tools/expense/masters.js";
import { registerExpenseMemberTools } from "./tools/expense/members.js";
import { registerExpenseJournalTools } from "./tools/expense/journals.js";
import { registerInvoiceBillingTools } from "./tools/invoice/billings.js";
import { registerInvoiceQuoteTools } from "./tools/invoice/quotes.js";
import { registerInvoicePartnerTools } from "./tools/invoice/partners.js";
import { registerInvoiceItemTools } from "./tools/invoice/items.js";

const clientId = process.env.MF_CLIENT_ID;
const clientSecret = process.env.MF_CLIENT_SECRET;
const redirectUri =
  process.env.MF_REDIRECT_URI ?? "http://localhost:3456/callback";

if (!clientId || !clientSecret) {
  console.error(
    "Error: MF_CLIENT_ID and MF_CLIENT_SECRET environment variables are required."
  );
  console.error(
    "Register your app at https://app-portal.moneyforward.com/authorized_apps/"
  );
  process.exit(1);
}

const tokenStore = new TokenStore(
  join(homedir(), ".mf-cloud", "tokens.json")
);
const oauthClient = new OAuthClient({ clientId, clientSecret, redirectUri });
const authManager = new AuthManager(tokenStore, oauthClient);
const apiClient = new MfApiClient(() => authManager.getValidToken());

const server = new McpServer({
  name: "mf-cloud-mcp-server",
  version: "0.1.0",
});

// Register all tools
registerCommonTools(server, authManager, apiClient);
registerExpenseTransactionTools(server, apiClient);
registerExpenseReportTools(server, apiClient);
registerExpenseMasterTools(server, apiClient);
registerExpenseMemberTools(server, apiClient);
registerExpenseJournalTools(server, apiClient);
registerInvoiceBillingTools(server, apiClient);
registerInvoiceQuoteTools(server, apiClient);
registerInvoicePartnerTools(server, apiClient);
registerInvoiceItemTools(server, apiClient);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("mf-cloud-mcp-server connected via stdio");
