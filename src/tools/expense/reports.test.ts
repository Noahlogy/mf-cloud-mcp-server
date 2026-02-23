import { describe, it, expect, vi } from "vitest";
import { registerExpenseReportTools } from "./reports.js";

describe("registerExpenseReportTools", () => {
  it("registers all expense report and approval tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerExpenseReportTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("expense_list_my_reports");
    expect(toolNames).toContain("expense_get_my_report");
    expect(toolNames).toContain("expense_list_reports");
    expect(toolNames).toContain("expense_get_report");
    expect(toolNames).toContain("expense_list_report_transactions");
    expect(toolNames).toContain("expense_list_my_approving_reports");
    expect(toolNames).toContain("expense_approve_report");
    expect(toolNames).toContain("expense_reject_report");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(8);
  });
});
