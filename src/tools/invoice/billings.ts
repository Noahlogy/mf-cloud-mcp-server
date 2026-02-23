import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { INVOICE_BASE_URL } from "../../types/invoice.js";

/**
 * Registers invoice (billing) CRUD and line-item tools.
 *
 * Note: invoice creation uses the invoice_template_billings endpoint
 * (new template format), while updates use the standard billings endpoint.
 */
export function registerInvoiceBillingTools(
  server: McpServer,
  api: MfApiClient
): void {
  server.registerTool(
    "invoice_list_billings",
    {
      description: "List invoices. Supports pagination and search by query.",
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
      const data = await api.get(`${INVOICE_BASE_URL}/billings`, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_get_billing",
    {
      description: "Get details of a specific invoice.",
      inputSchema: z.object({
        id: z.string().describe("The invoice (billing) ID"),
      }),
    },
    async ({ id }) => {
      const data = await api.get(`${INVOICE_BASE_URL}/billings/${id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_create_billing",
    {
      description:
        "Create a new invoice using the template format. Provide partner and line items.",
      inputSchema: z.object({
        billing: z.object({
          department_id: z.string().optional().describe("Department ID"),
          partner_id: z.string().optional().describe("Partner (customer) ID"),
          billing_date: z.string().optional().describe("Invoice date (YYYY-MM-DD)"),
          due_date: z.string().optional().describe("Payment due date (YYYY-MM-DD)"),
          title: z.string().optional().describe("Invoice title"),
          memo: z.string().optional().describe("Internal memo"),
          note: z.string().optional().describe("Note printed on the invoice"),
          items: z.array(z.object({
            name: z.string().describe("Item name"),
            quantity: z.number().optional().describe("Quantity"),
            unit_price: z.number().optional().describe("Unit price"),
            unit: z.string().optional().describe("Unit label"),
            is_deduct: z.boolean().optional().describe("Whether this is a deduction"),
            excise: z.string().optional().describe("Tax type (e.g. 'tax_include')"),
          })).optional().describe("Line items"),
        }),
      }),
    },
    async ({ billing }) => {
      const data = await api.post(
        `${INVOICE_BASE_URL}/invoice_template_billings`,
        { billing }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_update_billing",
    {
      description: "Update an existing invoice.",
      inputSchema: z.object({
        id: z.string().describe("The invoice ID to update"),
        billing: z.object({
          department_id: z.string().optional(),
          partner_id: z.string().optional(),
          billing_date: z.string().optional(),
          due_date: z.string().optional(),
          title: z.string().optional(),
          memo: z.string().optional(),
          note: z.string().optional(),
        }),
      }),
    },
    async ({ id, billing }) => {
      const data = await api.put(`${INVOICE_BASE_URL}/billings/${id}`, {
        billing,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_delete_billing",
    {
      description: "Delete an invoice. This action is irreversible.",
      inputSchema: z.object({
        id: z.string().describe("The invoice ID to delete"),
      }),
    },
    async ({ id }) => {
      await api.delete(`${INVOICE_BASE_URL}/billings/${id}`);
      return {
        content: [{ type: "text" as const, text: `Invoice ${id} deleted.` }],
      };
    }
  );

  server.registerTool(
    "invoice_add_billing_item",
    {
      description: "Add a line item to an existing invoice.",
      inputSchema: z.object({
        billing_id: z.string().describe("The invoice ID to add the item to"),
        item: z.object({
          name: z.string().describe("Item name"),
          quantity: z.number().optional().describe("Quantity"),
          unit_price: z.number().optional().describe("Unit price"),
          unit: z.string().optional().describe("Unit label"),
          is_deduct: z.boolean().optional().describe("Whether this is a deduction"),
          excise: z.string().optional().describe("Tax type"),
        }),
      }),
    },
    async ({ billing_id, item }) => {
      const data = await api.post(
        `${INVOICE_BASE_URL}/billings/${billing_id}/items`,
        { item }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
