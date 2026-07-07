import type { ProjectileDefinition, TankDefinition } from "../types";

export type GameContent = {
  tanks: Record<string, TankDefinition>;
  projectiles: Record<string, ProjectileDefinition>;
};

export const mockGameContent: GameContent = {
  projectiles: {
    basicShell: {
      id: "basicShell",
      name: "Basic Shell",
      physics: {
        radius: 4,
        gravityScale: 1,
        drag: 0,
        muzzleVelocityScale: 1,
      },
      terrainEffect: { type: "crater", radius: 46 },
      damageEffect: { type: "radial", radius: 46, damage: 48 },
      impactAnimationId: "orange-pop",
      impactDuration: 0.42,
      visual: {
        fill: "#f8fafc",
        stroke: "#f97316",
        accent: "#fed7aa",
        label: "S",
      },
    },
    mortar: {
      id: "mortar",
      name: "Mortar",
      physics: {
        radius: 5,
        gravityScale: 1.36,
        drag: 0.02,
        muzzleVelocityScale: 0.78,
      },
      terrainEffect: { type: "crater", radius: 64 },
      damageEffect: { type: "radial", radius: 62, damage: 38 },
      impactAnimationId: "smoke-ring",
      impactDuration: 0.58,
      visual: {
        fill: "#a7f3d0",
        stroke: "#10b981",
        accent: "#064e3b",
        label: "M",
      },
    },
    heavyShell: {
      id: "heavyShell",
      name: "Heavy Shell",
      physics: {
        radius: 7,
        gravityScale: 1.14,
        drag: 0.01,
        muzzleVelocityScale: 0.92,
      },
      terrainEffect: { type: "drill", radius: 38, depth: 42 },
      damageEffect: { type: "focused", radius: 34, damage: 72 },
      impactAnimationId: "red-slam",
      impactDuration: 0.5,
      visual: {
        fill: "#fecaca",
        stroke: "#ef4444",
        accent: "#7f1d1d",
        label: "H",
      },
    },
    cluster: {
      id: "cluster",
      name: "Cluster",
      physics: {
        radius: 3,
        gravityScale: 0.92,
        drag: 0.035,
        muzzleVelocityScale: 1.12,
      },
      terrainEffect: { type: "crater", radius: 30 },
      damageEffect: { type: "radial", radius: 78, damage: 30 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.48,
      visual: {
        fill: "#fde68a",
        stroke: "#eab308",
        accent: "#713f12",
        label: "C",
      },
    },
    needle: {
      id: "needle",
      name: "Needle",
      physics: {
        radius: 2,
        gravityScale: 0.8,
        drag: 0,
        muzzleVelocityScale: 1.35,
      },
      terrainEffect: { type: "drill", radius: 16, depth: 56 },
      damageEffect: { type: "focused", radius: 22, damage: 58 },
      impactAnimationId: "blue-flash",
      impactDuration: 0.36,
      visual: {
        fill: "#bfdbfe",
        stroke: "#3b82f6",
        accent: "#1e3a8a",
        label: "N",
      },
    },
  },
  tanks: {
    vanguard: {
      id: "vanguard",
      name: "Vanguard",
      maxHealth: 110,
      visual: {
        fill: "#22c55e",
        stroke: "#14532d",
        accent: "#bbf7d0",
        label: "V",
      },
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "mortar", label: "Mtr" },
        { id: "heavy", projectileDefinitionId: "heavyShell", label: "Hvy" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
        { id: "needle", projectileDefinitionId: "needle", label: "Ndl" },
      ],
    },
    specter: {
      id: "specter",
      name: "Specter",
      maxHealth: 94,
      visual: {
        fill: "#60a5fa",
        stroke: "#1e3a8a",
        accent: "#dbeafe",
        label: "S",
      },
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "mortar", label: "Mtr" },
        { id: "heavy", projectileDefinitionId: "heavyShell", label: "Hvy" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
        { id: "needle", projectileDefinitionId: "needle", label: "Ndl" },
      ],
    },
  },
};
