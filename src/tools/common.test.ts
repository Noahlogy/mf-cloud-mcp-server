import { describe, it, expect, vi } from "vitest";
import { registerCommonTools } from "./common.js";

describe("registerCommonTools", () => {
  it("registers mf_auth_status and mf_auth_login tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockAuthManager = {} as any;
    const mockApiClient = {} as any;

    registerCommonTools(mockServer as any, mockAuthManager, mockApiClient);

    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("mf_auth_status");
    expect(toolNames).toContain("mf_auth_login");
  });
});
