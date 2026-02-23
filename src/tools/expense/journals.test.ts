import { describe, it, expect, vi } from "vitest";
import { registerExpenseJournalTools } from "./journals.js";

describe("registerExpenseJournalTools", () => {
  it("registers all journal entry tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerExpenseJournalTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("expense_get_transaction_journal");
    expect(toolNames).toContain("expense_get_report_journal");
    expect(toolNames).toContain("expense_list_journals_by_reports");
    expect(toolNames).toContain("expense_list_journals_by_transactions");
    expect(mockServer.registerTool).toHaveBeenCalledTimes(4);
  });
});
