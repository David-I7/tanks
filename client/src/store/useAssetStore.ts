import { create } from "zustand";
import type { TankDefinitionIds } from "../game/rendering/ResourceManager";

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
