# MF Cloud MCP Server — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript MCP Server that lets Claude Code operate Money Forward Cloud Expense and Invoice APIs via natural language.

**Architecture:** Unified monolith MCP server using `@modelcontextprotocol/sdk` with stdio transport. OAuth 2.0 tokens stored locally at `~/.mf-cloud/tokens.json` with auto-refresh. Each MF Cloud service (expense, invoice) registers its tools in a modular file structure.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk` (v1.x), `zod` for schemas, `vitest` for testing, Node.js native `fetch` for HTTP

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts` (placeholder)

**Step 1: Initialize npm project**

```bash
cd /Users/yskfkj/mf-cloud-mcp-server
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node vitest
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 4: Update package.json**

Set `"type": "module"`, `"main": "dist/index.js"`, `"bin"`, and add scripts:

```json
{
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "mf-cloud-mcp-server": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  }
}
```

**Step 5: Create placeholder entry point**

Create `src/index.ts`:

```typescript
#!/usr/bin/env node
console.error("mf-cloud-mcp-server starting...");
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Compiles to `dist/index.js` without errors

**Step 7: Commit**

```bash
git add package.json tsconfig.json src/index.ts package-lock.json
git commit -m "chore: scaffold TypeScript project with MCP SDK"
```

---

## Task 2: Token Store

**Files:**
- Create: `src/auth/token-store.ts`
- Create: `src/auth/token-store.test.ts`

**Step 1: Write the failing test**

Create `src/auth/token-store.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth/token-store.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/auth/token-store.ts`:

```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

const EXPIRY_BUFFER_MS = 60_000;

export class TokenStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<TokenData | null> {
    try {
      const data = await readFile(this.filePath, "utf-8");
      return JSON.parse(data) as TokenData;
    } catch {
      return null;
    }
  }

  async save(tokens: TokenData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    await writeFile(this.filePath, JSON.stringify(tokens, null, 2), {
      mode: 0o600,
    });
  }

  isExpired(tokens: TokenData): boolean {
    return tokens.expires_at - EXPIRY_BUFFER_MS <= Date.now();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/auth/token-store.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/auth/token-store.ts src/auth/token-store.test.ts
git commit -m "feat(auth): add token store with persistence and expiry check"
```

---

## Task 3: OAuth Client

**Files:**
- Create: `src/auth/oauth-client.ts`
- Create: `src/auth/callback-server.ts`
- Create: `src/auth/oauth-client.test.ts`

**Step 1: Write the failing test**

Create `src/auth/oauth-client.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth/oauth-client.test.ts`
Expected: FAIL — module not found

**Step 3: Write the callback server**

Create `src/auth/callback-server.ts`:

```typescript
import { createServer, type Server } from "node:http";

export function waitForCallback(
  port: number
): Promise<{ code: string; server: Server }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h1>認証エラー</h1><p>${error}</p>`);
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            "<h1>認証成功</h1><p>このページを閉じて Claude Code に戻ってください。</p>"
          );
          resolve({ code, server });
          return;
        }
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    server.listen(port, () => {
      console.error(`OAuth callback server listening on port ${port}`);
    });

    server.on("error", reject);
  });
}
```

**Step 4: Write the OAuth client**

Create `src/auth/oauth-client.ts`:

```typescript
import { TokenStore, type TokenData } from "./token-store.js";
import { waitForCallback } from "./callback-server.js";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";

const MF_AUTH_BASE = "https://api.biz.moneyforward.com";
const MF_TOKEN_URL = `${MF_AUTH_BASE}/token`;

