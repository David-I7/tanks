import { create } from "zustand";

export type TankDefinitionIds =
  | "heavy-armor"
  | "desert-striker"
  | "phantom-stealth";

export type TankProjectileDefinition = {
  id: string;
  name: string;
  type?: string;
  url?: string;
  color?: string;
  label?: string;
};

export type TankDefinition = {
  id: TankDefinitionIds;
  name: string;
  description?: string;
  url?: string;
  projectiles: TankProjectileDefinition[];
};

export const TANK_DEFINITIONS: Record<TankDefinitionIds, TankDefinition> = {
  "heavy-armor": {
    id: "heavy-armor",
    name: "Heavy Armor",
    description: "High durability armored unit",
    url: "",
    projectiles: [
      {
        id: "heavy-shell",
        name: "Heavy Shell",
        type: "Cannon",
        url: "",
        color: "#f59e0b",
        label: "H",
      },
    ],
  },
  "desert-striker": {
    id: "desert-striker",
    name: "Desert Striker",
    description: "Fast mobile strike unit",
    url: "",
    projectiles: [
      {
        id: "standard-shell",
        name: "Standard Shell",
        type: "Cannon",
        url: "",
        color: "#3b82f6",
        label: "S",
      },
    ],
  },
  "phantom-stealth": {
    id: "phantom-stealth",
    name: "Phantom Stealth",
    description: "Stealth reconnaissance unit",
    url: "",
    projectiles: [
      {
        id: "light-shell",
        name: "Light Shell",
        type: "Cannon",
        url: "",
        color: "#10b981",
        label: "L",
      },
    ],
  },
};

export type ProjectileAsset = TankProjectileDefinition & {
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
  const tanks: TankAsset[] = Object.values(TANK_DEFINITIONS).map((tank) => {
    const projectiles: ProjectileAsset[] = tank.projectiles.map((proj) => ({
      ...proj,
      image: null,
    }));
    return { ...tank, projectiles, image: null };
  });

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
