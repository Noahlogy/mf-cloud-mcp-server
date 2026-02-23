import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Represents the OAuth2 token data persisted to disk.
 *
 * @property access_token  - The current access token for API requests
 * @property refresh_token - The refresh token used to obtain new access tokens
 * @property expires_at    - Unix timestamp (ms) when the access token expires
 * @property scope         - The OAuth2 scope granted to this token
 */
export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

/** Buffer time before actual expiry to consider a token as expired (60 seconds). */
const EXPIRY_BUFFER_MS = 60_000;

/**
 * Handles persistence and expiry checking of OAuth2 tokens.
 *
 * Tokens are stored as JSON on disk with restricted file permissions (0o600)
 * inside a directory created with restricted permissions (0o700).
 *
 * @example
 * ```typescript
 * const store = new TokenStore("/path/to/tokens.json");
 * const tokens = await store.load();
 * if (!tokens || store.isExpired(tokens)) {
 *   // refresh or re-authenticate
 * }
 * ```
 */
export class TokenStore {
  constructor(private readonly filePath: string) {}

  /**
   * Loads token data from the configured file path.
   *
   * @returns The persisted token data, or null if the file does not exist
   *          or cannot be parsed.
   */
  async load(): Promise<TokenData | null> {
    try {
      const data = await readFile(this.filePath, "utf-8");
      return JSON.parse(data) as TokenData;
    } catch {
      return null;
    }
  }

  /**
   * Saves token data to disk with restricted file permissions.
   *
   * Creates the parent directory if it does not exist (mode 0o700).
   * The token file itself is written with mode 0o600 (owner read/write only).
   *
   * @param tokens - The token data to persist
   */
  async save(tokens: TokenData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    await writeFile(this.filePath, JSON.stringify(tokens, null, 2), {
      mode: 0o600,
    });
  }

  /**
   * Checks whether the given tokens are expired or about to expire.
   *
   * A 60-second buffer is applied so that tokens expiring within the next
   * minute are considered expired. This prevents using tokens that would
   * expire mid-request.
   *
   * @param tokens - The token data to check
   * @returns true if the token is expired or will expire within 60 seconds
   */
  isExpired(tokens: TokenData): boolean {
    return tokens.expires_at - EXPIRY_BUFFER_MS <= Date.now();
  }
}
