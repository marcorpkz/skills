const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brequire\s*\(\s*\d+/i, reason: "require(assetId) is blocked" },
  { pattern: /\bHttpService\b/i, reason: "HttpService access is blocked" },
  { pattern: /\bgame\s*:\s*Http(Get|Post|GetAsync|PostAsync)\b/i, reason: "external HTTP is blocked" },
  { pattern: /\bloadstring\s*\(/i, reason: "loadstring is blocked" },
  { pattern: /\bInsertService\b/i, reason: "remote asset insertion is blocked" },
  { pattern: /\.ROBLOSECURITY/i, reason: ".ROBLOSECURITY access is blocked" },
  { pattern: /\bPluginSecurity\b/i, reason: "PluginSecurity changes are blocked" }
];

export function validateLuauForDangerousExecution(code: string): string[] {
  return BLOCKED_PATTERNS.filter(({ pattern }) => pattern.test(code)).map(({ reason }) => reason);
}

