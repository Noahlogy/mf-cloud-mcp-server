import type { TokenData } from "../auth/token-store.js";

/**
 * Error thrown when a Money Forward Cloud API request returns a non-ok response.
 *
 * Contains the HTTP status code, status text, and raw response body for
 * downstream error handling and debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get("/some/endpoint");
 * } catch (err) {
 *   if (err instanceof MfApiError) {
 *     console.error(`Status ${err.status}: ${err.body}`);
 *   }
 * }
 * ```
 */
export class MfApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string
  ) {
    super(`MF API error ${status}: ${statusText}`);
    this.name = "MfApiError";
  }
}

/** A function that returns the current OAuth2 tokens. */
type TokenProvider = () => Promise<TokenData>;

/**
 * HTTP client for Money Forward Cloud APIs with automatic OAuth2 authorization.
 *
 * Wraps the global `fetch` function, injecting the Bearer token from the
 * provided token provider into every request. Non-ok responses are thrown
 * as `MfApiError` instances.
 *
 * @example
 * ```typescript
 * const client = new MfApiClient(async () => tokenStore.load());
 *
 * // GET with query parameters
 * const offices = await client.get<Office[]>(
 *   "https://expense.moneyforward.com/api/external/v1/offices"
 * );
 *
 * // POST with JSON body
 * const tx = await client.post<Transaction>(
 *   "https://expense.moneyforward.com/api/external/v1/offices/1/ex_transactions",
 *   { amount: 1000 }
 * );
 * ```
 */
export class MfApiClient {
  constructor(private readonly getToken: TokenProvider) {}

  /**
   * Builds the standard request headers including the OAuth2 Bearer token.
   *
   * @returns A record containing Authorization and Content-Type headers
   */
  private async headers(): Promise<Record<string, string>> {
    const tokens = await this.getToken();
    return {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Sends an HTTP request with authorization headers and handles errors.
   *
   * @param url  - The full URL to request
   * @param init - Optional fetch RequestInit overrides (method, body, etc.)
   * @returns The parsed JSON response body
   * @throws {MfApiError} When the response status is not ok (2xx)
   */
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

  /**
   * Sends a GET request to the specified URL.
   *
   * @param url    - The API endpoint URL
   * @param params - Optional query parameters to append to the URL
   * @returns The parsed JSON response body
   * @throws {MfApiError} When the response status is not ok (2xx)
   *
   * @example
   * ```typescript
   * const offices = await client.get<Office[]>(
   *   "https://expense.moneyforward.com/api/external/v1/offices"
   * );
   * ```
   */
  async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const fullUrl = params
      ? `${url}?${new URLSearchParams(params).toString()}`
      : url;
    return this.request<T>(fullUrl);
  }

  /**
   * Sends a POST request with an optional JSON body.
   *
   * @param url  - The API endpoint URL
   * @param body - Optional request body (will be JSON-serialized)
   * @returns The parsed JSON response body
   * @throws {MfApiError} When the response status is not ok (2xx)
   *
   * @example
   * ```typescript
   * const tx = await client.post<Transaction>(
   *   "https://expense.moneyforward.com/api/external/v1/offices/1/ex_transactions",
   *   { amount: 1000 }
   * );
   * ```
   */
  async post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Sends a PUT request with an optional JSON body.
   *
   * @param url  - The API endpoint URL
   * @param body - Optional request body (will be JSON-serialized)
   * @returns The parsed JSON response body
   * @throws {MfApiError} When the response status is not ok (2xx)
   *
   * @example
   * ```typescript
   * const updated = await client.put<Transaction>(
   *   "https://expense.moneyforward.com/api/external/v1/offices/1/ex_transactions/42",
   *   { amount: 2000 }
   * );
   * ```
   */
  async put<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Sends a DELETE request to the specified URL.
   *
   * @param url - The API endpoint URL
   * @returns The parsed JSON response body
   * @throws {MfApiError} When the response status is not ok (2xx)
   *
   * @example
   * ```typescript
   * await client.delete(
   *   "https://expense.moneyforward.com/api/external/v1/offices/1/ex_transactions/42"
   * );
   * ```
   */
  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: "DELETE" });
  }
}
