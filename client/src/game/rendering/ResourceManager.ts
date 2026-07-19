export type TankDefinition = {
  id: string;
  name: string;
  description: string;
  url: string;
};

export const TANK_DEFINITIONS: TankDefinition[] = [
  {
    id: "heavy-armor",
    name: "Heavy Armor",
    description: "Reinforced steel hull with heavy dual-barreled firepower.",
    url: "/graphics/tank-heavy.svg",
  },
  {
    id: "desert-striker",
    name: "Desert Striker",
    description: "High mobility chassis optimized for speed and accuracy.",
    url: "/graphics/tank-striker.svg",
  },
  {
    id: "vanguard-cyber",
    name: "Vanguard Cyber",
    description: "Futuristic navy alloy tank featuring energy rail cannons.",
    url: "/graphics/tank-vanguard.svg",
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
            // Stub image fallback for Node environment or failed network requests
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
