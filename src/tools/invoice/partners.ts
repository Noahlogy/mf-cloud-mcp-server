import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MfApiClient } from "../../client/mf-api-client.js";
import { INVOICE_BASE_URL } from "../../types/invoice.js";

/**
 * Registers invoice partner (business contact) management tools.
 */
export function registerInvoicePartnerTools(
  server: McpServer,
  api: MfApiClient
): void {
  server.registerTool(
    "invoice_list_partners",
    {
      description:
        "List business partners. Supports search by name, code, name_kana, and more.",
      inputSchema: z.object({
        page: z.number().optional().describe("Page number"),
        per_page: z.number().optional().describe("Items per page (max 100)"),
        name: z.string().optional().describe("Search by partner name"),
        code: z.string().optional().describe("Search by partner code"),
        name_kana: z.string().optional().describe("Search by name kana"),
      }),
    },
    async ({ page, per_page, name, code, name_kana }) => {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      if (per_page) params.per_page = String(per_page);
      if (name) params.name = name;
      if (code) params.code = code;
      if (name_kana) params.name_kana = name_kana;
      const data = await api.get(`${INVOICE_BASE_URL}/partners`, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_get_partner",
    {
      description: "Get details of a specific partner.",
      inputSchema: z.object({
        id: z.string().describe("The partner ID"),
      }),
    },
    async ({ id }) => {
      const data = await api.get(`${INVOICE_BASE_URL}/partners/${id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_create_partner",
    {
      description: "Create a new business partner.",
      inputSchema: z.object({
        partner: z.object({
          name: z.string().describe("Partner company name"),
          code: z.string().optional().describe("Partner code"),
          name_kana: z.string().optional().describe("Company name in kana"),
          name_suffix: z.string().optional().describe("Honorific suffix (e.g., '様', '御中')"),
          memo: z.string().optional().describe("Internal memo"),
          zip: z.string().optional().describe("Postal code"),
          prefecture: z.string().optional().describe("Prefecture"),
          address1: z.string().optional().describe("Address line 1"),
          address2: z.string().optional().describe("Address line 2"),
          tel: z.string().optional().describe("Phone number"),
          email: z.string().optional().describe("Email address"),
        }),
      }),
    },
    async ({ partner }) => {
      const data = await api.post(`${INVOICE_BASE_URL}/partners`, { partner });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_update_partner",
    {
      description: "Update an existing partner.",
      inputSchema: z.object({
        id: z.string().describe("The partner ID to update"),
        partner: z.object({
          name: z.string().optional(),
          code: z.string().optional(),
          name_kana: z.string().optional(),
          name_suffix: z.string().optional(),
          memo: z.string().optional(),
          zip: z.string().optional(),
          prefecture: z.string().optional(),
          address1: z.string().optional(),
          address2: z.string().optional(),
          tel: z.string().optional(),
          email: z.string().optional(),
        }),
      }),
    },
    async ({ id, partner }) => {
      const data = await api.put(`${INVOICE_BASE_URL}/partners/${id}`, {
        partner,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "invoice_delete_partner",
    {
      description: "Delete a partner. This action is irreversible.",
      inputSchema: z.object({
        id: z.string().describe("The partner ID to delete"),
      }),
    },
    async ({ id }) => {
      await api.delete(`${INVOICE_BASE_URL}/partners/${id}`);
      return {
        content: [{ type: "text" as const, text: `Partner ${id} deleted.` }],
      };
    }
  );

  server.registerTool(
    "invoice_create_department",
    {
      description: "Create a department (division) for a partner.",
      inputSchema: z.object({
        partner_id: z.string().describe("The partner ID"),
        department: z.object({
          name: z.string().describe("Department name"),
          zip: z.string().optional().describe("Postal code"),
          prefecture: z.string().optional().describe("Prefecture"),
          address1: z.string().optional().describe("Address line 1"),
          address2: z.string().optional().describe("Address line 2"),
          tel: z.string().optional().describe("Phone number"),
          email: z.string().optional().describe("Email address"),
        }),
      }),
    },
    async ({ partner_id, department }) => {
      const data = await api.post(
        `${INVOICE_BASE_URL}/partners/${partner_id}/departments`,
        { department }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
