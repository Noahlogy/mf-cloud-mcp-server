import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { INVOICE_BASE_URL } from "../../types/invoice.js";

/**
 * Registers quote CRUD, line-item, and quote-to-billing conversion tools.
 */
export function registerInvoiceQuoteTools(
  server: McpServer,
  api: MfApiClient
): void {
  server.registerTool(
    "invoice_list_quotes",
    {
      description: "List quotes. Supports pagination and search.",
      inputSchema: z.object({
        page: z.number().optional().describe("Page number"),
        per_page: z.number().optional().describe("Items per page (max 100)"),
        query: z.string().optional().describe("Search keyword"),
      }),
    },
    async ({ page, per_page, query }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      if (per_page) params.per_page = String(per_page);
      if (query) params.query = query;
      const data = await api.get(`${INVOICE_BASE_URL}/quotes`, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_get_quote",
    {
      description: "Get details of a specific quote.",
      inputSchema: z.object({
        id: z.string().describe("The quote ID"),
      }),
    },
    async ({ id }) => {
      const data = await api.get(`${INVOICE_BASE_URL}/quotes/${id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_create_quote",
    {
      description: "Create a new quote with partner and line items.",
      inputSchema: z.object({
        quote: z.object({
          partner_id: z.string().optional().describe("Partner (customer) ID"),
          quote_date: z.string().optional().describe("Quote date (YYYY-MM-DD)"),
          expired_date: z.string().optional().describe("Quote expiration date"),
          title: z.string().optional().describe("Quote title"),
          memo: z.string().optional().describe("Internal memo"),
          note: z.string().optional().describe("Note printed on the quote"),
          items: z.array(z.object({
            name: z.string().describe("Item name"),
            quantity: z.number().optional(),
            unit_price: z.number().optional(),
            unit: z.string().optional(),
            is_deduct: z.boolean().optional(),
            excise: z.string().optional(),
          })).optional().describe("Line items"),
        }),
      }),
    },
    async ({ quote }) => {
      const data = await api.post(`${INVOICE_BASE_URL}/quotes`, { quote });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_update_quote",
    {
      description: "Update an existing quote.",
      inputSchema: z.object({
        id: z.string().describe("The quote ID to update"),
        quote: z.object({
          partner_id: z.string().optional(),
          quote_date: z.string().optional(),
          expired_date: z.string().optional(),
          title: z.string().optional(),
          memo: z.string().optional(),
          note: z.string().optional(),
        }),
      }),
    },
    async ({ id, quote }) => {
      const data = await api.put(`${INVOICE_BASE_URL}/quotes/${id}`, {
        quote,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_delete_quote",
    {
      description: "Delete a quote. This action is irreversible.",
      inputSchema: z.object({
        id: z.string().describe("The quote ID to delete"),
      }),
    },
    async ({ id }) => {
      await api.delete(`${INVOICE_BASE_URL}/quotes/${id}`);
      return {
        content: [{ type: "text" as const, text: `Quote ${id} deleted.` }],
      };
    }
  );

  server.registerTool(
    "invoice_add_quote_item",
    {
      description: "Add a line item to an existing quote.",
      inputSchema: z.object({
        quote_id: z.string().describe("The quote ID"),
        item: z.object({
          name: z.string().describe("Item name"),
          quantity: z.number().optional(),
          unit_price: z.number().optional(),
          unit: z.string().optional(),
          is_deduct: z.boolean().optional(),
          excise: z.string().optional(),
        }),
      }),
    },
    async ({ quote_id, item }) => {
      const data = await api.post(
        `${INVOICE_BASE_URL}/quotes/${quote_id}/items`,
        { item }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_convert_quote_to_billing",
    {
      description:
        "Convert a quote to an invoice (billing). Creates a new invoice from the quote.",
      inputSchema: z.object({
        id: z.string().describe("The quote ID to convert"),
      }),
    },
    async ({ id }) => {
      const data = await api.post(
        `${INVOICE_BASE_URL}/quotes/${id}/convert_to_billing`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
