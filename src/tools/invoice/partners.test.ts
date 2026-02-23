import { describe, it, expect, vi } from "vitest";
import { registerInvoicePartnerTools } from "./partners.js";

describe("registerInvoicePartnerTools", () => {
  it("registers all partner management tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerInvoicePartnerTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("invoice_list_partners");
    expect(toolNames).toContain("invoice_get_partner");
    expect(toolNames).toContain("invoice_create_partner");
    expect(toolNames).toContain("invoice_update_partner");
    expect(toolNames).toContain("invoice_delete_partner");
    expect(toolNames).toContain("invoice_create_department");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(6);
  });
});
