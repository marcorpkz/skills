import { access, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const source = resolve("dist", "RobloxStudioBridge.rbxm");

function defaultPluginDirectory() {
  if (process.env.ROBLOX_STUDIO_PLUGIN_DIR) {
    return resolve(process.env.ROBLOX_STUDIO_PLUGIN_DIR);
  }
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, "Roblox", "Plugins");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Documents", "Roblox", "Plugins");
  }
  throw new Error(
    "Automatic plugin install supports Windows and macOS. Set ROBLOX_STUDIO_PLUGIN_DIR for another location."
  );
}

await access(source);
const pluginDirectory = defaultPluginDirectory();
const destination = join(pluginDirectory, "RobloxStudioBridge.rbxm");
await mkdir(pluginDirectory, { recursive: true });
await copyFile(source, destination);
console.log(`Installed Roblox Studio Bridge at ${destination}`);
