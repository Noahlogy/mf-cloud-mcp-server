import { describe, it, expect, vi, beforeEach } from "vitest";
import { MfApiClient } from "./mf-api-client.js";
import type { TokenData } from "../auth/token-store.js";

describe("MfApiClient", () => {
  let getToken: () => Promise<TokenData>;
  let client: MfApiClient;

  beforeEach(() => {
    getToken = vi.fn().mockResolvedValue({
      access_token: "test-token",
      refresh_token: "test-refresh",
      expires_at: Date.now() + 3600_000,
      scope: "test",
    } satisfies TokenData);
    client = new MfApiClient(getToken);
  });

  it("adds authorization header to GET requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.get("https://expense.moneyforward.com/api/external/v1/offices");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://expense.moneyforward.com/api/external/v1/offices",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );

    vi.unstubAllGlobals();
  });

  it("adds authorization header and body to POST requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "123" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.post(
      "https://expense.moneyforward.com/api/external/v1/offices/1/ex_transactions",
      { amount: 1000 }
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ amount: 1000 }),
      })
    );

    vi.unstubAllGlobals();
  });

  it("throws MfApiError on non-ok responses", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve('{"error":"not_found"}'),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      client.get("https://example.com/not-found")
    ).rejects.toThrow("MF API error 404");

    vi.unstubAllGlobals();
  });
});
