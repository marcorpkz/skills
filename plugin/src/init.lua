local Ui = require(script.Bridge.Ui)
local CommandRouter = require(script.Bridge.CommandRouter)
local HttpTransport = require(script.Bridge.HttpTransport)

local toolbar = plugin:CreateToolbar("Roblox Studio Bridge")
local button = toolbar:CreateButton(
        "RobloxStudioBridge",
        "Open Roblox Studio Bridge",
        "rbxassetid://14978048121",
        "Roblox Studio Bridge"
)

button.ClickableWhenViewportHidden = true

local ui = Ui.new(plugin, button)
ui.widget.Enabled = true
local router = CommandRouter.new(plugin, ui)
local transport = HttpTransport.new(plugin, router, ui)

button.Click:Connect(function()
	ui:toggle()
end)

ui:onConnect(function(options)
	transport:start(options)
end)

ui:onDisconnect(function()
	transport:stop()
end)

ui:onUndo(function()
	router:undoLastBatch()
end)

plugin.Unloading:Connect(function()
	transport:stop()
end)

ui:setStatus("Disconnected")
ui:log("Plugin loaded")
