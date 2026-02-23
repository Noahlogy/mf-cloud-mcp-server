import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { INVOICE_BASE_URL } from "../../types/invoice.js";

/**
 * Registers invoice item (product/service template) management tools.
 */
export function registerInvoiceItemTools(
  server: McpServer,
  api: MfApiClient
): void {
  server.registerTool(
    "invoice_list_items",
    {
      description: "List items (product/service templates). Supports search by name or code.",
      inputSchema: z.object({
        page: z.number().optional().describe("Page number"),
        per_page: z.number().optional().describe("Items per page (max 100)"),
        name: z.string().optional().describe("Search by item name"),
        code: z.string().optional().describe("Search by item code"),
      }),
    },
    async ({ page, per_page, name, code }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      if (per_page) params.per_page = String(per_page);
      if (name) params.name = name;
      if (code) params.code = code;
      const data = await api.get(`${INVOICE_BASE_URL}/items`, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_get_item",
    {
      description: "Get details of a specific item.",
      inputSchema: z.object({
        id: z.string().describe("The item ID"),
      }),
    },
    async ({ id }) => {
      const data = await api.get(`${INVOICE_BASE_URL}/items/${id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_create_item",
    {
      description: "Create a new item (product/service template).",
      inputSchema: z.object({
        item: z.object({
          name: z.string().describe("Item name"),
          code: z.string().optional().describe("Item code"),
          detail: z.string().optional().describe("Description / details"),
          unit_price: z.number().optional().describe("Default unit price"),
          quantity: z.number().optional().describe("Default quantity"),
          unit: z.string().optional().describe("Unit label (e.g., '個', '時間')"),
          excise: z.string().optional().describe("Tax type"),
        }),
      }),
    },
    async ({ item }) => {
      const data = await api.post(`${INVOICE_BASE_URL}/items`, { item });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_update_item",
    {
      description: "Update an existing item.",
      inputSchema: z.object({
        id: z.string().describe("The item ID to update"),
        item: z.object({
          name: z.string().optional(),
          code: z.string().optional(),
          detail: z.string().optional(),
          unit_price: z.number().optional(),
          quantity: z.number().optional(),
          unit: z.string().optional(),
          excise: z.string().optional(),
        }),
      }),
    },
    async ({ id, item }) => {
      const data = await api.put(`${INVOICE_BASE_URL}/items/${id}`, { item });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_delete_item",
    {
      description: "Delete an item. This action is irreversible.",
      inputSchema: z.object({
        id: z.string().describe("The item ID to delete"),
      }),
    },
    async ({ id }) => {
      await api.delete(`${INVOICE_BASE_URL}/items/${id}`);
      return {
        content: [{ type: "text" as const, text: `Item ${id} deleted.` }],
      };
    }
  );
}
