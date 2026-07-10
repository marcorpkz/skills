import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BridgeConfig } from "../security/config.js";
import type { SceneSpec } from "../schema/sceneSpec.js";

type ApplyResult = {
  mapRootPath?: string;
};

const SERVICE_ROOTS = new Set(["ServerScriptService", "ReplicatedStorage", "StarterGui", "StarterPack"]);

function safeName(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9 _-]/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "MapDraft";
}

function safePathPart(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9 _.-]/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "MapDraft";
}

function safeRelativeRoot(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  if (path.isAbsolute(normalized) || normalized.split("/").some((part) => part === "..")) {
    throw new Error("codegen.rojoRoot must be a relative path inside the bridge workspace.");
  }
  return normalized;
}

function safeScriptSegments(scriptPath: string): string[] {
  const raw = scriptPath.replace(/\\/g, "/").split("/").filter(Boolean);
  const service = SERVICE_ROOTS.has(raw[0] ?? "") ? raw[0] : "ServerScriptService";
  const rest = SERVICE_ROOTS.has(raw[0] ?? "") ? raw.slice(1) : raw;
  const segments = [service, ...rest].map((part) => safePathPart(part));
  if (segments.length === 1) {
    segments.push("MapRuntime.server.lua");
  }
  return segments;
}

function mapRootName(sceneSpec: SceneSpec, applyResult: ApplyResult): string {
  const fromStudio = applyResult.mapRootPath?.split(/[\\/]/).filter(Boolean).pop();
  return fromStudio ?? safeName(sceneSpec.mapName);
}

function projectJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName,
      tree: {
        $className: "DataModel",
        ServerScriptService: {
          $className: "ServerScriptService",
          $path: "ServerScriptService"
        },
        ReplicatedStorage: {
          $className: "ReplicatedStorage",
          $path: "ReplicatedStorage"
        },
        StarterGui: {
          $className: "StarterGui",
          $path: "StarterGui"
        },
        StarterPack: {
          $className: "StarterPack",
          $path: "StarterPack"
        }
      }
    },
    null,
    2
  );
}

