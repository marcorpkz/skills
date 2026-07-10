# Setup

Read this file only when the Roblox Studio MCP tools are unavailable or offline.

## Agent Install

Claude Code installs the skill and MCP server together:

```text
/plugin marketplace add ShiroKSH/skills
/plugin install roblox-studio@skills
```

Codex:

```sh
npx skills add ShiroKSH/skills -g
codex mcp add roblox-studio -- npx -y github:ShiroKSH/skills
```

Other Agent Skills hosts:

```sh
npx skills add ShiroKSH/skills -g
```

Add this stdio MCP server in the host's configuration:

```json
{
  "mcpServers": {
    "roblox-studio": {
      "command": "npx",
      "args": ["-y", "github:ShiroKSH/skills"]
    }
  }
}
```

Node.js 20 or newer is required. Restart the agent after adding the MCP server.

## Studio Plugin

```sh
git clone https://github.com/ShiroKSH/skills.git
cd skills
npm install
npm run install:plugin
```

`install:plugin` builds `dist/RobloxStudioBridge.rbxm` with Rojo and copies it to the local Roblox plugins directory on Windows or macOS. If Rojo is missing, install the version in `rokit.toml` with Rokit or follow the manual build steps in the repository README.

In Studio:

1. Enable HTTP requests for the place.
2. Open the `Roblox Studio Bridge` panel.
3. Keep host `127.0.0.1` and port `3765`.
4. Paste the token printed when the MCP server starts, then select `Connect`.

The token is local, is not a Roblox credential, is not stored by the plugin, and is cleared from the panel after connection.

## Offline Diagnosis

1. Confirm the MCP server process is running.
2. Confirm Studio HTTP requests are enabled.
3. Reconnect with the token from the current MCP process; generated tokens change when it restarts.
4. Confirm port `3765` is free and both sides use the same `ROBLOX_STUDIO_BRIDGE_PORT` when overridden.
5. Run `studio_ping` again. Do not proceed with map changes until it reports connected.
