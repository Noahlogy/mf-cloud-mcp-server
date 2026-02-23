import { describe, it, expect, vi } from "vitest";
import { registerInvoiceItemTools } from "./items.js";

describe("registerInvoiceItemTools", () => {
  it("registers all item management tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerInvoiceItemTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("invoice_list_items");
    expect(toolNames).toContain("invoice_get_item");
    expect(toolNames).toContain("invoice_create_item");
    expect(toolNames).toContain("invoice_update_item");
    expect(toolNames).toContain("invoice_delete_item");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(5);
  });
});
