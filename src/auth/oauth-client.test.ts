import { describe, it, expect } from "vitest";
import { OAuthClient } from "./oauth-client.js";

describe("OAuthClient", () => {
  const client = new OAuthClient({
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:3456/callback",
  });

  it("builds correct authorization URL", () => {
    const url = client.buildAuthorizationUrl("test-state");
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://api.biz.moneyforward.com");
    expect(parsed.pathname).toBe("/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3456/callback"
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("state")).toBe("test-state");
    expect(parsed.searchParams.get("scope")).toContain("office_setting:write");
    expect(parsed.searchParams.get("scope")).toContain(
      "mfc/invoice/data.write"
    );
  });

  it("builds correct token request body for authorization code", () => {
    const body = client.buildTokenRequestBody("auth-code-123");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code-123");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("test-client-secret");
    expect(body.get("redirect_uri")).toBe("http://localhost:3456/callback");
  });

  it("builds correct token request body for refresh", () => {
    const body = client.buildRefreshRequestBody("refresh-token-456");
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-token-456");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("test-client-secret");
  });
});