const ALL_SCOPES = [
  "office_setting:write",
  "user_setting:write",
  "transaction:write",
  "report:write",
  "mfc/invoice/data.read",
  "mfc/invoice/data.write",
].join(" ");

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class OAuthClient {
  constructor(private readonly config: OAuthConfig) {}

  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: ALL_SCOPES,
      state,
    });
    return `${MF_AUTH_BASE}/authorize?${params.toString()}`;
  }

  buildTokenRequestBody(code: string): URLSearchParams {
    return new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
    });
  }

  buildRefreshRequestBody(refreshToken: string): URLSearchParams {
    return new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
  }

  async exchangeCode(code: string): Promise<TokenData> {
    const body = this.buildTokenRequestBody(code);
    const res = await fetch(MF_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token exchange failed (${res.status}): ${text}`);
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + json.expires_in * 1000,
      scope: json.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenData> {
    const body = this.buildRefreshRequestBody(refreshToken);
    const res = await fetch(MF_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token refresh failed (${res.status}): ${text}`);
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + json.expires_in * 1000,
      scope: json.scope,
    };
  }

  async authorize(port: number = 3456): Promise<TokenData> {
    const state = randomBytes(16).toString("hex");
    const authUrl = this.buildAuthorizationUrl(state);

    console.error(`\nPlease open this URL in your browser to authenticate:`);
    console.error(authUrl);

    // Open browser using execFile (safe, no shell injection)
    const cmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "cmd"
          : "xdg-open";
    const args =
      process.platform === "win32" ? ["/c", "start", authUrl] : [authUrl];
    execFile(cmd, args, (err) => {
      if (err) {
        console.error("Could not open browser automatically. Please open the URL manually.");
      }
    });

    const { code, server } = await waitForCallback(port);
    server.close();

    return this.exchangeCode(code);
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/auth/oauth-client.test.ts`
Expected: All 3 tests PASS

**Step 6: Commit**

```bash
git add src/auth/oauth-client.ts src/auth/callback-server.ts src/auth/oauth-client.test.ts
git commit -m "feat(auth): add OAuth client with authorization code flow"
```

---

## Task 4: MF API Client (HTTP wrapper)

**Files:**
- Create: `src/client/mf-api-client.ts`
- Create: `src/client/mf-api-client.test.ts`

**Step 1: Write the failing test**

Create `src/client/mf-api-client.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/client/mf-api-client.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/client/mf-api-client.ts`:

```typescript
import type { TokenData } from "../auth/token-store.js";

export class MfApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string
  ) {
    super(`MF API error ${status}: ${statusText} — ${body}`);
    this.name = "MfApiError";
  }
}

type TokenProvider = () => Promise<TokenData>;

export class MfApiClient {
  constructor(private readonly getToken: TokenProvider) {}

  private async headers(): Promise<Record<string, string>> {
    const tokens = await this.getToken();
    return {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const h = await this.headers();
    const res = await fetch(url, {
      ...init,
      headers: { ...h, ...init?.headers },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new MfApiError(res.status, res.statusText, body);
    }

    return res.json() as Promise<T>;
  }

  async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const fullUrl = params
      ? `${url}?${new URLSearchParams(params).toString()}`
      : url;
    return this.request<T>(fullUrl);
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: "DELETE" });
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/client/mf-api-client.test.ts`
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/client/mf-api-client.ts src/client/mf-api-client.test.ts
git commit -m "feat(client): add MF API HTTP client with auto auth headers"
```

---

## Task 5: Auth Manager (orchestrates token lifecycle)

**Files:**
- Create: `src/auth/auth-manager.ts`
- Create: `src/auth/auth-manager.test.ts`

**Step 1: Write the failing test**

Create `src/auth/auth-manager.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth/auth-manager.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/auth/auth-manager.ts`:

```typescript
import { TokenStore, type TokenData } from "./token-store.js";
import { OAuthClient } from "./oauth-client.js";

export class AuthManager {
  constructor(
    private readonly tokenStore: TokenStore,
    private readonly oauthClient: OAuthClient
  ) {}

  async getValidToken(): Promise<TokenData> {
    const stored = await this.tokenStore.load();

    if (!stored) {
      return this.doInteractiveAuth();
    }

    if (!this.tokenStore.isExpired(stored)) {
      return stored;
    }

    try {
      const refreshed = await this.oauthClient.refreshToken(
        stored.refresh_token
      );
      await this.tokenStore.save(refreshed);
      return refreshed;
    } catch {
      console.error("Token refresh failed. Starting interactive auth...");
      return this.doInteractiveAuth();
    }
  }

  async doInteractiveAuth(): Promise<TokenData> {
    const tokens = await this.oauthClient.authorize();
    await this.tokenStore.save(tokens);
    return tokens;
  }

  async getAuthStatus(): Promise<{
    authenticated: boolean;
    expiresAt: number | null;
    scope: string | null;
  }> {
    const stored = await this.tokenStore.load();
    if (!stored) {
      return { authenticated: false, expiresAt: null, scope: null };
    }
    return {
      authenticated: !this.tokenStore.isExpired(stored),
      expiresAt: stored.expires_at,
      scope: stored.scope,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/auth/auth-manager.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/auth/auth-manager.ts src/auth/auth-manager.test.ts
git commit -m "feat(auth): add auth manager with token lifecycle orchestration"
```

---

## Task 6: Common Tools (auth status/login)

**Files:**
- Create: `src/tools/common.ts`
- Create: `src/tools/common.test.ts`

**Step 1: Write the failing test**

Create `src/tools/common.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/common.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/tools/common.ts`:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AuthManager } from "../auth/auth-manager.js";
import type { MfApiClient } from "../client/mf-api-client.js";

