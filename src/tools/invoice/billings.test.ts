import { describe, it, expect, vi } from "vitest";
import { registerInvoiceBillingTools } from "./billings.js";

describe("registerInvoiceBillingTools", () => {
  it("registers all billing tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerInvoiceBillingTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("invoice_list_billings");
    expect(toolNames).toContain("invoice_get_billing");
    expect(toolNames).toContain("invoice_create_billing");
    expect(toolNames).toContain("invoice_update_billing");
    expect(toolNames).toContain("invoice_delete_billing");
    expect(toolNames).toContain("invoice_add_billing_item");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(6);
  });
});
