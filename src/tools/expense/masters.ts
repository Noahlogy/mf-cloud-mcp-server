import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { EXPENSE_BASE_URL } from "../../types/expense.js";

/**
 * Registers expense master data tools: departments, projects, positions,
 * categories, and tax classifications (excises).
 */
export function registerExpenseMasterTools(
  server: McpServer,
  api: MfApiClient
): void {
  // ── Departments ──────────────────────────────────────────

  server.registerTool(
    "expense_list_departments",
    {
      description: "List departments in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_departments`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_create_department",
    {
      description: "Create a new department in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        ex_department: z.object({
          name: z.string().describe("Department name"),
          code: z.string().optional().describe("Department code"),
          is_active: z.boolean().optional().describe("Whether the department is active"),
          parent_id: z.string().optional().describe("Parent department ID"),
        }),
      }),
    },
    async ({ office_id, ex_department }) => {
      const data = await api.post(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_departments`,
        { ex_department }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_update_department",
    {
      description: "Update a department.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("Department ID"),
        ex_department: z.object({
          name: z.string().optional(),
          code: z.string().optional(),
          is_active: z.boolean().optional(),
          parent_id: z.string().optional(),
        }),
      }),
    },
    async ({ office_id, id, ex_department }) => {
      const data = await api.put(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_departments/${id}`,
        { ex_department }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_delete_department",
    {
      description: "Delete a department. This action is irreversible.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("Department ID to delete"),
      }),
    },
    async ({ office_id, id }) => {
      await api.delete(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_departments/${id}`
      );
      return {
        content: [{ type: "text" as const, text: `Department ${id} deleted.` }],
      };
    }
  );

  // ── Projects ─────────────────────────────────────────────

  server.registerTool(
    "expense_list_projects",
    {
      description: "List projects in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        page: z.number().optional().describe("Page number"),
      }),
    },
    async ({ office_id, page }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_project_codes`,
        params
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_create_project",
    {
      description: "Create a new project in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        ex_project_code: z.object({
          name: z.string().describe("Project name"),
          code: z.string().optional().describe("Project code"),
          is_active: z.boolean().optional().describe("Whether the project is active"),
        }),
      }),
    },
    async ({ office_id, ex_project_code }) => {
      const data = await api.post(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_project_codes`,
        { ex_project_code }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_update_project",
    {
      description: "Update a project.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("Project ID"),
        ex_project_code: z.object({
          name: z.string().optional(),
          code: z.string().optional(),
          is_active: z.boolean().optional(),
        }),
      }),
    },
    async ({ office_id, id, ex_project_code }) => {
      const data = await api.put(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_project_codes/${id}`,
        { ex_project_code }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "expense_delete_project",
    {
      description: "Delete a project. This action is irreversible.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
        id: z.string().describe("Project ID to delete"),
      }),
    },
    async ({ office_id, id }) => {
      await api.delete(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_project_codes/${id}`
      );
      return {
        content: [{ type: "text" as const, text: `Project ${id} deleted.` }],
      };
    }
  );

  // ── Positions (read-only) ────────────────────────────────

  server.registerTool(
    "expense_list_positions",
    {
      description: "List positions (roles) in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
      }),
    },
    async ({ office_id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_positions`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Categories (expense items, read-only) ────────────────

  server.registerTool(
    "expense_list_categories",
    {
      description: "List expense categories (expense items) in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
      }),
    },
    async ({ office_id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_items`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Tax classifications (excises, read-only) ─────────────

  server.registerTool(
    "expense_list_excises",
    {
      description: "List tax classifications (excise types) in the office.",
      inputSchema: z.object({
        office_id: z.string().describe("The office ID"),
      }),
    },
    async ({ office_id }) => {
      const data = await api.get(
        `${EXPENSE_BASE_URL}/v1/offices/${office_id}/ex_excises`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
