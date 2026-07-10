import { describe, expect, it } from "vitest";
import { assertLoopbackHost, loadConfig } from "../src/security/config.js";
import { validateLuauForDangerousExecution } from "../src/security/luauSafety.js";

describe("security config", () => {
  it("rejects non-loopback binds", () => {
    expect(() => assertLoopbackHost("0.0.0.0")).toThrow(/non-loopback/);
  });

  it("loads a local token config", () => {
    const config = loadConfig({
      ROBLOX_STUDIO_BRIDGE_TOKEN: "123456789012345678901234",
      ROBLOX_STUDIO_BRIDGE_HOST: "127.0.0.1"
    });

    expect(config.tokenWasGenerated).toBe(false);
    expect(config.host).toBe("127.0.0.1");
    expect(config.allowDangerousLuauExecution).toBe(false);
  });
});

describe("dangerous Luau filter", () => {
  it("blocks remote require and HTTP primitives", () => {
    const findings = validateLuauForDangerousExecution(`
      local module = require(123456)
      game:GetService("HttpService"):GetAsync("https://example.com")
    `);

    expect(findings).toContain("require(assetId) is blocked");
    expect(findings).toContain("HttpService access is blocked");
  });

  it("allows simple local Instance edits", () => {
    const findings = validateLuauForDangerousExecution(`
      local part = Instance.new("Part")
      part.Anchored = true
      part.Parent = workspace
    `);

    expect(findings).toEqual([]);
  });
});
