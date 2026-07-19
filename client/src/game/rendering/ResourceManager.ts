export type TankProjectileDefinition = {
  id: string;
  name: string;
  label: string;
  color: string;
  type: string;
};

export type TankDefinition = {
  id: string;
  name: string;
  description: string;
  url: string;
  projectiles: TankProjectileDefinition[];
};

export const TANK_DEFINITIONS: TankDefinition[] = [
  {
    id: "heavy-armor",
    name: "Heavy Armor",
    description: "Reinforced steel hull with heavy dual-barreled firepower.",
    url: "/graphics/tank-heavy.svg",
    projectiles: [
      { id: "titanShell", name: "Titan Shell", label: "T", color: "#ef4444", type: "Crater Burst" },
      { id: "heavyShell", name: "Heavy Shell", label: "H", color: "#f87171", type: "Drill Slam" },
      { id: "mortar", name: "Mortar", label: "M", color: "#34d399", type: "High Arc" },
      { id: "basicShell", name: "Basic Shell", label: "S", color: "#f97316", type: "Standard" },
      { id: "cluster", name: "Cluster", label: "C", color: "#fbbf24", type: "Area Spread" },
    ],
  },
  {
    id: "desert-striker",
    name: "Desert Striker",
    description: "High mobility chassis optimized for speed and long-range accuracy.",
    url: "/graphics/tank-striker.svg",
    projectiles: [
      { id: "precisionDart", name: "Precision Dart", label: "P", color: "#f59e0b", type: "Deep Drill" },
      { id: "needle", name: "Needle", label: "N", color: "#60a5fa", type: "Velocity" },
      { id: "cluster", name: "Cluster", label: "C", color: "#fbbf24", type: "Area Spread" },
      { id: "basicShell", name: "Basic Shell", label: "S", color: "#f97316", type: "Standard" },
      { id: "mortar", name: "Mortar", label: "M", color: "#34d399", type: "High Arc" },
    ],
  },
  {
    id: "vanguard-cyber",
    name: "Vanguard Cyber",
    description: "Futuristic navy alloy tank featuring energy rail cannons.",
    url: "/graphics/tank-vanguard.svg",
    projectiles: [
      { id: "pulseRail", name: "Pulse Rail", label: "R", color: "#38bdf8", type: "Plasma Core" },
      { id: "needle", name: "Needle", label: "N", color: "#60a5fa", type: "Velocity" },
      { id: "heavyShell", name: "Heavy Shell", label: "H", color: "#f87171", type: "Drill Slam" },
      { id: "basicShell", name: "Basic Shell", label: "S", color: "#f97316", type: "Standard" },
      { id: "cluster", name: "Cluster", label: "C", color: "#fbbf24", type: "Area Spread" },
    ],
  },
];

export type Resources = {
  images: {
    tank: HTMLImageElement;
    [key: string]: HTMLImageElement;
  };
};

type LoadedResources = {
  images: Record<string, HTMLImageElement>;
};

const RESOURCE_URLS = {
  images: {
    tank: "/graphics/tank.png",
    "heavy-armor": "/graphics/tank-heavy.svg",
    "desert-striker": "/graphics/tank-striker.svg",
    "vanguard-cyber": "/graphics/tank-vanguard.svg",
  },
};

export default class ResourceManager {
  private static instance: ResourceManager | null = null;
  private resources: LoadedResources = { images: {} };

  private constructor() {}

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  getTankDefinitions(): TankDefinition[] {
    return TANK_DEFINITIONS;
  }

  async loadResources(): Promise<boolean> {
    try {
      this.resources.images = await this.loadImages();
      return true;
    } catch (error) {
      return false;
    }
  }

  async loadImages(): Promise<Record<string, HTMLImageElement>> {
    const loadedImages: Record<string, HTMLImageElement> = {};
    const promises: Promise<void>[] = [];

    for (const [key, url] of Object.entries(RESOURCE_URLS.images)) {
      if (key in this.resources.images) {
        loadedImages[key] = this.resources.images[key];
        continue;
      }

      promises.push(
        this.loadImage(url)
          .then((image) => {
            loadedImages[key] = image;
            this.resources.images[key] = image;
          })
          .catch(() => {
            if (typeof Image !== "undefined") {
              const fallback = new Image();
              fallback.src = url;
              loadedImages[key] = fallback;
              this.resources.images[key] = fallback;
            }
          }),
      );
    }

    await Promise.all(promises);
    return this.resources.images;
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (typeof Image === "undefined") {
        reject("Image environment not available");
        return;
      }
      const image = new Image();
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = () => reject(`Failed to load image: ${url}`);
    });
  }

  async getImage(name: string): Promise<HTMLImageElement> {
    if (this.resources.images[name] === undefined) {
      const url = RESOURCE_URLS.images[name as keyof typeof RESOURCE_URLS.images] || "/graphics/tank.png";
      try {
        this.resources.images[name] = await this.loadImage(url);
      } catch (err) {
        if (typeof Image !== "undefined") {
          const fallback = new Image();
          fallback.src = url;
          this.resources.images[name] = fallback;
        }
      }
    }
    return this.resources.images[name];
  }
}
