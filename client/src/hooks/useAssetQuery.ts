import { useQuery } from "@tanstack/react-query";
import HttpClient from "../api/http/HttpClient";
import AssetsRequest from "../api/http/requests/AssetsRequest";
import { type GameContent } from "../features/game/types/content";

export type ProjectileAsset = {
  id: string;
  name: string;
  label: string;
};

export type TankAsset = {
  id: string;
  name: string;
  description: string;
  color: string;
  projectiles: ProjectileAsset[];
};

export function toTankAssets(content: GameContent): TankAsset[] {
  return Object.values(content.tanks).map((tank) => ({
    id: tank.id,
    name: tank.name,
    description: tank.description,
    color: tank.visual.fillStyle,
    projectiles: tank.loadout.map((projectileId) => {
      const proj = content.projectiles[projectileId];
      return {
        id: projectileId,
        name: proj.name,
        label: proj.label,
      };
    }),
  }));
}

async function getAssets(): Promise<TankAsset[]> {
  const content = await new HttpClient().send(new AssetsRequest());
  return toTankAssets(content);
}

export function useAssetQuery() {
  return useQuery<TankAsset[]>({
    queryKey: ["gameAssets"],
    queryFn: getAssets,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
