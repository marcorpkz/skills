local Safety = {}

Safety.AllowedClasses = {
	Part = true,
	WedgePart = true,
	CornerWedgePart = true,
	TrussPart = true,
	Model = true,
	Folder = true,
	SpawnLocation = true,
	Script = true,
	LocalScript = true,
	ModuleScript = true,
	BillboardGui = true,
	SurfaceGui = true,
	TextLabel = true,
	TextButton = true,
	TextBox = true,
	Attachment = true,
	PointLight = true,
	SpotLight = true,
	ProximityPrompt = true,
	ParticleEmitter = true,
	Decal = true,
	Texture = true,
	WeldConstraint = true,
	HingeConstraint = true,
	BallSocketConstraint = true,
	RopeConstraint = true,
	AlignPosition = true,
	AlignOrientation = true,
}

Safety.GeneratedRoot = "Workspace/MapDrafts"
Safety.LegacyRoot = "Workspace/AI_Generated"
Safety.SafeRoots = {
	["Workspace/MapDrafts"] = true,
	["Workspace/Builds"] = true,
	["Workspace/AI_Generated"] = true,
}
Safety.DeleteConfirmToken = "DELETE_MAP_DRAFTS"

function Safety.assertAllowedClass(className)
	if not Safety.AllowedClasses[className] then
		error(("Class %s is not allowed by Roblox Studio Bridge"):format(tostring(className)))
	end
end

function Safety.assertGeneratedPath(path)
	local normalized = tostring(path):gsub("%.", "/")
	for rootPath in pairs(Safety.SafeRoots) do
		if normalized == rootPath or normalized:sub(1, #rootPath + 1) == rootPath .. "/" then
			return
		end
	end
	error("Refusing to modify content outside managed build roots")
end

function Safety.isManagedPath(path)
	local normalized = tostring(path):gsub("%.", "/")
	for rootPath in pairs(Safety.SafeRoots) do
		if normalized == rootPath or normalized:sub(1, #rootPath + 1) == rootPath .. "/" then
			return true
		end
	end
	return false
end

function Safety.assertDeleteAllowed(paths, confirmToken)
	if confirmToken ~= Safety.DeleteConfirmToken then
		error("Delete requires confirmToken DELETE_MAP_DRAFTS")
	end

	for _, path in ipairs(paths) do
		Safety.assertGeneratedPath(path)
	end
end

function Safety.sanitizeName(name)
	local value = tostring(name or "Generated")
	value = value:gsub("[\r\n\t/\\]", "_")
	if #value > 128 then
		value = value:sub(1, 128)
	end
	return value
end

function Safety.safeMapName(name)
	local value = Safety.sanitizeName(name)
	value = value:gsub("[^%w _-]", "_")
	if value == "" then
		return "GeneratedMap"
	end
	return value
end

function Safety.isDangerousLuau(code)
	local blocked = {}
	local checks = {
		{ "require%s*%(%s*%d+", "require(assetId)" },
		{ "HttpService", "HttpService" },
		{ "loadstring%s*%(", "loadstring" },
		{ "InsertService", "InsertService" },
		{ "%.ROBLOSECURITY", ".ROBLOSECURITY" },
		{ "PluginSecurity", "PluginSecurity" },
	}

	for _, check in ipairs(checks) do
		if tostring(code):find(check[1]) then
			table.insert(blocked, check[2])
		end
	end

	return blocked
end

return Safety
