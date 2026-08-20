import type {
  GameContent,
  ProjectileDefinition,
} from "../types";

export type { GameContent };

export function createInitialWeaponAmmo(
  loadout: string[],
  projectiles: Record<string, ProjectileDefinition>,
): Record<string, number> {
  const weaponAmmo: Record<string, number> = {};
  for (const slotId of loadout) {
    const proj = projectiles[slotId];
    weaponAmmo[slotId] = proj
      ? proj.initialAmmo !== undefined
        ? proj.initialAmmo
        : 1
      : 1;
  }
  return weaponAmmo;
}

const TANK_DESCRIPTIONS: Record<string, string> = {
  ignis: "Aggressive magma-forged siege crawler with volcanic heat vents and dual napalm exhaust.",
  glacies: "Sub-zero crystalline juggernaut with frosted armor plating and an elongated cryo lance cannon.",
  terra: "Industrial earthmover chassis with hydraulic recoil pistons, hazard stripes, and heavy steel tracks.",
  volt: "High-tech hover chassis with central plasma arc reactor and twin electromagnetic rail coils.",
};

export type TankDefinitionIds = string;
export type TankProjectileDefinitionIds = string;

export type TankProjectileDefinition = {
  id: TankProjectileDefinitionIds;
  name: string;
  description?: string;
  intendedUse?: string;
  color: string;
  type: string;
  initialAmmo?: number;
  visual: {
    radius: number;
    fill: string;
    stroke: string;
    accent: string;
  };
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
              description: projDef?.description,
              intendedUse: projDef?.intendedUse,
              color: projDef?.visual?.fill ?? "#38bdf8",
              type: projDef?.damageEffectType === "FOCUSED" ? "Focused Drill" : "Radial Blast",
              initialAmmo: projDef?.initialAmmo,
              visual: projDef?.visual ?? {
                radius: 4.0,
                fill: "#475569",
                stroke: "#38bdf8",
                accent: "#f59e0b",
              },
            };
          }),
        },
      ]),
    );
  }
}

export default ResourceManager;
