import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { EXPENSE_BASE_URL } from "../../types/expense.js";

/**
 * Registers expense report and approval workflow tools.
 *
 * Covers personal reports, organization reports, report transactions,
 * and the approval/rejection workflow.
 */
export function registerExpenseReportTools(
  server: McpServer,
  api: MfApiClient
): void {
  // ── My Reports ───────────────────────────────────────────

  server.registerTool(
    "expense_list_my_reports",
    {
      description: "List the current user's expense reports.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/ex_reports`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_get_my_report",
    {
      description: "Get details of one of the current user's expense reports.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("The report ID"),
      }),
    },
    async ({ office_id, id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/ex_reports/${id}`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Organization Reports ─────────────────────────────────

  server.registerTool(
    "expense_list_reports",
    {
      description: "List all expense reports in the office (admin).",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_reports`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_get_report",
    {
      description: "Get details of an expense report (admin).",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("The report ID"),
      }),
    },
    async ({ office_id, id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_reports/${id}`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Report Transactions ──────────────────────────────────

  server.registerTool(
    "expense_list_report_transactions",
    {
      description: "List all transactions within a specific expense report.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        report_id: z.string().describe("The report ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, report_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_reports/${report_id}/ex_transactions`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Approvals ────────────────────────────────────────────

  server.registerTool(
    "expense_list_my_approving_reports",
    {
      description:
        "List expense reports pending the current user's approval.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/approving_ex_reports`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_approve_report",
    {
      description:
        "Approve an expense report that is pending the current user's approval.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        report_id: z.string().describe("The report ID to approve"),
      }),
    },
    async ({ office_id, report_id }) => {
      const data = await api.post(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/approving_ex_reports/${report_id}/approve`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_reject_report",
    {
      description:
        "Reject (disapprove) an expense report that is pending the current user's approval.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        report_id: z.string().describe("The report ID to reject"),
      }),
    },
    async ({ office_id, report_id }) => {
      const data = await api.post(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/me/approving_ex_reports/${report_id}/disapprove`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
