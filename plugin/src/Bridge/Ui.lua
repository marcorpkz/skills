local Ui = {}
Ui.__index = Ui

local function makeText(parent, name, text, position, size)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.Text = text
	label.Position = position
	label.Size = size
	label.BackgroundTransparency = 1
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.Font = Enum.Font.SourceSans
	label.TextSize = 14
	label.TextColor3 = Color3.fromRGB(230, 230, 230)
	label.Parent = parent
	return label
end

local function makeButton(parent, name, text, position, size)
	local button = Instance.new("TextButton")
	button.Name = name
	button.Text = text
	button.Position = position
	button.Size = size
	button.Font = Enum.Font.SourceSansSemibold
	button.TextSize = 14
	button.BackgroundColor3 = Color3.fromRGB(45, 48, 54)
	button.TextColor3 = Color3.fromRGB(245, 245, 245)
	button.BorderSizePixel = 0
	button.Parent = parent
	return button
end

local function makeBox(parent, name, text, position, size)
	local box = Instance.new("TextBox")
	box.Name = name
	box.Text = text
	box.Position = position
	box.Size = size
	box.ClearTextOnFocus = false
	box.Font = Enum.Font.Code
	box.TextSize = 13
	box.BackgroundColor3 = Color3.fromRGB(28, 30, 34)
	box.TextColor3 = Color3.fromRGB(245, 245, 245)
	box.BorderSizePixel = 0
	box.Parent = parent
	return box
end

function Ui.new(plugin, toolbarButton)
	local self = setmetatable({}, Ui)
	self.plugin = plugin
	self.toolbarButton = toolbarButton
	self.logs = {}
	self.connectCallbacks = {}
	self.disconnectCallbacks = {}
	self.undoCallbacks = {}

	local info = DockWidgetPluginGuiInfo.new(
		Enum.InitialDockState.Right,
		false,
		false,
		360,
		420,
		320,
		280
	)
	self.widget = plugin:CreateDockWidgetPluginGui("RobloxStudioBridge", info)
	self.widget.Title = "Roblox Studio Bridge"

	local root = Instance.new("Frame")
	root.Name = "Root"
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.fromRGB(22, 24, 28)
	root.BorderSizePixel = 0
	root.Parent = self.widget

	self.statusLabel = makeText(root, "Status", "Status: Disconnected", UDim2.new(0, 12, 0, 10), UDim2.new(1, -24, 0, 24))
	makeText(root, "HostLabel", "Host", UDim2.new(0, 12, 0, 44), UDim2.new(0, 70, 0, 24))
	makeText(root, "PortLabel", "Port", UDim2.new(0, 232, 0, 44), UDim2.new(0, 40, 0, 24))
	self.hostBox = makeBox(root, "HostBox", plugin:GetSetting("host") or "127.0.0.1", UDim2.new(0, 58, 0, 44), UDim2.new(0, 164, 0, 24))
	self.portBox = makeBox(root, "PortBox", tostring(plugin:GetSetting("port") or 3765), UDim2.new(0, 272, 0, 44), UDim2.new(0, 72, 0, 24))
	makeText(root, "TokenLabel", "Token", UDim2.new(0, 12, 0, 78), UDim2.new(0, 70, 0, 24))
	self.tokenBox = makeBox(root, "TokenBox", "", UDim2.new(0, 58, 0, 78), UDim2.new(1, -70, 0, 24))

	local connectButton = makeButton(root, "Connect", "Connect", UDim2.new(0, 12, 0, 116), UDim2.new(0, 88, 0, 30))
	local disconnectButton = makeButton(root, "Disconnect", "Disconnect", UDim2.new(0, 108, 0, 116), UDim2.new(0, 96, 0, 30))
	local undoButton = makeButton(root, "Undo", "Undo Last Batch", UDim2.new(0, 212, 0, 116), UDim2.new(0, 132, 0, 30))

	self.dryRunButton = makeButton(root, "DryRun", "Dry Run: On", UDim2.new(0, 12, 0, 156), UDim2.new(0, 112, 0, 30))
	self.applyButton = makeButton(root, "Apply", "Apply via MCP", UDim2.new(0, 132, 0, 156), UDim2.new(0, 112, 0, 30))
	self.dryRun = true

	self.commandLabel = makeText(root, "Commands", "Last commands / logs", UDim2.new(0, 12, 0, 198), UDim2.new(1, -24, 0, 24))
	self.logBox = makeText(root, "LogBox", "", UDim2.new(0, 12, 0, 226), UDim2.new(1, -24, 1, -238))
	self.logBox.TextYAlignment = Enum.TextYAlignment.Top
	self.logBox.TextWrapped = true

	connectButton.MouseButton1Click:Connect(function()
		local options = self:getConnectionOptions()
		plugin:SetSetting("host", options.host)
		plugin:SetSetting("port", options.port)
		for _, callback in ipairs(self.connectCallbacks) do
			callback(options)
		end
		self.tokenBox.Text = ""
	end)

	disconnectButton.MouseButton1Click:Connect(function()
		for _, callback in ipairs(self.disconnectCallbacks) do
			callback()
		end
	end)

	undoButton.MouseButton1Click:Connect(function()
		for _, callback in ipairs(self.undoCallbacks) do
			callback()
		end
	end)

	self.dryRunButton.MouseButton1Click:Connect(function()
		self.dryRun = not self.dryRun
		self.dryRunButton.Text = self.dryRun and "Dry Run: On" or "Dry Run: Off"
	end)

	self.applyButton.MouseButton1Click:Connect(function()
		self:log("Apply is triggered by MCP map_apply_scene_spec dryRun=false")
	end)

	return self
end

function Ui:toggle()
	self.widget.Enabled = not self.widget.Enabled
end

function Ui:setStatus(status)
	self.statusLabel.Text = "Status: " .. tostring(status)
end

function Ui:log(line)
	table.insert(self.logs, os.date("%H:%M:%S") .. " " .. tostring(line))
	while #self.logs > 100 do
		table.remove(self.logs, 1)
	end
	self.logBox.Text = table.concat(self.logs, "\n")
end

function Ui:getLogs(lines)
	local count = math.min(lines or 100, #self.logs)
	local output = {}
	for index = #self.logs - count + 1, #self.logs do
		if self.logs[index] then
			table.insert(output, self.logs[index])
		end
	end
	return output
end

function Ui:getConnectionOptions()
	return {
		host = self.hostBox.Text,
		port = tonumber(self.portBox.Text) or 3765,
		token = self.tokenBox.Text,
	}
end

function Ui:onConnect(callback)
	table.insert(self.connectCallbacks, callback)
end

function Ui:onDisconnect(callback)
	table.insert(self.disconnectCallbacks, callback)
end

function Ui:onUndo(callback)
	table.insert(self.undoCallbacks, callback)
end

return Ui
