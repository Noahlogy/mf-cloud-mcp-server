import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { EXPENSE_BASE_URL } from "../../types/expense.js";

/**
 * Registers expense member (employee) management tools.
 */
export function registerExpenseMemberTools(
  server: McpServer,
  api: MfApiClient
): void {
  server.registerTool(
    "expense_list_members",
    {
      description: "List members (employees) in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/office_members`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_get_member",
    {
      description: "Get details of a specific member.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("The member ID"),
      }),
    },
    async ({ office_id, id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/office_members/${id}`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_create_member",
    {
      description: "Create a new member in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        office_member: z.object({
          email: z.string().describe("Member email address"),
          name: z.string().optional().describe("Display name"),
          employee_code: z.string().optional().describe("Employee code"),
          ex_department_id: z.string().optional().describe("Department ID"),
          ex_position_id: z.string().optional().describe("Position ID"),
        }),
      }),
    },
    async ({ office_id, office_member }) => {
      const data = await api.post(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/office_members`,
        { office_member }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_update_member",
    {
      description: "Update a member's information.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("Member ID to update"),
        office_member: z.object({
          name: z.string().optional(),
          employee_code: z.string().optional(),
          ex_department_id: z.string().optional(),
          ex_position_id: z.string().optional(),
        }),
      }),
    },
    async ({ office_id, id, office_member }) => {
      const data = await api.put(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/office_members/${id}`,
        { office_member }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_delete_member",
    {
      description: "Delete a member from the office. This action is irreversible.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("Member ID to delete"),
      }),
    },
    async ({ office_id, id }) => {
      await api.delete(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/office_members/${id}`
      );
      return {
        content: [{ type: "text" as const, text: `Member ${id} deleted.` }],
      };
    }
  );
}
