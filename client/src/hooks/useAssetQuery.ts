import { useQuery } from "@tanstack/react-query";
import ResourceManager, {
  type TankDefinition,
  type TankProjectileDefinition,
} from "../game/rendering/ResourceManager";
import TanksClient from "../api/http/TanksClient";
import { GetGameContentRequest } from "../api/http/requests/game/GetGameContentRequest";
import { onlineGameContentFromResponse } from "../game/online/onlineGameContent";

type ProjectileAsset = TankProjectileDefinition;

export type TankAsset = Omit<TankDefinition, "projectiles"> & {
  projectiles: ProjectileAsset[];
};

export async function fetchAssets(): Promise<TankAsset[]> {
  const resourceManager = ResourceManager.getInstance();
  if (!resourceManager.isLoaded()) {
    const client = new TanksClient();
    const contentDto = await client.send(new GetGameContentRequest());
    const content = onlineGameContentFromResponse(contentDto);
    resourceManager.setGameContent(content);
  }

  const resources = resourceManager.getTankDefinitions();
  const tankAssets: TankAsset[] = Object.entries(resources).map(([_, tank]) => {
    const projectiles: ProjectileAsset[] = tank.projectiles;

    return {
      id: tank.id,
      name: tank.name,
      description: tank.description,
      color: tank.color,
      projectiles,
    };
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
