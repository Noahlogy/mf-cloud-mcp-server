import { createServer, type Server } from "node:http";

const CALLBACK_TIMEOUT_MS = 120_000; // 2 minutes

/** Escapes HTML special characters to prevent XSS. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Starts a temporary local HTTP server to receive the OAuth callback.
 *
 * The server listens on the specified port and waits for a GET request
 * to `/callback` containing a valid `code` and matching `state` parameter.
 * Automatically times out after 2 minutes and closes the server.
 *
 * @param port - The local port to listen on (e.g., 3456)
 * @param expectedState - The OAuth state parameter to validate against CSRF
 * @returns A promise that resolves with the authorization code and server,
 *          or rejects on error/timeout
 */
export function waitForCallback(
  port: number,
  expectedState: string
): Promise<{ code: string; server: Server }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const state = url.searchParams.get("state");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            `<h1>認証エラー</h1><p>${escapeHtml(error)}</p>`
          );
          clearTimeout(timer);
          server.close();
          reject(new Error("OAuth authorization was denied"));
          return;
        }

        if (state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>エラー</h1><p>不正なstateパラメータです。</p>");
          clearTimeout(timer);
          server.close();
          reject(new Error("OAuth state mismatch — possible CSRF attack"));
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            "<h1>認証成功</h1><p>このページを閉じて Claude Code に戻ってください。</p>"
          );
          clearTimeout(timer);
          resolve({ code, server });
          return;
        }
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error("OAuth callback timed out after 2 minutes"));
    }, CALLBACK_TIMEOUT_MS);

    server.listen(port, () => {
      console.error(`OAuth callback server listening on port ${port}`);
    });

    server.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