export function functionalRuntimeSource(rootPath: string): string {
  return `local TweenService = game:GetService("TweenService")

local MAP_ROOT_PATH = ${JSON.stringify(rootPath)}

local function resolvePath(pathValue)
\tlocal current = game
\tfor segment in string.gmatch(pathValue, "[^/]+") do
\t\tif segment == "Workspace" then
\t\t\tcurrent = workspace
\t\telseif current == game then
\t\t\tcurrent = game:GetService(segment)
\t\telse
\t\t\tcurrent = current:WaitForChild(segment, 10)
\t\tend
\t\tif not current then
\t\t\treturn nil
\t\tend
\tend
\treturn current
end

local mapRoot = resolvePath(MAP_ROOT_PATH)
if not mapRoot then
\twarn("MapInteractions: map root not found", MAP_ROOT_PATH)
\treturn
end

local function vectorAttribute(part, name, fallback)
\tlocal value = part:GetAttribute(name)
\tif typeof(value) == "Vector3" then
\t\treturn value
\tend
\treturn fallback
end

local function promptFor(part, actionText)
\tlocal prompt = part:FindFirstChildWhichIsA("ProximityPrompt", true)
\tif not prompt then
\t\tprompt = Instance.new("ProximityPrompt")
\t\tprompt.Name = "UsePrompt"
\t\tprompt.Parent = part
\tend
\tprompt.ActionText = actionText
\tprompt.ObjectText = part.Name
\tprompt.HoldDuration = 0.12
\tprompt.MaxActivationDistance = 10
\treturn prompt
end

local activeTweens = {}

local function tweenPart(part, prompt, closedCFrame, openOffset)
\tlocal isOpen = part:GetAttribute("StartsOpen") == true
\tlocal busy = false
\tlocal openText = prompt.ActionText
\tlocal autoCloseSeconds = tonumber(part:GetAttribute("AutoCloseSeconds")) or 5
\tif isOpen then
\t\tpart.CFrame = closedCFrame + openOffset
\tend
\tpart:SetAttribute("BridgeIsOpen", isOpen)

\tlocal function setOpen(nextOpen)
\t\tif busy or part:GetAttribute("Locked") == true then
\t\t\treturn
\t\tend
\t\tbusy = true
\t\tisOpen = nextOpen
\t\tpart:SetAttribute("BridgeIsOpen", isOpen)
\t\tprompt.ActionText = isOpen and "Close" or openText
\t\tif activeTweens[part] then
\t\t\tactiveTweens[part]:Cancel()
\t\tend
\t\tlocal goal = isOpen and (closedCFrame + openOffset) or closedCFrame
\t\tlocal tween = TweenService:Create(part, TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { CFrame = goal })
\t\tactiveTweens[part] = tween
\t\ttween.Completed:Connect(function()
\t\t\tif activeTweens[part] == tween then
\t\t\t\tactiveTweens[part] = nil
\t\t\tend
\t\t\tbusy = false
\t\tend)
\t\ttween:Play()
\t\tif isOpen and autoCloseSeconds > 0 then
\t\t\tlocal closeToken = os.clock()
\t\t\tpart:SetAttribute("BridgeCloseToken", closeToken)
\t\t\ttask.delay(autoCloseSeconds, function()
\t\t\t\tif part.Parent and isOpen and part:GetAttribute("BridgeCloseToken") == closeToken then
\t\t\t\t\tsetOpen(false)
\t\t\t\tend
\t\t\tend)
\t\tend
\tend

\treturn function()
\t\tsetOpen(not isOpen)
\tend
end

local function findTarget(name)
\tif not name or name == "" then
\t\treturn nil
\tend
\tfor _, descendant in ipairs(mapRoot:GetDescendants()) do
\t\tif descendant.Name == name then
\t\t\treturn descendant
\t\tend
\tend
\treturn nil
end

for _, descendant in ipairs(mapRoot:GetDescendants()) do
\tif descendant:IsA("BasePart") then
\t\tlocal kind = descendant:GetAttribute("BridgeFunctionalKind")
\t\tif kind == "SlidingDoor" and descendant:GetAttribute("BridgeRuntimeBound") ~= true then
\t\t\tdescendant:SetAttribute("BridgeRuntimeBound", true)
\t\t\tlocal prompt = promptFor(descendant, descendant:GetAttribute("PromptText") or "Open")
\t\t\tprompt.Triggered:Connect(tweenPart(descendant, prompt, descendant.CFrame, vectorAttribute(descendant, "OpenOffset", Vector3.new(0, 0, 5))))
\t\telseif kind == "LiftPlatform" and descendant:GetAttribute("BridgeRuntimeBound") ~= true then
\t\t\tdescendant:SetAttribute("BridgeRuntimeBound", true)
\t\t\tlocal prompt = promptFor(descendant, descendant:GetAttribute("PromptText") or "Move")
\t\t\tprompt.Triggered:Connect(tweenPart(descendant, prompt, descendant.CFrame, vectorAttribute(descendant, "OpenOffset", Vector3.new(0, 16, 0))))
\t\telseif kind == "TeleporterPad" then
\t\t\tlocal prompt = promptFor(descendant, descendant:GetAttribute("PromptText") or "Travel")
\t\t\tprompt.Triggered:Connect(function(player)
\t\t\t\tlocal target = vectorAttribute(descendant, "TargetPosition", descendant.Position + Vector3.new(0, 8, 0))
\t\t\t\tlocal root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
\t\t\t\tif root then
\t\t\t\t\troot.CFrame = CFrame.new(target + Vector3.new(0, 3, 0))
\t\t\t\tend
\t\t\tend)
\t\telseif kind == "ToggleButton" then
\t\t\tlocal prompt = promptFor(descendant, descendant:GetAttribute("PromptText") or "Use")
\t\t\tprompt.Triggered:Connect(function()
\t\t\t\tlocal target = findTarget(descendant:GetAttribute("BridgeTargetName"))
\t\t\t\tif target and target:IsA("BasePart") then
\t\t\t\t\tlocal hidden = target.Transparency < 0.9
\t\t\t\t\ttarget.Transparency = hidden and 1 or 0
\t\t\t\t\ttarget.CanCollide = not hidden
\t\t\t\tend
\t\t\tend)
\t\tend
\tend
end
`;
}

export async function writeRojoArtifacts(
  config: BridgeConfig,
  sceneSpec: SceneSpec,
  applyResult: ApplyResult
): Promise<string[]> {
  if (sceneSpec.codegen?.target !== "rojo" && sceneSpec.codegen?.target !== "both") {
    return [];
  }

  const root = path.join(process.cwd(), safeRelativeRoot(sceneSpec.codegen.rojoRoot), safeName(sceneSpec.mapName));
  const written: string[] = [];
  await mkdir(root, { recursive: true });

  const projectPath = path.join(root, "default.project.json");
  await writeFile(projectPath, projectJson(sceneSpec.codegen.projectName ?? sceneSpec.mapName), "utf8");
  written.push(projectPath);

  for (const script of sceneSpec.scripts) {
    const filePath = path.join(root, ...safeScriptSegments(script.path));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, script.source, "utf8");
    written.push(filePath);
  }

  if (sceneSpec.functionalObjects.length > 0) {
    const runtimePath = path.join(
      root,
      "ServerScriptService",
      "MapDrafts",
      mapRootName(sceneSpec, applyResult),
      "MapInteractions.server.lua"
    );
    await mkdir(path.dirname(runtimePath), { recursive: true });
    await writeFile(runtimePath, functionalRuntimeSource(applyResult.mapRootPath ?? ""), "utf8");
    written.push(runtimePath);
  }

  if (written.length === 1) {
    const notePath = path.join(root, "README.txt");
    await writeFile(notePath, `Rojo project scaffold for ${config.host}:${config.port}.\n`, "utf8");
    written.push(notePath);
  }

  return written;
}
