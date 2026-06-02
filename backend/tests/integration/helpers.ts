import { createServer, type Server } from "http";
import { createApp } from "../../src/app.js";

export interface TestServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestServer> {
  const app = createApp();
  const server: Server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    baseUrl: `http://localhost:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
  };
}

export async function post(baseUrl: string, path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function get(baseUrl: string, path: string) {
  return fetch(`${baseUrl}${path}`);
}
