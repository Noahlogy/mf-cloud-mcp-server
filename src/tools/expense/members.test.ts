import { describe, it, expect, vi } from "vitest";
import { registerExpenseMemberTools } from "./members.js";

describe("registerExpenseMemberTools", () => {
  it("registers all member management tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerExpenseMemberTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("expense_list_members");
    expect(toolNames).toContain("expense_get_member");
    expect(toolNames).toContain("expense_create_member");
    expect(toolNames).toContain("expense_update_member");
    expect(toolNames).toContain("expense_delete_member");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(5);
  });
});
