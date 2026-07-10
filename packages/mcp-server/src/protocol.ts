import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { URL } from "node:url";
import type { BridgeConfig } from "./security/config.js";
import type { CommandLogger } from "./logs/commandLogger.js";

type PluginInfo = {
  clientId: string;
  pluginVersion: string;
  placeName: string;
  placeId: number | string;
  status: string;
};

type QueuedCommand = {
  id: string;
  name: string;
  args: unknown;
  createdAt: string;
};

type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type PollWaiter = {
  response: ServerResponse;
  timer: NodeJS.Timeout;
};

export type BridgeStatus = {
  server: {
    host: string;
    port: number;
  };
  connected: boolean;
  lastSeenAt?: string;
  plugin?: PluginInfo;
};

export class StudioBridge {
  private server?: Server;
  private plugin?: PluginInfo;
  private lastSeenAt = 0;
  private readonly queue: QueuedCommand[] = [];
  private readonly pending = new Map<string, PendingCommand>();
  private readonly waiters: PollWaiter[] = [];
  private readonly outputLines: string[] = [];

  constructor(
    private readonly config: BridgeConfig,
    private readonly logger: CommandLogger
  ) {}

  async start(): Promise<void> {
    if (this.server) {
      return;
    }

    this.server = createServer((request, response) => {
      void this.handleRequest(request, response).catch((error: unknown) => {
        this.sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    });

    await new Promise<void>((resolveStart, rejectStart) => {
      this.server?.once("error", rejectStart);
      this.server?.listen(this.config.port, this.config.host, () => resolveStart());
    });
  }

  async stop(): Promise<void> {
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      this.sendJson(waiter.response, 200, { ok: true, command: null });
    }

    await new Promise<void>((resolveStop) => {
      if (!this.server) {
        resolveStop();
        return;
      }
      this.server.close(() => resolveStop());
      this.server = undefined;
    });
  }

  getStatus(): BridgeStatus {
    const connected = Date.now() - this.lastSeenAt < 20_000;
    return {
      server: {
        host: this.config.host,
        port: this.config.port
      },
      connected,
      lastSeenAt: this.lastSeenAt > 0 ? new Date(this.lastSeenAt).toISOString() : undefined,
      plugin: this.plugin
    };
  }

  readOutput(lineCount: number): string[] {
    return this.outputLines.slice(-lineCount);
  }

  async sendCommand(name: string, args: unknown, timeoutMs = this.config.commandTimeoutMs): Promise<unknown> {
    if (!this.getStatus().connected) {
      throw new Error("Roblox Studio plugin is not connected. Open Studio, install plugin, set token, then Connect.");
    }

    const command: QueuedCommand = {
      id: randomUUID(),
      name,
      args,
      createdAt: new Date().toISOString()
    };

    await this.logger.log("command_queued", { commandId: command.id, name, args });

    const resultPromise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(command.id);
        reject(new Error(`Timed out waiting for Studio result for ${name}`));
      }, timeoutMs);
      this.pending.set(command.id, { resolve, reject, timer });
    });

    this.queue.push(command);
    this.flushPollWaiter();
    return resultPromise;
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", `http://${this.config.host}:${this.config.port}`);

    if (request.method === "GET" && url.pathname === "/health") {
      this.sendJson(response, 200, {
        ok: true,
        status: "running",
        connected: this.getStatus().connected
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/plugin/register") {
      const body = await this.readJson(request);
      this.requireBodyToken(body);
      this.lastSeenAt = Date.now();
      this.plugin = {
        clientId: String(body.clientId ?? "studio"),
        pluginVersion: String(body.pluginVersion ?? "unknown"),
        placeName: String(body.placeName ?? "unknown"),
        placeId: String(body.placeId ?? "unknown"),
        status: String(body.status ?? "Connected")
      };
      await this.logger.log("plugin_registered", { plugin: this.plugin });
      this.sendJson(response, 200, { ok: true, serverVersion: "0.1.0" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/plugin/poll") {
      const body = await this.readJson(request);
      this.requireBodyToken(body);
      this.lastSeenAt = Date.now();
      if (this.plugin && body.clientId) {
        this.plugin.clientId = String(body.clientId);
      }
      this.holdOrSendCommand(response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/plugin/result") {
      const body = await this.readJson(request);
      this.requireBodyToken(body);
      this.lastSeenAt = Date.now();
      await this.receiveResult(body);
      this.sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/plugin/output") {
      const body = await this.readJson(request);
      this.requireBodyToken(body);
      const lines = Array.isArray(body.lines) ? body.lines.map(String) : [String(body.line ?? "")];
      this.outputLines.push(...lines.filter((line) => line.length > 0));
      while (this.outputLines.length > 500) {
        this.outputLines.shift();
      }
      this.sendJson(response, 200, { ok: true });
      return;
    }

    this.sendJson(response, 404, { ok: false, error: "Not found" });
  }

  private holdOrSendCommand(response: ServerResponse): void {
    const command = this.queue.shift();
    if (command) {
      this.sendJson(response, 200, { ok: true, command });
      return;
    }

    const waiter: PollWaiter = {
      response,
      timer: setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        this.sendJson(response, 200, { ok: true, command: null });
      }, 25_000)
    };
    this.waiters.push(waiter);
  }

  private flushPollWaiter(): void {
    const waiter = this.waiters.shift();
    const command = this.queue.shift();
    if (!waiter || !command) {
      if (command) {
        this.queue.unshift(command);
      }
      return;
    }

    clearTimeout(waiter.timer);
    this.sendJson(waiter.response, 200, { ok: true, command });
  }

  private async receiveResult(body: Record<string, unknown>): Promise<void> {
    const commandId = String(body.commandId ?? "");
    const pending = this.pending.get(commandId);
    if (!pending) {
      await this.logger.log("command_result_orphaned", { commandId });
      return;
    }

    this.pending.delete(commandId);
    clearTimeout(pending.timer);
    await this.logger.log("command_result", { commandId, ok: body.ok === true });

    if (body.ok === true) {
      pending.resolve(body.result);
      return;
    }

    pending.reject(new Error(String(body.error ?? "Studio command failed")));
  }

  private async readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > 1_000_000) {
        throw new Error("Request body too large");
      }
      chunks.push(buffer);
    }

    const text = Buffer.concat(chunks).toString("utf8");
    if (!text) {
      return {};
    }
    return JSON.parse(text) as Record<string, unknown>;
  }

  private requireBodyToken(body: Record<string, unknown>): void {
    this.requireToken(String(body.token ?? ""));
  }

  private requireToken(candidate: string): void {
    const expected = Buffer.from(this.config.token);
    const actual = Buffer.from(candidate);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new Error("Invalid bridge token");
    }
  }

  private sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
    if (response.writableEnded) {
      return;
    }
    response.writeHead(statusCode, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(JSON.stringify(body));
  }
}
