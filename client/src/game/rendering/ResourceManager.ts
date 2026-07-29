import { wait } from "../../utils/time";

const TANK_PROJECTILE_DEFINITIONS = {
  basicShell: {
    id: "basicShell",
    name: "Basic Shell",
    label: "Std",
    color: "#f97316",
    type: "Standard",
    url: "/graphics/projectile-basic.svg",
  },
  // Heavy Armor
  titanShell: {
    id: "titanShell",
    name: "Titan Shell",
    label: "Ttn",
    color: "#ef4444",
    type: "Tactical Nuke",
    url: "/graphics/projectile-titan.svg",
  },
  autocannonStream: {
    id: "autocannonStream",
    name: "0.08s Autocannon",
    label: "Auto",
    color: "#fbbf24",
    type: "4-Round Stream",
    url: "/graphics/projectile-autocannon.svg",
  },
  siegeVolley: {
    id: "siegeVolley",
    name: "3-Shot Volley",
    label: "Vly",
    color: "#38bdf8",
    type: "Angled Volley",
    url: "/graphics/projectile-volley.svg",
  },
  heavyBounce: {
    id: "heavyBounce",
    name: "Bouncing Bomb",
    label: "Bnc",
    color: "#a855f7",
    type: "5x Ricochet",
    url: "/graphics/projectile-bouncing.svg",
  },

  // Desert Striker
  precisionLaser: {
    id: "precisionLaser",
    name: "Plasma Penetrator",
    label: "Lsr",
    color: "#22c55e",
    type: "Crater Laser",
    url: "/graphics/projectile-laser.svg",
  },
  sandstormCluster: {
    id: "sandstormCluster",
    name: "Sandstorm Cluster",
    label: "Clu",
    color: "#eab308",
    type: "Apex Split",
    url: "/graphics/projectile-cluster.svg",
  },
  scatterShotgun: {
    id: "scatterShotgun",
    name: "Turret Shotgun",
    label: "Sht",
    color: "#f59e0b",
    type: "5-Bullet Spread",
    url: "/graphics/projectile-shotgun.svg",
  },
  thermalHazard: {
    id: "thermalHazard",
    name: "Thermal Hazard",
    label: "Trl",
    color: "#ef4444",
    type: "5s Damage Trail",
    url: "/graphics/projectile-trail.svg",
  },

  // Vanguard Cyber
  mortar: {
    id: "mortar",
    name: "Hyper Autocannon",
    label: "Auto",
    color: "#38bdf8",
    type: "4-Round Stream",
    url: "/graphics/projectile-mortar.svg",
  },
  heavyShell: {
    id: "heavyShell",
    name: "Cyber Laser",
    label: "Pls",
    color: "#06b6d4",
    type: "Plasma Beam",
    url: "/graphics/projectile-heavy.svg",
  },
  cluster: {
    id: "cluster",
    name: "Cyber Cluster",
    label: "Clu",
    color: "#8b5cf6",
    type: "Cluster Split",
    url: "/graphics/projectile-cluster.svg",
  },
  needle: {
    id: "needle",
    name: "Ricochet Spike",
    label: "Spk",
    color: "#6366f1",
    type: "Ricochet Bounce",
    url: "/graphics/projectile-needle.svg",
  },

  // Specter
  phantomNuke: {
    id: "phantomNuke",
    name: "Phantom Nuke",
    label: "Nuke",
    color: "#ec4899",
    type: "Atomic Payload",
    url: "/graphics/projectile-nuke.svg",
  },
  ghostShotgun: {
    id: "ghostShotgun",
    name: "Ghost Shotgun",
    label: "G-Sht",
    color: "#d946ef",
    type: "Fan Spread",
    url: "/graphics/projectile-ghost.svg",
  },
  spectreVolley: {
    id: "spectreVolley",
    name: "Spectre Volley",
    label: "S-Vly",
    color: "#f43f5e",
    type: "Tri-Volley",
    url: "/graphics/projectile-spectre.svg",
  },
  toxicTrail: {
    id: "toxicTrail",
    name: "Toxic Trail",
    label: "Tox",
    color: "#10b981",
    type: "5s Toxic Hazard",
    url: "/graphics/projectile-toxic.svg",
  },

  // Backward compatibility aliases
  precisionDart: {
    id: "precisionDart",
    name: "Precision Dart",
    label: "P",
    color: "#f59e0b",
    type: "Deep Drill",
    url: "/graphics/projectile-precision.svg",
  },
  pulseRail: {
    id: "pulseRail",
    name: "Pulse Rail",
    label: "R",
    color: "#38bdf8",
    type: "Plasma Core",
    url: "/graphics/projectile-rail.svg",
  },
};

