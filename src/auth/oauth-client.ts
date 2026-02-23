import { type TokenData } from "./token-store.js";
import { waitForCallback } from "./callback-server.js";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";

/** Base URL for Money Forward Cloud OAuth endpoints. */
const MF_AUTH_BASE = "https://api.biz.moneyforward.com";

/** Token endpoint URL. */
const MF_TOKEN_URL = `${MF_AUTH_BASE}/token`;

/**
 * All OAuth scopes requested by this MCP server.
 *
 * Covers office settings, user settings, transactions, reports,
 * and invoice data (both read and write).
 */
const ALL_SCOPES = [
  "office_setting:write",
  "user_setting:write",
  "transaction:write",
  "report:write",
  "mfc/invoice/data.read",
  "mfc/invoice/data.write",
].join(" ");

/**
 * Configuration required to initialize an OAuth client.
 *
 * @property clientId - The OAuth2 client ID registered with Money Forward
 * @property clientSecret - The OAuth2 client secret
 * @property redirectUri - The redirect URI registered with Money Forward
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * OAuth2 client for the Money Forward Cloud API.
 *
 * Implements the Authorization Code flow with support for token exchange
 * and refresh. When used interactively, the `authorize` method opens the
 * user's browser, starts a local callback server, and waits for the
 * authorization code.
 *
 * @example
 * ```typescript
 * const client = new OAuthClient({
 *   clientId: "my-client-id",
 *   clientSecret: "my-secret",
 *   redirectUri: "http://localhost:3456/callback",
 * });
 *
 * // Interactive authorization
 * const tokens = await client.authorize(3456);
 *
 * // Token refresh
 * const newTokens = await client.refreshToken(tokens.refresh_token);
 * ```
 */
export class OAuthClient {
  constructor(private readonly config: OAuthConfig) {}

  /**
   * Builds the authorization URL that the user should visit to grant access.
   *
   * @param state - A random string for CSRF protection
   * @returns The fully-formed authorization URL
   */
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

  /**
   * Builds the request body for exchanging an authorization code for tokens.
   *
   * @param code - The authorization code received from the OAuth callback
   * @returns URL-encoded form body suitable for a POST to the token endpoint
   */
  buildTokenRequestBody(code: string): URLSearchParams {
    return new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
    });
  }

  /**
   * Builds the request body for refreshing an expired access token.
   *
   * @param refreshToken - The refresh token from a previous token exchange
   * @returns URL-encoded form body suitable for a POST to the token endpoint
   */
  buildRefreshRequestBody(refreshToken: string): URLSearchParams {
    return new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   *
   * @param code - The authorization code from the OAuth callback
   * @returns The token data including access token, refresh token, and expiry
   * @throws {Error} If the token endpoint returns an error response
   */
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

  /**
   * Uses a refresh token to obtain a new access token.
   *
   * @param refreshToken - The refresh token from a previous token exchange
   * @returns Fresh token data with a new access token and updated expiry
   * @throws {Error} If the token endpoint returns an error response
   */
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

  /**
   * Runs the full interactive OAuth authorization flow.
   *
   * Opens the user's browser to the authorization URL, starts a local
   * HTTP server to receive the callback, and exchanges the authorization
   * code for tokens.
   *
   * @param port - The local port for the callback server (default: 3456)
   * @returns The token data from the completed authorization
   * @throws {Error} If the browser cannot be opened or the OAuth flow fails
   */
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
        console.error(
          "Could not open browser automatically. Please open the URL manually."
        );
      }
    });

    const { code, server } = await waitForCallback(port);
    server.close();

    return this.exchangeCode(code);
  }
}
