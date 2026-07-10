# AGENTS.md

- Inspect repo first.
- Plan before broad MCP/plugin/protocol changes.
- Do not break protocol compatibility without migration notes.
- Plugin and MCP server changes need a test or manual verification step.
- Roblox/Luau changes must preserve local-first safety and Studio Undo.
- Map build flow: prompt -> SceneSpec -> dry-run -> apply -> validate.
- New maps go under `Workspace/MapDrafts`.
- `Workspace/AI_Generated` accepted for migration only.
- Do not edit user Workspace outside build roots without explicit permission.
- Prefer multilevel named structures and unique instance names.
- No Roblox credentials, `.ROBLOSECURITY`, or non-allowlisted external asset IDs.
