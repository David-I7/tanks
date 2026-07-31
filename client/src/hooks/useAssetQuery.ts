import { useQuery } from "@tanstack/react-query";
import ResourceManager, {
  type TankDefinition,
  type TankProjectileDefinition,
  TANK_DEFINITIONS,
} from "../game/rendering/ResourceManager";

export { TANK_DEFINITIONS };

type ProjectileAsset = TankProjectileDefinition;

export type TankAsset = Omit<TankDefinition, "projectiles"> & {
  projectiles: ProjectileAsset[];
};

export async function fetchAssets(): Promise<TankAsset[]> {
  const resourceManager = ResourceManager.getInstance();
  const resources = resourceManager.getTankDefinitions();

  if (!resources) throw new Error("Failed to load resources");

  const tankAssets: TankAsset[] = Object.entries(resources).map(([_, tank]) => {
    const projectiles: ProjectileAsset[] = tank.projectiles;

    return {
      id: tank.id,
      name: tank.name,
      description: tank.description,
      color: tank.color,
      projectiles,
    } as TankAsset;
  });

  return tankAssets;
}

export function useAssetQuery() {
  return useQuery({
    queryKey: ["gameAssets"],
    queryFn: fetchAssets,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
