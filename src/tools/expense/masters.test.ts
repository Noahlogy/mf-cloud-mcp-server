import { describe, it, expect, vi } from "vitest";
import { registerExpenseMasterTools } from "./masters.js";

describe("registerExpenseMasterTools", () => {
  it("registers all master data tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerExpenseMasterTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    // Departments (4)
    expect(toolNames).toContain("expense_list_departments");
    expect(toolNames).toContain("expense_create_department");
    expect(toolNames).toContain("expense_update_department");
    expect(toolNames).toContain("expense_delete_department");
    // Projects (4)
    expect(toolNames).toContain("expense_list_projects");
    expect(toolNames).toContain("expense_create_project");
    expect(toolNames).toContain("expense_update_project");
    expect(toolNames).toContain("expense_delete_project");
    // Read-only masters (3)
    expect(toolNames).toContain("expense_list_positions");
    expect(toolNames).toContain("expense_list_categories");
    expect(toolNames).toContain("expense_list_excises");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(11);
  });
});
