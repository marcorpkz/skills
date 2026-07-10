# Contributing

Small fixes and map examples are welcome.

## No-fork PR flow

If you have write access to this repository, create a branch directly in `ShiroKSH/skills` and open a PR:

```sh
git clone https://github.com/ShiroKSH/skills.git
cd skills
git checkout -b contrib/<your-handle>/<short-change>
npm install
npm run check
git push -u origin contrib/<your-handle>/<short-change>
gh pr create --fill
```

`main` is protected. Do not push directly to `main`; use a PR.

Being listed under Contributors does not grant push access. For the no-fork flow, a maintainer must first add the person as a collaborator with write access. Everyone else must use a fork.

## Checks

Before opening a PR:

```sh
npm run check
npm run validate:skill
```

For Studio plugin changes:

```sh
npm run build:plugin
```

CodeRabbit, Qodo, Sourcery, and CodeQL run automatically on pull requests. Resolve
actionable findings, but verify generated suggestions before applying them. Review
bots do not replace the local checks above or a Studio playtest when behavior changes.

## Safety

- Do not add Roblox credentials, cookies, `.ROBLOSECURITY`, or real tokens.
- Keep new map output under `Workspace/MapDrafts`.
- Do not include screenshots that show private desktop UI, chats, usernames, tokens, or unrelated files.
