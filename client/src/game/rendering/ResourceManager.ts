import { wait } from "../../utils/time";

const TANK_PROJECTILE_DEFINITIONS = {
  titanShell: {
    id: "titanShell",
    name: "Titan Shell",
    label: "T",
    color: "#ef4444",
    type: "Crater Burst",
    url: "/graphics/projectile-titan.svg",
  },
  heavyShell: {
    id: "heavyShell",
    name: "Heavy Shell",
    label: "H",
    color: "#f87171",
    type: "Drill Slam",
    url: "/graphics/projectile-heavy.svg",
  },
  mortar: {
    id: "mortar",
    name: "Mortar",
    label: "M",
    color: "#34d399",
    type: "High Arc",
    url: "/graphics/projectile-mortar.svg",
  },
  basicShell: {
    id: "basicShell",
    name: "Basic Shell",
    label: "S",
    color: "#f97316",
    type: "Standard",
    url: "/graphics/projectile-basic.svg",
  },
  cluster: {
    id: "cluster",
    name: "Cluster",
    label: "C",
    color: "#fbbf24",
    type: "Area Spread",
    url: "/graphics/projectile-cluster.svg",
  },
  precisionDart: {
    id: "precisionDart",
    name: "Precision Dart",
    label: "P",
    color: "#f59e0b",
    type: "Deep Drill",
    url: "/graphics/projectile-precision.svg",
  },
  needle: {
    id: "needle",
    name: "Needle",
    label: "N",
    color: "#60a5fa",
    type: "Velocity",
    url: "/graphics/projectile-needle.svg",
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
    projectiles: [
      TANK_PROJECTILE_DEFINITIONS.titanShell,
      TANK_PROJECTILE_DEFINITIONS.heavyShell,
      TANK_PROJECTILE_DEFINITIONS.mortar,
      TANK_PROJECTILE_DEFINITIONS.basicShell,
      TANK_PROJECTILE_DEFINITIONS.cluster,
    ],
  },
  "desert-striker": {
    id: "desert-striker",
    name: "Desert Striker",
    description:
      "High mobility chassis optimized for speed and long-range accuracy.",
    url: "/graphics/tank-striker.svg",
    projectiles: [
      TANK_PROJECTILE_DEFINITIONS.precisionDart,
      TANK_PROJECTILE_DEFINITIONS.needle,
      TANK_PROJECTILE_DEFINITIONS.cluster,
      TANK_PROJECTILE_DEFINITIONS.basicShell,
      TANK_PROJECTILE_DEFINITIONS.mortar,
    ],
  },
  "vanguard-cyber": {
    id: "vanguard-cyber",
    name: "Vanguard Cyber",
    description: "Futuristic navy alloy tank featuring energy rail cannons.",
    url: "/graphics/tank-vanguard.svg",
    projectiles: [
      TANK_PROJECTILE_DEFINITIONS.pulseRail,
      TANK_PROJECTILE_DEFINITIONS.needle,
      TANK_PROJECTILE_DEFINITIONS.cluster,
      TANK_PROJECTILE_DEFINITIONS.basicShell,
      TANK_PROJECTILE_DEFINITIONS.mortar,
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
  projectiles: TankProjectileDefinition[];
};

type ImageIds = TankDefinitionIds | TaankProkectileDefinitionIds;

const RESOURCE_URLS = {
  images: {
    "heavy-armor": "/graphics/tank-heavy.svg",
    "desert-striker": "/graphics/tank-striker.svg",
    "vanguard-cyber": "/graphics/tank-vanguard.svg",

    // Projectile assets
    basicShell: "/graphics/projectile-basic.svg",
    heavyShell: "/graphics/projectile-heavy.svg",
    titanShell: "/graphics/projectile-titan.svg",
    precisionDart: "/graphics/projectile-precision.svg",
    pulseRail: "/graphics/projectile-rail.svg",
    mortar: "/graphics/projectile-mortar.svg",
    cluster: "/graphics/projectile-cluster.svg",
    needle: "/graphics/projectile-needle.svg",
  },
};

export default class ResourceManager {
  private static instance: ResourceManager | null = null;
  private resources: Resources = {
    images: {
      "heavy-armor": null,
      "desert-striker": null,
      "vanguard-cyber": null,
      basicShell: null,
      heavyShell: null,
      titanShell: null,
      precisionDart: null,
      pulseRail: null,
      mortar: null,
      cluster: null,
      needle: null,
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
      if (imageId in this.resources.images) {
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
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

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
    throw new Error(
      `Failed to load image after ${maxRetries} attempts: ${url}`,
    );
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
