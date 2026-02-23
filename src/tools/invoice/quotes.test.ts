import { describe, it, expect, vi } from "vitest";
import { registerInvoiceQuoteTools } from "./quotes.js";

describe("registerInvoiceQuoteTools", () => {
  it("registers all quote tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerInvoiceQuoteTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("invoice_list_quotes");
    expect(toolNames).toContain("invoice_get_quote");
    expect(toolNames).toContain("invoice_create_quote");
    expect(toolNames).toContain("invoice_update_quote");
    expect(toolNames).toContain("invoice_delete_quote");
    expect(toolNames).toContain("invoice_add_quote_item");
    expect(toolNames).toContain("invoice_convert_quote_to_billing");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(7);
  });
});
