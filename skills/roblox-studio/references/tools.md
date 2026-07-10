# Tool Guide

Read this file when choosing tools, repairing a map, or diagnosing a failed build.

| Goal | Tools | Rule |
| --- | --- | --- |
| Confirm connection | `studio_ping` | First call in every session. |
| Inspect hierarchy | `studio_get_tree`, `studio_find_instances`, `studio_get_properties` | Read narrowly before editing. |
| Build a full map | `map_apply_scene_spec` | Dry run, review, apply, validate. |
| Build a graybox | `map_create_blockout` | Validate traversal before styling. |
| Repair generated content | `studio_patch_instances` | Batch related operations; use exact paths. |
| Make one edit | `studio_create_instance`, `studio_set_properties` | Managed roots only. |
| Remove generated content | `studio_delete_instances` | Explicit intent plus confirm token. |
| Generate terrain | `terrain_generate` | Bounded size; shared Terrain side effect. |
| Change materials only | `map_refine_visuals` | Layout stays fixed; dry run first. |
| Inspect composition | `studio_get_camera`, `studio_set_camera`, `studio_focus_instance`, `studio_visual_probe` | Check more than one view. |
| Validate geometry | `map_validate` | Use returned map root and strict geometry. |
| Validate final contract | `map_readiness_check` | Run after `map_validate`; house profile is specialized. |
| Inspect runtime output | `studio_read_output` | Read after apply and playtest. |
| Exercise behavior | `studio_start_playtest`, `studio_stop_playtest` | Follow manual fallback when returned. |

## Repair Sequence

1. Read the failing path and nearby hierarchy.
2. Read properties for the specific parts involved.
3. Focus the camera and run a visual probe from the relevant side.
4. Form one concrete hypothesis: collision, elevation, missing target, wrong parent, or visual contract.
5. Patch the smallest coherent set of instances.
6. Re-run the failed validator plus any affected readiness checks.
7. Playtest interaction changes and inspect output.

## Failure Handling

- Offline: stop map operations and use [setup.md](setup.md).
- Dry run blocked: resolve every blocking risk; do not force apply.
- Apply timeout: inspect `studio_read_output`, reconnect, and inspect the tree before retrying to avoid duplicates.
- Validation error: patch and re-run. Do not downgrade an error to a prose caveat.
- Manual playtest fallback: request the Studio Play or Stop action, then continue verification.
- Unknown existing content: do not delete, rename, or reparent it without explicit user approval.
