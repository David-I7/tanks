import { create } from "zustand";
import ResourceManager, {
  type TankDefinition,
  TANK_DEFINITIONS,
} from "../game/rendering/ResourceManager";

export type TankAsset = TankDefinition & {
  image?: HTMLImageElement;
};

export type AssetStore = {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  tanks: TankAsset[];
  selectedTankId: string;
  loadAssets: () => Promise<void>;
  setSelectedTankId: (id: string) => void;
  getTankById: (id: string) => TankAsset | undefined;
};

export { TANK_DEFINITIONS };

export const useAssetStore = create<AssetStore>((set, get) => ({
  isLoaded: false,
  isLoading: false,
  error: null,
  tanks: [],
  selectedTankId: "heavy-armor",

  loadAssets: async () => {
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true, error: null });

    const resourceManager = ResourceManager.getInstance();
    const success = await resourceManager.loadResources();

    const tankDefs = resourceManager.getTankDefinitions();
    const tankAssets: TankAsset[] = await Promise.all(
      tankDefs.map(async (def) => ({
        ...def,
        image: await resourceManager.getImage(def.id),
      })),
    );

    set({
      isLoaded: true,
      isLoading: false,
      error: success ? null : "Some resources failed to load",
      tanks: tankAssets,
    });
  },

  setSelectedTankId: (id: string) => {
    set({ selectedTankId: id });
  },

  getTankById: (id: string) => {
    const foundInState = get().tanks.find((t) => t.id === id);
    if (foundInState) return foundInState;
    const def = TANK_DEFINITIONS.find((t) => t.id === id);
    return def ? { ...def } : undefined;
  },
}));
