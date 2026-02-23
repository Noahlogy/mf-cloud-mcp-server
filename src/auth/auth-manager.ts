import { TokenStore, type TokenData } from "./token-store.js";
import { OAuthClient } from "./oauth-client.js";

/**
 * Orchestrates the OAuth2 token lifecycle for Money Forward Cloud API access.
 *
 * AuthManager coordinates between the TokenStore (persistence layer) and
 * the OAuthClient (OAuth2 protocol layer) to ensure callers always receive
 * a valid access token. It handles three scenarios transparently:
 *
 * 1. **Valid token exists** - returns it immediately
 * 2. **Expired token exists** - refreshes it using the refresh token
 * 3. **No token / refresh fails** - triggers interactive browser-based auth
 *
 * @example
 * ```typescript
 * const store = new TokenStore("/path/to/tokens.json");
 * const client = new OAuthClient({ clientId: "...", clientSecret: "...", redirectUri: "..." });
 * const manager = new AuthManager(store, client);
 *
 * const tokens = await manager.getValidToken();
 * // tokens.access_token is guaranteed to be valid
 * ```
 */
export class AuthManager {
  constructor(
    private readonly tokenStore: TokenStore,
    private readonly oauthClient: OAuthClient
  ) {}

  /**
   * Obtains a valid access token, refreshing or re-authenticating as needed.
   *
   * The resolution strategy is:
   * 1. Load stored tokens from disk
   * 2. If no tokens exist, run interactive OAuth flow
   * 3. If tokens are still valid, return them
   * 4. If tokens are expired, attempt a refresh
   * 5. If refresh fails, fall back to interactive OAuth flow
   *
   * @returns A TokenData object with a valid (non-expired) access token
   * @throws {Error} If interactive auth fails (e.g., user cancels the browser flow)
   *
   * @example
   * ```typescript
   * const tokens = await manager.getValidToken();
   * const response = await fetch(apiUrl, {
   *   headers: { Authorization: `Bearer ${tokens.access_token}` },
   * });
   * ```
   */
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

  /**
   * Runs the full interactive OAuth authorization flow and persists the result.
   *
   * This opens the user's browser to the Money Forward authorization page,
   * waits for the callback, exchanges the code for tokens, and saves them
   * to the token store.
   *
   * @returns The newly obtained token data
   * @throws {Error} If the OAuth flow fails or the user cancels
   */
  async doInteractiveAuth(): Promise<TokenData> {
    const tokens = await this.oauthClient.authorize();
    await this.tokenStore.save(tokens);
    return tokens;
  }

  /**
   * Returns the current authentication status without triggering any auth flow.
   *
   * Useful for displaying status information to the user or for health checks.
   *
   * @returns An object describing the current auth state:
   *   - `authenticated`: true if a non-expired token exists
   *   - `expiresAt`: Unix timestamp (ms) of token expiry, or null if not authenticated
   *   - `scope`: The granted OAuth scope, or null if not authenticated
   *
   * @example
   * ```typescript
   * const status = await manager.getAuthStatus();
   * if (!status.authenticated) {
   *   console.log("Not authenticated. Run getValidToken() to authenticate.");
   * }
   * ```
   */
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
