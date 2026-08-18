import type {
  GameContent
} from "../types";

export type { GameContent };

export function createInitialWeaponAmmo(
  loadout: string[],
): Record<string, number> {
  const weaponAmmo: Record<string, number> = {};
  for (const slotId of loadout) {
    weaponAmmo[slotId] =
      slotId === "basicShell" || slotId === loadout[0] ? -1 : 1;
  }
  return weaponAmmo;
}

const TANK_DESCRIPTIONS: Record<string, string> = {
  "heavy-armor": "Reinforced steel hull with heavy dual-barreled firepower.",
  "desert-striker":
    "High mobility chassis optimized for speed and long-range accuracy.",
  "vanguard-cyber": "Futuristic navy alloy tank featuring energy rail cannons.",
  specter: "Stealth shadow tank equipped with tactical nukes and toxic trails.",
};

export type TankDefinitionIds = string;
export type TankProjectileDefinitionIds = string;

export type TankProjectileDefinition = {
  id: TankProjectileDefinitionIds;
  name: string;
  label: string;
  color: string;
  type: string;
};

export type TankDefinitionUi = {
  id: TankDefinitionIds;
  name: string;
  description: string;
  color: string;
  projectiles: TankProjectileDefinition[];
};

export type TankDefinition = TankDefinitionUi;

export class ResourceManager {
  private static instance: ResourceManager | null = null;
  private content: GameContent | null = null;

  private constructor() {}

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  setGameContent(content: GameContent): void {
    this.content = content;
  }

  isLoaded(): boolean {
    return this.content !== null;
  }

  getGameContent(): GameContent {
    if (!this.content) {
      throw new Error("GameContent has not been loaded from server");
    }
    return this.content;
  }

  getTankDefinitions(): Record<string, TankDefinitionUi> {
    if (!this.content) {
      throw new Error("GameContent has not been loaded from server");
    }
    return Object.fromEntries(
      Object.entries(this.content.tanks).map(([id, tank]) => [
        id,
        {
          id,
          name: tank.name,
          description: TANK_DESCRIPTIONS[id] ?? `${tank.name} chassis.`,
          color: tank.visual.fill,
          projectiles: tank.loadout.map((slotId) => {
            const projDef = this.content!.projectiles[slotId];
            return {
              id: slotId,
              name: projDef ? projDef.name : slotId,
              label: projDef ? projDef.label : slotId,
              color: "#38bdf8",
              type: "Payload",
            };
          }),
        },
      ]),
    );
  }
}

export default ResourceManager;
