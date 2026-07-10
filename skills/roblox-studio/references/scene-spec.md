# SceneSpec

Read this file for new maps, major rebuilds, terrain generation, gameplay objects, or Rojo output.

## Minimal Shape

```json
{
  "mapName": "Training Yard",
  "description": "Compact traversal course with one checkpoint route.",
  "style": "modern",
  "rootPath": "Workspace/MapDrafts",
  "layout": {
    "kind": "linear",
    "size": [180, 48, 120],
    "primaryAxis": "z",
    "grounding": { "mode": "raycast", "clearance": 0.05, "support": "skirt" }
  },
  "zones": [],
  "instances": [],
  "functionalObjects": [],
  "scripts": [],
  "codegen": { "target": "both", "rojoRoot": "generated/rojo" }
}
```

Required fields are `mapName` and `style`; arrays default empty and `rootPath` defaults to `Workspace/MapDrafts`.

## Modeling Choices

- `layout`: overall bounds, topology, axis, and grounding.
- `buildings`: repeated high-level building generation.
- `levels`: named vertical or interior layers and their connections.
- `pois`: spawn, objective, shop, combat, vista, or transit anchors.
- `connectors`: paths, roads, bridges, stairs, doors, elevators, or teleporters between named anchors or coordinates.
- `instances`: exact Roblox classes and serialized properties when high-level generation is not precise enough.
- `functionalObjects`: doors, buttons, levers, elevators, teleporters, and checkpoints with generated prompts/runtime behavior.
- `scripts`: scoped Luau files. Paths are mapped into service-specific `MapDrafts/<map>` folders.
- `terrain`: bounded Terrain API generation. Terrain touches shared `Workspace.Terrain` and must be called out in the dry run.
- `assetPolicy`: external assets stay disabled unless `allowedAssetIds` is non-empty and user supplied.
- `codegen`: `studio`, `rojo`, or `both`; Rojo output must remain in a relative directory.

## Serialized Values

Use tagged values for Roblox datatypes:

```json
{ "type": "Vector3", "value": [0, 4, 0] }
{ "type": "Color3", "value": [0.2, 0.7, 1] }
{ "type": "Enum", "value": "Enum.Material.SmoothPlastic" }
{ "type": "CFrame", "value": [0, 4, 0] }
```

Supported tags also include `UDim2`, `BrickColor`, `NumberRange`, and `ColorSequence`.

## Before Apply

- Keep `mapName` stable and names unique.
- Check the route at avatar scale, not only from an exterior camera.
- Name visible geometry targeted by interactions before declaring `functionalObjects.target`.
- Review every script source and every service in the dry-run plan.
- Reject or repair a plan that exceeds configured object, batch, or terrain limits.
