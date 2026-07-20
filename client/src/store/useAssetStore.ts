import { create } from "zustand";
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

export type AssetStore = {
  isFetching: boolean;
  isLoading: boolean;
  error: Error | null;
  state: "idle" | "pending" | "error" | "success";
  tanks: TankAsset[] | null;
  selectedTank: TankAsset | null;
  loadAssets: () => Promise<TankAsset[] | null>;
  setSelectedTank: (id: TankDefinitionIds) => void;
};

async function fetchAssets(): Promise<TankAsset[]> {
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

export const useAssetStore = create<AssetStore>((set, get) => ({
  isFetching: false,
  isLoading: false,
  error: null,
  state: "idle",
  tanks: null,
  selectedTank: null,

  loadAssets: async () => {
    if (get().isFetching) return get().tanks;

    set({
      isFetching: true,
      isLoading: get().state === "idle",
      state: "pending",
      error: null,
    });

    try {
      const tanks = await fetchAssets();
      set({
        isFetching: false,
        isLoading: false,
        state: "success",
        tanks,
        error: null,
      });
      return tanks;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load assets");
      set({
        isFetching: false,
        isLoading: false,
        state: "error",
        error,
      });
      return null;
    }
  },

  setSelectedTank: (id: TankDefinitionIds) => {
    const tank = get().tanks?.find((t) => t.id === id) || null;
    set({ selectedTank: tank });
  },
}));
