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
  projectileImages: Record<string, HTMLImageElement>;
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
  projectileImages: {},
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

    const projectileKeys = [
      "basicShell",
      "heavyShell",
      "titanShell",
      "precisionDart",
      "pulseRail",
      "mortar",
      "cluster",
      "needle",
    ];

    const projImages: Record<string, HTMLImageElement> = {};
    await Promise.all(
      projectileKeys.map(async (key) => {
        const img = await resourceManager.getImage(key);
        if (img) projImages[key] = img;
      }),
    );

    set({
      isLoaded: true,
      isLoading: false,
      error: success ? null : "Some resources failed to load",
      tanks: tankAssets,
      projectileImages: projImages,
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
