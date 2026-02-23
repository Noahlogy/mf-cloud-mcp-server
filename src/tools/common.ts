import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AuthManager } from "../auth/auth-manager.js";
import type { MfApiClient } from "../client/mf-api-client.js";

/**
 * Registers common MF Cloud tools for authentication management.
 *
 * @param server - The MCP server instance to register tools on
 * @param authManager - The auth manager for token lifecycle operations
 * @param _apiClient - The API client (unused here, reserved for future common tools)
 */
export function registerCommonTools(
  server: McpServer,
  authManager: AuthManager,
  _apiClient: MfApiClient
): void {
  server.registerTool(
    "mf_auth_status",
    {
      description:
        "Check MF Cloud authentication status — shows whether tokens are valid and when they expire.",
      inputSchema: z.object({}),
    },
    async () => {
      const status = await authManager.getAuthStatus();
      const text = status.authenticated
        ? `Authenticated. Token expires at: ${new Date(status.expiresAt!).toISOString()}. Scopes: ${status.scope}`
        : "Not authenticated. Run mf_auth_login to authenticate.";
      return { content: [{ type: "text" as const, text }] };
    }
  );

  server.registerTool(
    "mf_auth_login",
    {
      description:
        "Re-authenticate with MF Cloud — opens browser for OAuth login. Use when tokens have expired and auto-refresh failed.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        await authManager.doInteractiveAuth();
        return {
          content: [
            {
              type: "text" as const,
              text: "Authentication successful. You can now use MF Cloud tools.",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