type TaankProkectileDefinitionIds = keyof typeof TANK_PROJECTILE_DEFINITIONS;

export const TANK_DEFINITIONS = {
  "heavy-armor": {
    id: "heavy-armor",
    name: "Heavy Armor",
    description: "Reinforced steel hull with heavy dual-barreled firepower.",
    url: "/graphics/tank-heavy.svg",
    color: "#ef4444",
    projectiles: [
      TANK_PROJECTILE_DEFINITIONS.basicShell,
      TANK_PROJECTILE_DEFINITIONS.titanShell,
      TANK_PROJECTILE_DEFINITIONS.autocannonStream,
      TANK_PROJECTILE_DEFINITIONS.siegeVolley,
      TANK_PROJECTILE_DEFINITIONS.heavyBounce,
    ],
  },
  "desert-striker": {
    id: "desert-striker",
    name: "Desert Striker",
    description:
      "High mobility chassis optimized for speed and long-range accuracy.",
    url: "/graphics/tank-striker.svg",
    color: "#eab308",
    projectiles: [
      TANK_PROJECTILE_DEFINITIONS.basicShell,
      TANK_PROJECTILE_DEFINITIONS.precisionLaser,
      TANK_PROJECTILE_DEFINITIONS.sandstormCluster,
      TANK_PROJECTILE_DEFINITIONS.scatterShotgun,
      TANK_PROJECTILE_DEFINITIONS.thermalHazard,
    ],
  },
  "vanguard-cyber": {
    id: "vanguard-cyber",
    name: "Vanguard Cyber",
    description: "Futuristic navy alloy tank featuring energy rail cannons.",
    url: "/graphics/tank-vanguard.svg",
    color: "#06b6d4",
    projectiles: [
      TANK_PROJECTILE_DEFINITIONS.basicShell,
      TANK_PROJECTILE_DEFINITIONS.mortar,
      TANK_PROJECTILE_DEFINITIONS.heavyShell,
      TANK_PROJECTILE_DEFINITIONS.cluster,
      TANK_PROJECTILE_DEFINITIONS.needle,
    ],
  },
  specter: {
    id: "specter",
    name: "Specter",
    description: "Stealth shadow tank equipped with tactical nukes and toxic trails.",
    url: "/graphics/tank-specter.svg",
    color: "#a855f7",
    projectiles: [
      TANK_PROJECTILE_DEFINITIONS.basicShell,
      TANK_PROJECTILE_DEFINITIONS.phantomNuke,
      TANK_PROJECTILE_DEFINITIONS.ghostShotgun,
      TANK_PROJECTILE_DEFINITIONS.spectreVolley,
      TANK_PROJECTILE_DEFINITIONS.toxicTrail,
    ],
  },
};

export type TankDefinitionIds = keyof typeof TANK_DEFINITIONS;

export type Resources = {
  images: {
    [key in ImageIds]: HTMLImageElement | null;
  };
};

export type TankProjectileDefinition = {
  id: TaankProkectileDefinitionIds;
  name: string;
  label: string;
  color: string;
  type: string;
  url: string;
};

export type TankDefinition = {
  id: TankDefinitionIds;
  name: string;
  description: string;
  url: string;
  color: string;
  projectiles: TankProjectileDefinition[];
};

type ImageIds = TankDefinitionIds | TaankProkectileDefinitionIds;

