local InstanceSerializer = {}

local SERVICE_ALIASES = {
	game = game,
	Workspace = game:GetService("Workspace"),
	workspace = game:GetService("Workspace"),
	Lighting = game:GetService("Lighting"),
	ReplicatedStorage = game:GetService("ReplicatedStorage"),
	ServerScriptService = game:GetService("ServerScriptService"),
	StarterGui = game:GetService("StarterGui"),
	StarterPack = game:GetService("StarterPack"),
}

local DEFAULT_PROPERTIES = {
	"Anchored",
	"CanCollide",
	"Transparency",
	"Size",
	"Position",
	"Color",
	"Material",
	"BrickColor",
	"Enabled",
}

local function splitPath(path)
	local value = tostring(path)
	if value == "game" then
		return { "game" }
	end
	value = value:gsub("^game%.", "")
	value = value:gsub("^game/", "")
	if value:find("/") then
		return string.split(value, "/")
	end
	return string.split(value, ".")
end

function InstanceSerializer.resolve(path)
	if typeof(path) == "Instance" then
		return path
	end

	local segments = splitPath(path)
	local current = SERVICE_ALIASES[segments[1]]
	local startIndex = 2
	if not current then
		current = game
		startIndex = 1
	end

	for index = startIndex, #segments do
		local name = segments[index]
		if name ~= "" then
			current = current:FindFirstChild(name)
			if not current then
				return nil
			end
		end
	end

	return current
end

function InstanceSerializer.ensureFolder(path)
	local segments = splitPath(path)
	local current = SERVICE_ALIASES[segments[1]]
	local startIndex = 2
	if not current then
		current = game:GetService("Workspace")
		startIndex = 1
	end

	for index = startIndex, #segments do
		local name = segments[index]
		if name ~= "" then
			local child = current:FindFirstChild(name)
			if not child then
				child = Instance.new("Folder")
				child.Name = name
				child.Parent = current
			end
			current = child
		end
	end

	return current
end

function InstanceSerializer.pathOf(instance)
	if instance == game then
		return "game"
	end

	local parts = {}
	local current = instance
	while current and current ~= game do
		table.insert(parts, 1, current.Name)
		current = current.Parent
	end

	return table.concat(parts, "/")
end

local function enumFromString(value)
	local pieces = string.split(value, ".")
	if #pieces < 3 or pieces[1] ~= "Enum" then
		error("Enum value must look like Enum.Material.Concrete")
	end

	local enumType = Enum[pieces[2]]
	if not enumType then
		error(("Unknown enum type %s"):format(pieces[2]))
	end

	return enumType[pieces[3]]
end

function InstanceSerializer.deserialize(value)
	if typeof(value) ~= "table" or value.type == nil then
		return value
	end

	if value.type == "Vector3" then
		return Vector3.new(value.value[1], value.value[2], value.value[3])
	elseif value.type == "Color3" then
		return Color3.new(value.value[1], value.value[2], value.value[3])
	elseif value.type == "CFrame" then
		local components = value.value
		if #components == 3 then
			return CFrame.new(components[1], components[2], components[3])
		end
		return CFrame.new(table.unpack(components))
	elseif value.type == "Enum" then
		return enumFromString(value.value)
	elseif value.type == "UDim2" then
		return UDim2.new(value.value[1], value.value[2], value.value[3], value.value[4])
	elseif value.type == "BrickColor" then
		return BrickColor.new(value.value)
	elseif value.type == "NumberRange" then
		if typeof(value.value) == "table" then
			return NumberRange.new(value.value[1], value.value[2])
		end
		return NumberRange.new(value.value)
	elseif value.type == "ColorSequence" then
		local keypoints = {}
		for _, keypoint in ipairs(value.value) do
			table.insert(
				keypoints,
				ColorSequenceKeypoint.new(
					keypoint.time,
					Color3.new(keypoint.color[1], keypoint.color[2], keypoint.color[3])
				)
			)
		end
		return ColorSequence.new(keypoints)
	end

	error(("Unsupported serialized value type %s"):format(tostring(value.type)))
end

function InstanceSerializer.serialize(value)
	local kind = typeof(value)
	if kind == "Vector3" then
		return { type = "Vector3", value = { value.X, value.Y, value.Z } }
	elseif kind == "Color3" then
		return { type = "Color3", value = { value.R, value.G, value.B } }
	elseif kind == "CFrame" then
		return { type = "CFrame", value = { value:GetComponents() } }
	elseif kind == "EnumItem" then
		return { type = "Enum", value = tostring(value) }
	elseif kind == "UDim2" then
		return { type = "UDim2", value = { value.X.Scale, value.X.Offset, value.Y.Scale, value.Y.Offset } }
	elseif kind == "BrickColor" then
		return { type = "BrickColor", value = value.Name }
	elseif kind == "NumberRange" then
		return { type = "NumberRange", value = { value.Min, value.Max } }
	elseif kind == "ColorSequence" then
		local keypoints = {}
		for _, keypoint in ipairs(value.Keypoints) do
			table.insert(keypoints, {
				time = keypoint.Time,
				color = { keypoint.Value.R, keypoint.Value.G, keypoint.Value.B },
			})
		end
		return { type = "ColorSequence", value = keypoints }
	elseif kind == "Instance" then
		return InstanceSerializer.pathOf(value)
	end

	return value
end

function InstanceSerializer.readProperties(instance, propertyNames)
	local properties = {}
	for _, propertyName in ipairs(propertyNames or DEFAULT_PROPERTIES) do
		local ok, value = pcall(function()
			return instance[propertyName]
		end)
		if ok then
			properties[propertyName] = InstanceSerializer.serialize(value)
		end
	end
	return properties
end

function InstanceSerializer.writeProperties(instance, properties)
	local errors = {}
	for propertyName, rawValue in pairs(properties or {}) do
		local ok, errorMessage = pcall(function()
			instance[propertyName] = InstanceSerializer.deserialize(rawValue)
		end)
		if not ok then
			table.insert(errors, ("%s: %s"):format(propertyName, tostring(errorMessage)))
		end
	end

	if #errors > 0 then
		error(table.concat(errors, "; "))
	end
end

function InstanceSerializer.serializeInstance(instance, includeProperties, propertyNames)
	local node = {
		name = instance.Name,
		className = instance.ClassName,
		path = InstanceSerializer.pathOf(instance),
	}

	if includeProperties then
		node.properties = InstanceSerializer.readProperties(instance, propertyNames)
	end

	return node
end

return InstanceSerializer