export function registerCommonTools(
  server: McpServer,
  authManager: AuthManager,
  _apiClient: MfApiClient
): void {
  server.registerTool("mf_auth_status", {
    description:
      "Check MF Cloud authentication status — shows whether tokens are valid and when they expire.",
    inputSchema: z.object({}),
  }, async () => {
    const status = await authManager.getAuthStatus();
    const text = status.authenticated
      ? `Authenticated. Token expires at: ${new Date(status.expiresAt!).toISOString()}. Scopes: ${status.scope}`
      : "Not authenticated. Run mf_auth_login to authenticate.";
    return { content: [{ type: "text" as const, text }] };
  });

  server.registerTool("mf_auth_login", {
    description:
      "Re-authenticate with MF Cloud — opens browser for OAuth login. Use when tokens have expired and auto-refresh failed.",
    inputSchema: z.object({}),
  }, async () => {
    try {
      await authManager.doInteractiveAuth();
      return {
        content: [
          { type: "text" as const, text: "Authentication successful. You can now use MF Cloud tools." },
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
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/common.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/common.ts src/tools/common.test.ts
git commit -m "feat(tools): add mf_auth_status and mf_auth_login tools"
```

---

## Task 7: Expense Tools — Offices & Transactions

**Files:**
- Create: `src/tools/expense/transactions.ts`
- Create: `src/tools/expense/transactions.test.ts`
- Create: `src/types/expense.ts`

**Step 1: Write types**

Create `src/types/expense.ts`:

```typescript
export const EXPENSE_BASE_URL =
  "https://expense.moneyforward.com/api/external";
```

**Step 2: Write the failing test**

Create `src/tools/expense/transactions.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { registerExpenseTransactionTools } from "./transactions.js";

describe("registerExpenseTransactionTools", () => {
  it("registers expense transaction tools", () => {
    const mockServer = { registerTool: vi.fn() };
    const mockApiClient = {} as any;

    registerExpenseTransactionTools(mockServer as any, mockApiClient);

    const toolNames = mockServer.registerTool.mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(toolNames).toContain("expense_list_offices");
    expect(toolNames).toContain("expense_get_me");
    expect(toolNames).toContain("expense_list_my_transactions");
    expect(toolNames).toContain("expense_create_my_transaction");
    expect(toolNames).toContain("expense_get_my_transaction");
    expect(toolNames).toContain("expense_update_my_transaction");
    expect(toolNames).toContain("expense_delete_my_transaction");
    expect(toolNames).toContain("expense_list_transactions");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run src/tools/expense/transactions.test.ts`
Expected: FAIL — module not found

**Step 4: Write the implementation**

Create `src/tools/expense/transactions.ts` with tools:
- `expense_list_offices` — GET `/v1/offices`
- `expense_get_me` — GET `/v2/offices/{office_id}/me`
- `expense_list_my_transactions` — GET `/v1/offices/{office_id}/me/ex_transactions`
- `expense_create_my_transaction` — POST `/v1/offices/{office_id}/me/ex_transactions`
- `expense_get_my_transaction` — GET `/v1/offices/{office_id}/me/ex_transactions/{id}`
- `expense_update_my_transaction` — PUT `/v1/offices/{office_id}/me/ex_transactions/{id}`
- `expense_delete_my_transaction` — DELETE `/v1/offices/{office_id}/me/ex_transactions/{id}`
- `expense_list_transactions` — GET `/v1/offices/{office_id}/ex_transactions`

Each tool uses `z.object()` for inputSchema with `office_id` as required string, returns `{ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }`.

**Step 5: Run tests, commit**

```bash
git add src/types/expense.ts src/tools/expense/transactions.ts src/tools/expense/transactions.test.ts
git commit -m "feat(expense): add office listing and transaction CRUD tools"
```

---

## Task 8: Expense Tools — Reports & Approvals

**Files:**
- Create: `src/tools/expense/reports.ts`
- Create: `src/tools/expense/reports.test.ts`

Same pattern. Register:
- `expense_list_my_reports` — GET `/v1/offices/{id}/me/ex_reports`
- `expense_get_my_report` — GET `/v1/offices/{id}/me/ex_reports/{id}`
- `expense_list_reports` — GET `/v1/offices/{id}/ex_reports`
- `expense_get_report` — GET `/v1/offices/{id}/ex_reports/{id}`
- `expense_list_report_transactions` — GET `/v1/offices/{id}/ex_reports/{report_id}/ex_transactions`
- `expense_list_my_approving_reports` — GET `/v1/offices/{id}/me/approving_ex_reports`
- `expense_approve_report` — POST `/v1/offices/{id}/me/approving_ex_reports/{report_id}/approve`
- `expense_reject_report` — POST `/v1/offices/{id}/me/approving_ex_reports/{report_id}/disapprove`

**Commit:** `feat(expense): add report listing and approval workflow tools`

---

## Task 9: Expense Tools — Masters & Members

**Files:**
- Create: `src/tools/expense/masters.ts`
- Create: `src/tools/expense/members.ts`
- Create: `src/tools/expense/masters.test.ts`
- Create: `src/tools/expense/members.test.ts`

**Masters:**
- `expense_list_departments` / `create_department` / `update_department` / `delete_department`
- `expense_list_projects` / `create_project` / `update_project` / `delete_project`
- `expense_list_positions`
- `expense_list_categories`
- `expense_list_excises`

**Members:**
- `expense_list_members` / `create_member` / `get_member` / `update_member` / `delete_member`

**Commit:** `feat(expense): add master data and member management tools`

---

## Task 10: Expense Tools — Journals

**Files:**
- Create: `src/tools/expense/journals.ts`
- Create: `src/tools/expense/journals.test.ts`

Register:
- `expense_get_transaction_journal` — GET `/v1/offices/{id}/ex_transactions/{txn_id}/ex_journal`
- `expense_get_report_journal` — GET `/v1/offices/{id}/ex_reports/{report_id}/ex_journal`
- `expense_list_journals_by_reports` — GET `/v1/offices/{id}/ex_journals_by_ex_reports`
- `expense_list_journals_by_transactions` — GET `/v1/offices/{id}/ex_journals_by_ex_transactions`

**Commit:** `feat(expense): add journal entry retrieval tools`

---

## Task 11: Invoice Tools — Billings

**Files:**
- Create: `src/tools/invoice/billings.ts`
- Create: `src/tools/invoice/billings.test.ts`
- Create: `src/types/invoice.ts`

Create `src/types/invoice.ts`:

```typescript
export const INVOICE_BASE_URL = "https://invoice.moneyforward.com/api/v3";
```

Register:
- `invoice_list_billings` — GET `/billings`
- `invoice_get_billing` — GET `/billings/{id}`
- `invoice_create_billing` — POST `/invoice_template_billings`
- `invoice_update_billing` — PUT `/billings/{id}`
- `invoice_delete_billing` — DELETE `/billings/{id}`
- `invoice_add_billing_item` — POST `/billings/{id}/items`

**Commit:** `feat(invoice): add billing CRUD and line item tools`

---

## Task 12: Invoice Tools — Quotes, Partners, Items

**Files:**
- Create: `src/tools/invoice/quotes.ts`
- Create: `src/tools/invoice/partners.ts`
- Create: `src/tools/invoice/items.ts`
- Create tests for each

**Quotes (quotes.ts):**
- `invoice_list_quotes` — GET `/quotes`
- `invoice_get_quote` — GET `/quotes/{id}`
- `invoice_create_quote` — POST `/quotes`
- `invoice_update_quote` — PUT `/quotes/{id}`
- `invoice_delete_quote` — DELETE `/quotes/{id}`
- `invoice_add_quote_item` — POST `/quotes/{id}/items`
- `invoice_convert_quote_to_billing` — POST `/quotes/{id}/convert_to_billing`

**Partners (partners.ts):**
- `invoice_list_partners` — GET `/partners` (search params: name, code, name_kana, partner_pic, office_pic)
- `invoice_get_partner` — GET `/partners/{id}`
- `invoice_create_partner` — POST `/partners`
- `invoice_update_partner` — PUT `/partners/{id}`
- `invoice_delete_partner` — DELETE `/partners/{id}`
- `invoice_create_department` — POST `/partners/{id}/departments`

**Items (items.ts):**
- `invoice_list_items` — GET `/items` (search params: name, code)
- `invoice_get_item` — GET `/items/{id}`
- `invoice_create_item` — POST `/items`
- `invoice_update_item` — PUT `/items/{id}`
- `invoice_delete_item` — DELETE `/items/{id}`

**Commit:** `feat(invoice): add quotes, partners, and items tools`

---

## Task 13: MCP Server Entry Point

**Files:**
- Modify: `src/index.ts`

Replace `src/index.ts` with the full server wiring:

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "node:path";
import { homedir } from "node:os";

import { TokenStore } from "./auth/token-store.js";
import { OAuthClient } from "./auth/oauth-client.js";
import { AuthManager } from "./auth/auth-manager.js";
import { MfApiClient } from "./client/mf-api-client.js";
import { registerCommonTools } from "./tools/common.js";
import { registerExpenseTransactionTools } from "./tools/expense/transactions.js";
import { registerExpenseReportTools } from "./tools/expense/reports.js";
import { registerExpenseMasterTools } from "./tools/expense/masters.js";
import { registerExpenseMemberTools } from "./tools/expense/members.js";
import { registerExpenseJournalTools } from "./tools/expense/journals.js";
import { registerInvoiceBillingTools } from "./tools/invoice/billings.js";
import { registerInvoiceQuoteTools } from "./tools/invoice/quotes.js";
import { registerInvoicePartnerTools } from "./tools/invoice/partners.js";
import { registerInvoiceItemTools } from "./tools/invoice/items.js";

const clientId = process.env.MF_CLIENT_ID;
const clientSecret = process.env.MF_CLIENT_SECRET;
const redirectUri =
  process.env.MF_REDIRECT_URI ?? "http://localhost:3456/callback";

if (!clientId || !clientSecret) {
  console.error(
    "Error: MF_CLIENT_ID and MF_CLIENT_SECRET environment variables are required."
  );
  console.error(
    "Register your app at https://app-portal.moneyforward.com/authorized_apps/"
  );
  process.exit(1);
}

const tokenStore = new TokenStore(
  join(homedir(), ".mf-cloud", "tokens.json")
);
const oauthClient = new OAuthClient({ clientId, clientSecret, redirectUri });
const authManager = new AuthManager(tokenStore, oauthClient);
const apiClient = new MfApiClient(() => authManager.getValidToken());

const server = new McpServer({
  name: "mf-cloud-mcp-server",
  version: "0.1.0",
});

// Register all tools
registerCommonTools(server, authManager, apiClient);
registerExpenseTransactionTools(server, apiClient);
registerExpenseReportTools(server, apiClient);
registerExpenseMasterTools(server, apiClient);
registerExpenseMemberTools(server, apiClient);
registerExpenseJournalTools(server, apiClient);
registerInvoiceBillingTools(server, apiClient);
registerInvoiceQuoteTools(server, apiClient);
registerInvoicePartnerTools(server, apiClient);
registerInvoiceItemTools(server, apiClient);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("mf-cloud-mcp-server connected via stdio");
```

**Build and verify:**

Run: `npm run build`
Expected: No errors

**Commit:** `feat: wire up MCP server entry point with all tool registrations`

---

## Task 14: Vitest Config & Run All Tests

**Files:**
- Create: `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
```

Run: `npm test`
Expected: All tests pass

Run: `npm run build`
Expected: No errors

**Commit:** `chore: add vitest config and verify all tests pass`

---

## Task 15: README & Claude Code Config

**Files:**
- Modify: `README.md`

Write README with:
- Project description
- Prerequisites (Node.js 18+, MF App Portal registration)
- Quick setup with env vars and Claude Code `.mcp.json` config
- Available tools grouped by service
- Authentication flow explanation
- Security notes

Claude Code config example for README:

```json
{
  "mcpServers": {
    "mf-cloud": {
      "command": "npx",
      "args": ["@noahlogy/mf-cloud-mcp-server"],
      "env": {
        "MF_CLIENT_ID": "your-client-id",
        "MF_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**Commit:** `docs: add comprehensive README with setup guide`

---

## Task 16: Final Build Check & Push

Run:
```bash
npm run lint && npm test && npm run build
```
Expected: All pass

Push:
```bash
git push origin main
```

Verify at https://github.com/Noahlogy/mf-cloud-mcp-server

---

## Summary

| Task | Component | Tools Added |
|------|-----------|-------------|
| 1 | Project scaffolding | — |
| 2 | Token store | — |
| 3 | OAuth client | — |
| 4 | MF API client | — |
| 5 | Auth manager | — |
| 6 | Common tools | 2 (auth_status, auth_login) |
| 7 | Expense transactions | 8 |
| 8 | Expense reports | 8 |
| 9 | Expense masters + members | ~15 |
| 10 | Expense journals | 4 |
| 11 | Invoice billings | 6 |
| 12 | Invoice quotes/partners/items | ~17 |
| 13 | Server entry point | — |
| 14 | Test config | — |
| 15 | README | — |
| 16 | Final push | — |

**Total: ~60 tools across 16 tasks**
