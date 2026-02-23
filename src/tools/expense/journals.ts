import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { EXPENSE_BASE_URL } from "../../types/expense.js";

/**
 * Registers expense journal entry retrieval tools.
 *
 * Journal entries are the accounting records generated from expense
 * transactions and reports — useful for reconciliation and audit.
 */
export function registerExpenseJournalTools(
  server: McpServer,
  api: MfApiClient
): void {
  server.registerTool(
    "expense_get_transaction_journal",
    {
      description: "Get the journal entry for a specific expense transaction.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        transaction_id: z.string().describe("The transaction ID"),
      }),
    },
    async ({ office_id, transaction_id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_transactions/${transaction_id}/ex_journal`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_get_report_journal",
    {
      description: "Get the journal entry for a specific expense report.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        report_id: z.string().describe("The report ID"),
      }),
    },
    async ({ office_id, report_id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_reports/${report_id}/ex_journal`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_list_journals_by_reports",
    {
      description:
        "List journal entries aggregated by expense reports. Supports pagination.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_journals_by_ex_reports`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_list_journals_by_transactions",
    {
      description:
        "List journal entries aggregated by expense transactions. Supports pagination.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_journals_by_ex_transactions`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
