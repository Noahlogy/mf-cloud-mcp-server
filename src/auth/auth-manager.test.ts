import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthManager } from "./auth-manager.js";
import { TokenStore, type TokenData } from "./token-store.js";
import { OAuthClient } from "./oauth-client.js";

describe("AuthManager", () => {
  let tokenStore: TokenStore;
  let oauthClient: OAuthClient;
  let manager: AuthManager;

  const validTokens: TokenData = {
    access_token: "valid-access",
    refresh_token: "valid-refresh",
    expires_at: Date.now() + 3600_000,
    scope: "test",
  };

  const expiredTokens: TokenData = {
    access_token: "expired-access",
    refresh_token: "expired-refresh",
    expires_at: Date.now() - 1000,
    scope: "test",
  };

  const refreshedTokens: TokenData = {
    access_token: "refreshed-access",
    refresh_token: "refreshed-refresh",
    expires_at: Date.now() + 3600_000,
    scope: "test",
  };

  beforeEach(() => {
    tokenStore = {
      load: vi.fn(),
      save: vi.fn(),
      isExpired: vi.fn(),
    } as unknown as TokenStore;

    oauthClient = {
      refreshToken: vi.fn(),
      authorize: vi.fn(),
    } as unknown as OAuthClient;

    manager = new AuthManager(tokenStore, oauthClient);
  });

  it("returns stored tokens when valid", async () => {
    vi.mocked(tokenStore.load).mockResolvedValue(validTokens);
    vi.mocked(tokenStore.isExpired).mockReturnValue(false);

    const result = await manager.getValidToken();
    expect(result).toEqual(validTokens);
  });

  it("refreshes expired tokens", async () => {
    vi.mocked(tokenStore.load).mockResolvedValue(expiredTokens);
    vi.mocked(tokenStore.isExpired).mockReturnValue(true);
    vi.mocked(oauthClient.refreshToken).mockResolvedValue(refreshedTokens);

    const result = await manager.getValidToken();
    expect(result).toEqual(refreshedTokens);
    expect(tokenStore.save).toHaveBeenCalledWith(refreshedTokens);
  });

  it("triggers interactive auth when no tokens exist", async () => {
    vi.mocked(tokenStore.load).mockResolvedValue(null);
    vi.mocked(oauthClient.authorize).mockResolvedValue(validTokens);

    const result = await manager.getValidToken();
    expect(result).toEqual(validTokens);
    expect(oauthClient.authorize).toHaveBeenCalled();
    expect(tokenStore.save).toHaveBeenCalledWith(validTokens);
  });

  it("falls back to interactive auth when refresh fails", async () => {
    vi.mocked(tokenStore.load).mockResolvedValue(expiredTokens);
    vi.mocked(tokenStore.isExpired).mockReturnValue(true);
    vi.mocked(oauthClient.refreshToken).mockRejectedValue(
      new Error("refresh failed")
    );
    vi.mocked(oauthClient.authorize).mockResolvedValue(validTokens);

    const result = await manager.getValidToken();
    expect(result).toEqual(validTokens);
    expect(oauthClient.authorize).toHaveBeenCalled();
  });
});
