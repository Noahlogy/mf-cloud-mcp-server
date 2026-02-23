import { createServer, type Server } from "node:http";

/**
 * Starts a temporary local HTTP server to receive the OAuth callback.
 *
 * The server listens on the specified port and waits for a GET request
 * to `/callback` containing either a `code` or `error` query parameter.
 * On success, the authorization code and the server instance are returned
 * so the caller can close the server after use.
 *
 * @param port - The local port to listen on (e.g., 3456)
 * @returns A promise that resolves with the authorization code and server,
 *          or rejects if the OAuth provider returns an error
 *
 * @example
 * ```typescript
 * const { code, server } = await waitForCallback(3456);
 * server.close();
 * // Use `code` to exchange for tokens
 * ```
 */
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
