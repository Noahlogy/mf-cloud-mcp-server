import { describe, it, expect, vi } from "vitest";
import { registerExpenseTransactionTools } from "./transactions.js";

describe("registerExpenseTransactionTools", () => {
  it("registers all expense transaction tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerExpenseTransactionTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("expense_list_offices");
    expect(toolNames).toContain("expense_get_me");
    expect(toolNames).toContain("expense_list_my_transactions");
    expect(toolNames).toContain("expense_create_my_transaction");
    expect(toolNames).toContain("expense_get_my_transaction");
    expect(toolNames).toContain("expense_update_my_transaction");
    expect(toolNames).toContain("expense_delete_my_transaction");
    expect(toolNames).toContain("expense_list_transactions");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(8);
  });
});
