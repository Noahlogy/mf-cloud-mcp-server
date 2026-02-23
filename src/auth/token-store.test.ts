import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TokenStore, type TokenData } from "./token-store.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("TokenStore", () => {
  let tempDir: string;
  let store: TokenStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mf-token-test-"));
    store = new TokenStore(join(tempDir, "tokens.json"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns null when no tokens exist", async () => {
    const tokens = await store.load();
    expect(tokens).toBeNull();
  });

  it("saves and loads tokens", async () => {
    const tokenData: TokenData = {
      access_token: "test-access",
      refresh_token: "test-refresh",
      expires_at: Date.now() + 3600_000,
      scope: "office_setting:write",
    };
    await store.save(tokenData);
    const loaded = await store.load();
    expect(loaded).toEqual(tokenData);
  });

  it("detects expired tokens", () => {
    const expired: TokenData = {
      access_token: "old",
      refresh_token: "old-refresh",
      expires_at: Date.now() - 1000,
      scope: "office_setting:write",
    };
    expect(store.isExpired(expired)).toBe(true);
  });

  it("detects valid tokens", () => {
    const valid: TokenData = {
      access_token: "fresh",
      refresh_token: "fresh-refresh",
      expires_at: Date.now() + 3600_000,
      scope: "office_setting:write",
    };
    expect(store.isExpired(valid)).toBe(false);
  });

  it("considers tokens expiring within 60s as expired", () => {
    const almostExpired: TokenData = {
      access_token: "soon",
      refresh_token: "soon-refresh",
      expires_at: Date.now() + 30_000,
      scope: "office_setting:write",
    };
    expect(store.isExpired(almostExpired)).toBe(true);
  });
});
