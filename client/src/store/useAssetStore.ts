import { create } from "zustand";
import { type TankDefinitionIds, TANK_DEFINITIONS } from "../game/rendering/ResourceManager";
import type { TankAsset } from "../hooks/useAssetQuery";

export { TANK_DEFINITIONS };
export type { TankAsset };

export type AssetStore = {
  selectedTankId: TankDefinitionIds | null;
  setSelectedTank: (id: TankDefinitionIds) => void;
};

export const useAssetStore = create<AssetStore>((set) => ({
  selectedTankId: null,
  setSelectedTank: (id: TankDefinitionIds) => {
    set({ selectedTankId: id });
  },
}));