const RESOURCE_URLS = {
  images: {
    "heavy-armor": "/graphics/tank-heavy.svg",
    "desert-striker": "/graphics/tank-striker.svg",
    "vanguard-cyber": "/graphics/tank-vanguard.svg",
    specter: "/graphics/tank-specter.svg",

    // Projectile assets
    basicShell: "/graphics/projectile-basic.svg",
    heavyShell: "/graphics/projectile-heavy.svg",
    titanShell: "/graphics/projectile-titan.svg",
    autocannonStream: "/graphics/projectile-autocannon.svg",
    siegeVolley: "/graphics/projectile-volley.svg",
    heavyBounce: "/graphics/projectile-bouncing.svg",
    precisionLaser: "/graphics/projectile-laser.svg",
    sandstormCluster: "/graphics/projectile-cluster.svg",
    scatterShotgun: "/graphics/projectile-shotgun.svg",
    thermalHazard: "/graphics/projectile-trail.svg",
    mortar: "/graphics/projectile-mortar.svg",
    cluster: "/graphics/projectile-cluster.svg",
    needle: "/graphics/projectile-needle.svg",
    phantomNuke: "/graphics/projectile-nuke.svg",
    ghostShotgun: "/graphics/projectile-ghost.svg",
    spectreVolley: "/graphics/projectile-spectre.svg",
    toxicTrail: "/graphics/projectile-toxic.svg",
    precisionDart: "/graphics/projectile-precision.svg",
    pulseRail: "/graphics/projectile-rail.svg",
  },
};

export default class ResourceManager {
  private static instance: ResourceManager | null = null;
  private resources: Resources = {
    images: {
      "heavy-armor": null,
      "desert-striker": null,
      "vanguard-cyber": null,
      specter: null,
      basicShell: null,
      heavyShell: null,
      titanShell: null,
      autocannonStream: null,
      siegeVolley: null,
      heavyBounce: null,
      precisionLaser: null,
      sandstormCluster: null,
      scatterShotgun: null,
      thermalHazard: null,
      mortar: null,
      cluster: null,
      needle: null,
      phantomNuke: null,
      ghostShotgun: null,
      spectreVolley: null,
      toxicTrail: null,
      precisionDart: null,
      pulseRail: null,
    },
  };
  private promiseMap: Map<string, Promise<any>> = new Map();

  private constructor() {}

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  getTankDefinitions(): typeof TANK_DEFINITIONS {
    return TANK_DEFINITIONS;
  }

  async loadResources(): Promise<Resources> {
    if (this.promiseMap.has("loadResources")) {
      return await this.promiseMap.get("loadResources")!;
    }
    try {
      const prom = this.loadImages();
      this.promiseMap.set("loadResources", prom);
      await prom;
      return this.resources;
    } catch (error) {
      return this.resources;
    } finally {
      this.promiseMap.delete("loadResources");
    }
  }

  private async loadImages() {
    const promises: Promise<void>[] = [];

    for (const [key, url] of Object.entries(RESOURCE_URLS.images)) {
      const imageId = key as ImageIds;
      if (this.resources.images[imageId] !== null) {
        continue;
      }

      promises.push(
        this.loadImage(url).then((image) => {
          this.resources.images[imageId] = image;
        }),
      );
    }

    await Promise.allSettled(promises);
  }

  private async loadImage(url: string): Promise<HTMLImageElement | null> {
    let tries = 0;
    const maxRetries = 2;
    const retryDelay = 200;

    while (tries < maxRetries) {
      try {
        return await new Promise((resolve, reject) => {
          const image = new Image();
          image.src = url;
          image.onload = () => resolve(image);
          image.onerror = () => reject(`Failed to load image: ${url}`);
        });
      } catch (error) {
        tries++;
        if (tries < maxRetries) {
          await wait(retryDelay);
        } else {
          return null;
        }
      }
    }
    return null;
  }

  async getImage(name: ImageIds): Promise<HTMLImageElement | null> {
    if (!this.resources.images[name]) {
      let prom = this.promiseMap.get(`image_${name}`);
      if (!prom) {
        prom = this.loadImage(RESOURCE_URLS.images[name]);
        this.promiseMap.set(`image_${name}`, prom);
      }
      await prom;
    }
    return this.resources.images[name];
  }
}
