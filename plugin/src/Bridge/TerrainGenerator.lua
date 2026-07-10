local Workspace = game:GetService("Workspace")

local InstanceSerializer = require(script.Parent.InstanceSerializer)

local TerrainGenerator = {}

local MATERIAL_BY_BIOME = {
	forest = Enum.Material.Grass,
	desert = Enum.Material.Sand,
	snow = Enum.Material.Snow,
	island = Enum.Material.Grass,
	city = Enum.Material.Concrete,
	arena = Enum.Material.Slate,
	obby = Enum.Material.SmoothPlastic,
	custom = Enum.Material.Ground,
}

local function seededNoise(seed, x, z, scale)
	return math.noise((x + seed) / scale, (z - seed) / scale, seed * 0.001)
end

function TerrainGenerator.generate(args)
	local terrain = Workspace.Terrain
	local size = args.size or { 256, 64, 256 }
	local seed = args.seed or os.time()
	local biome = args.biome or "custom"
	local heightNoise = args.heightNoise or 0.4
	local cell = 16
	local halfX = math.floor(size[1] / 2)
	local halfZ = math.floor(size[3] / 2)
	local maxHeight = math.max(8, size[2])
	local material = MATERIAL_BY_BIOME[biome] or Enum.Material.Ground
	local operations = 0

	local markerFolder = InstanceSerializer.ensureFolder(args.parentFolder or "Workspace/MapDrafts")
	local marker = Instance.new("Folder")
	marker.Name = ("Terrain_%s_%d"):format(biome, os.time())
	marker.Parent = markerFolder

	for x = -halfX, halfX, cell do
		for z = -halfZ, halfZ, cell do
			local distance = math.sqrt((x / math.max(halfX, 1)) ^ 2 + (z / math.max(halfZ, 1)) ^ 2)
			local islandMask = biome == "island" and math.clamp(1 - distance, 0, 1) or 1
			local noise = seededNoise(seed, x, z, 72)
			local height = math.max(4, (0.45 + noise * heightNoise) * maxHeight * islandMask)
			local center = CFrame.new(x, height / 2 - 2, z)
			terrain:FillBlock(center, Vector3.new(cell, height, cell), material)
			operations += 1

			if args.water and biome == "island" and distance > 0.72 then
				terrain:FillBlock(CFrame.new(x, 0, z), Vector3.new(cell, 8, cell), Enum.Material.Water)
			end
		end
	end

	return {
		ok = true,
		markerPath = InstanceSerializer.pathOf(marker),
		operations = operations,
		biome = biome,
		seed = seed,
	}
end

return TerrainGenerator
