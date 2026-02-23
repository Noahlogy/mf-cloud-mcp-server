import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { EXPENSE_BASE_URL } from "../../types/expense.js";

/**
 * Registers expense transaction tools on the MCP server.
 *
 * Covers office listing, current user info, personal transaction CRUD,
 * and organization-wide transaction listing.
 *
 * @param server - The MCP server instance
 * @param api - The MF API client with auto-auth
 */
export function registerExpenseTransactionTools(
  server: McpServer,
  api: MfApiClient
): void {
  // ── Offices ──────────────────────────────────────────────

  server.registerTool(
    "expense_list_offices",
    {
      description: "List all organizations (offices) the authenticated user belongs to.",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await api.get(`${EXPENSE_BASE_URL}/v1/offices`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Current user ─────────────────────────────────────────

  server.registerTool(
    "expense_get_me",
    {
      description: "Get the current authenticated user's information in the specified office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office (organization) ID"),
      }),
    },
    async ({ office_id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v2/offices/${office_id}/me`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── My Transactions (personal) ───────────────────────────

  server.registerTool(
    "expense_list_my_transactions",
    {
      description:
        "List the current user's expense transactions. Supports pagination via page parameter.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number (default: 1)"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/ex_transactions`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_create_my_transaction",
    {
      description:
        "Create a new personal expense transaction. Requires at minimum the amount and recognized_at date.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        ex_transaction: z.object({
          is_income: z.boolean().optional().describe("Whether this is income (default: false)"),
          recognized_at: z.string().describe("Date of the expense (YYYY-MM-DD)"),
          value: z.number().describe("Amount in JPY"),
          memo: z.string().optional().describe("Memo / description"),
          ex_item_id: z.string().optional().describe("Category (expense item) ID"),
          dept_id: z.string().optional().describe("Department ID"),
          project_code_id: z.string().optional().describe("Project ID"),
          excise_id: z.string().optional().describe("Tax classification ID"),
        }),
      }),
    },
    async ({ office_id, ex_transaction }) => {
      const data = await api.post(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/ex_transactions`,
        { ex_transaction }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_get_my_transaction",
    {
      description: "Get details of one of the current user's expense transactions.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("The transaction ID"),
      }),
    },
    async ({ office_id, id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/ex_transactions/${id}`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_update_my_transaction",
    {
      description: "Update one of the current user's expense transactions.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("The transaction ID to update"),
        ex_transaction: z.object({
          is_income: z.boolean().optional(),
          recognized_at: z.string().optional().describe("Date (YYYY-MM-DD)"),
          value: z.number().optional().describe("Amount in JPY"),
          memo: z.string().optional(),
          ex_item_id: z.string().optional(),
          dept_id: z.string().optional(),
          project_code_id: z.string().optional(),
          excise_id: z.string().optional(),
        }),
      }),
    },
    async ({ office_id, id, ex_transaction }) => {
      const data = await api.put(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/ex_transactions/${id}`,
        { ex_transaction }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_delete_my_transaction",
    {
      description:
        "Delete one of the current user's expense transactions. This action is irreversible.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("The transaction ID to delete"),
      }),
    },
    async ({ office_id, id }) => {
      await api.delete(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/ex_transactions/${id}`
      );
      return {
        content: [{ type: "text" as const, text: `Transaction ${id} deleted.` }],
      };
    }
  );

  // ── Organization-wide transactions ───────────────────────

  server.registerTool(
    "expense_list_transactions",
    {
      description:
        "List all expense transactions in the office (admin). Supports pagination and query.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number (default: 1)"),
        query: z.string().optional().describe("Search keyword"),
      }),
    },
    async ({ office_id, page, query }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      if (query) params.query = query;
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_transactions`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
