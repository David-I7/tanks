import { useQuery } from "@tanstack/react-query";
import ResourceManager, {
  type TankDefinition,
  type TankDefinitionIds,
  type TankProjectileDefinition,
  TANK_DEFINITIONS,
} from "../game/rendering/ResourceManager";

export { TANK_DEFINITIONS };

type ProjectileAsset = TankProjectileDefinition & {
  image: HTMLImageElement | null;
};

export type TankAsset = Omit<TankDefinition, "projectiles"> & {
  projectiles: ProjectileAsset[];
} & {
  image: HTMLImageElement | null;
};

export async function fetchAssets(): Promise<TankAsset[]> {
  const resourceManager = ResourceManager.getInstance();
  const resources = await resourceManager.loadResources();

  if (!resources) throw new Error("Failed to load resources");

  const tanks: TankAsset[] = Object.entries(TANK_DEFINITIONS).map(
    ([id, tank]) => {
      const tankId = id as TankDefinitionIds;
      const projectiles: ProjectileAsset[] = tank.projectiles.map((proj) => {
        const projectileId = proj.id as TankProjectileDefinition["id"];
        const image = resources.images[projectileId] || null;
        return { ...proj, image } as ProjectileAsset;
      });
      const image = resources.images[tankId];
      return { ...tank, projectiles, image } as TankAsset;
    },
  );

  return tanks;
}

export function useAssetQuery() {
  return useQuery({
    queryKey: ["gameAssets"],
    queryFn: fetchAssets,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
