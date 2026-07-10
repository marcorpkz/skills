import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

export type BridgeLimits = {
  maxObjectCount: number;
  maxTerrainSize: number;
  maxBatchOperations: number;
};

export type BridgeConfig = {
  host: string;
  port: number;
  token: string;
  tokenWasGenerated: boolean;
  deleteConfirmToken: string;
  allowDangerousLuauExecution: boolean;
  commandTimeoutMs: number;
  logsDir: string;
  limits: BridgeLimits;
};

function readInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = env[key];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be an integer between ${minimum} and ${maximum}`);
  }

  return value;
}

export function assertLoopbackHost(host: string): void {
  const normalized = host.trim().toLowerCase();
  const allowed = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!allowed.has(normalized)) {
    throw new Error(
      `Refusing to bind MCP bridge to non-loopback host "${host}". Use 127.0.0.1.`
    );
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const host = env.ROBLOX_STUDIO_BRIDGE_HOST ?? "127.0.0.1";
  assertLoopbackHost(host);

  const providedToken = env.ROBLOX_STUDIO_BRIDGE_TOKEN;
  const token = providedToken ?? randomBytes(32).toString("hex");
  if (token.length < 24) {
    throw new Error("ROBLOX_STUDIO_BRIDGE_TOKEN must be at least 24 characters");
  }

  return {
    host,
    port: readInteger(env, "ROBLOX_STUDIO_BRIDGE_PORT", 3765, 1024, 65535),
    token,
    tokenWasGenerated: !providedToken,
    deleteConfirmToken: "DELETE_MAP_DRAFTS",
    allowDangerousLuauExecution: env.ROBLOX_STUDIO_BRIDGE_ALLOW_DANGEROUS_LUAU === "1",
    commandTimeoutMs: readInteger(env, "ROBLOX_STUDIO_BRIDGE_COMMAND_TIMEOUT_MS", 120_000, 1_000, 600_000),
    logsDir: resolve(env.ROBLOX_STUDIO_BRIDGE_LOGS_DIR ?? "logs"),
    limits: {
      maxObjectCount: readInteger(env, "ROBLOX_STUDIO_BRIDGE_MAX_OBJECT_COUNT", 1000, 1, 20_000),
      maxTerrainSize: readInteger(env, "ROBLOX_STUDIO_BRIDGE_MAX_TERRAIN_SIZE", 2048, 16, 8192),
      maxBatchOperations: readInteger(env, "ROBLOX_STUDIO_BRIDGE_MAX_BATCH_OPERATIONS", 2000, 1, 50_000)
    }
  };
}
