local HttpService = game:GetService("HttpService")

local HttpTransport = {}
HttpTransport.__index = HttpTransport

local function loopbackHost(value)
	local host = tostring(value or ""):lower():match("^%s*(.-)%s*$")
	if host == "127.0.0.1" or host == "localhost" or host == "::1" then
		return host
	end
	return nil
end

function HttpTransport.new(plugin, router, ui)
	local self = setmetatable({}, HttpTransport)
	self.plugin = plugin
	self.router = router
	self.ui = ui
	self.running = false
	self.clientId = HttpService:GenerateGUID(false)
	return self
end

function HttpTransport:start(options)
	if self.running then
		return
	end

	self.host = loopbackHost(options.host or "127.0.0.1")
	if not self.host then
		self.ui:setStatus("Invalid host")
		self.ui:log("Host must be 127.0.0.1, localhost, or ::1")
		return
	end
	self.port = tonumber(options.port) or 3765
	if self.port < 1024 or self.port > 65535 then
		self.ui:setStatus("Invalid port")
		self.ui:log("Port must be between 1024 and 65535")
		return
	end
	self.token = options.token or ""
	if #self.token < 24 then
		self.ui:setStatus("Invalid token")
		self.ui:log("Token must be at least 24 characters")
		return
	end

	local hostForUrl = self.host == "::1" and "[::1]" or self.host
	self.baseUrl = ("http://%s:%d"):format(hostForUrl, self.port)
	self.running = true
	self.ui:setStatus("Connecting")

	task.spawn(function()
		self:run()
	end)
end

function HttpTransport:stop()
	self.running = false
	self.ui:setStatus("Disconnected")
end

function HttpTransport:request(method, path, body)
	local response = HttpService:RequestAsync({
		Url = self.baseUrl .. path,
		Method = method,
		Headers = {
			["Content-Type"] = "application/json",
		},
		Body = body and HttpService:JSONEncode(body) or nil,
	})

	if not response.Success then
		error(("HTTP %s failed: %s"):format(path, tostring(response.StatusMessage)))
	end

	if response.Body == nil or response.Body == "" then
		return {}
	end

	return HttpService:JSONDecode(response.Body)
end

function HttpTransport:register()
	return self:request("POST", "/plugin/register", {
		token = self.token,
		clientId = self.clientId,
		pluginVersion = "0.1.0",
		placeName = game.Name,
		placeId = game.PlaceId,
		status = "Connected",
	})
end

function HttpTransport:poll()
	return self:request("POST", "/plugin/poll", {
		token = self.token,
		clientId = self.clientId,
	})
end

function HttpTransport:sendResult(commandId, ok, result, errorMessage)
	return self:request("POST", "/plugin/result", {
		token = self.token,
		commandId = commandId,
		ok = ok,
		result = result,
		error = errorMessage,
	})
end

function HttpTransport:sendOutput(lines)
	return self:request("POST", "/plugin/output", {
		token = self.token,
		lines = lines,
	})
end

function HttpTransport:run()
	local ok, err = pcall(function()
		self:register()
	end)
	if not ok then
		self.running = false
		self.ui:setStatus("Register failed")
		self.ui:log(tostring(err))
		return
	end

	self.ui:setStatus("Connected")
	self.ui:log("Connected to MCP server")

	while self.running do
		local pollOk, pollResult = pcall(function()
			return self:poll()
		end)

		if not pollOk then
			self.ui:setStatus("Poll failed")
			self.ui:log(tostring(pollResult))
			task.wait(2)
		elseif pollResult.command then
			local command = pollResult.command
			local commandOk, commandResult = pcall(function()
				return self.router:handle(command.name, command.args)
			end)

			local sendOk, sendErr = pcall(function()
				self:sendResult(command.id, commandOk, commandResult, commandOk and nil or tostring(commandResult))
			end)
			if not sendOk then
				self.ui:log("Result send failed: " .. tostring(sendErr))
			end
		else
			task.wait(0.1)
		end
	end
end

return HttpTransport
