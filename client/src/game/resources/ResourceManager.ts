export type Resources = {
  images: {
    tank: HTMLImageElement;
  };
};

type LoadedResources = {
  images: Partial<Resources["images"]>;
};

const RESOURCE_URLS = {
  images: {
    tank: tankImageUrl,
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

  async loadResources(): Promise<boolean> {
    try {
      this.resources.images = await this.loadImages();

      return true;
    } catch (error) {
      return false;
    }
  }

  async loadImages(): Promise<Resources["images"]> {
    if (
      Object.keys(this.resources.images).length ===
      Object.keys(RESOURCE_URLS.images).length
    ) {
      return this.resources.images as Resources["images"];
    }

    const loadedImages: Resources["images"] = {} as Resources["images"];
    const promises: Promise<void>[] = [];
    for (const [key, url] of Object.entries(RESOURCE_URLS.images)) {
      if (key in this.resources.images) {
        loadedImages[key as keyof Resources["images"]] =
          this.resources.images[key as keyof Resources["images"]]!;
        continue;
      }

      promises.push(
        this.loadImage(url).then((image) => {
          loadedImages[key as keyof Resources["images"]] = image;
        }),
      );
    }

    await Promise.all(promises);
    return loadedImages;
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = () => reject(`Failed to load image: ${url}`);
    });
  }

  async getImage(name: keyof Resources["images"]): Promise<HTMLImageElement> {
    if (this.resources.images[name] === undefined) {
      this.resources.images[name] = await this.loadImage(
        RESOURCE_URLS.images[name],
      );
    }
    return this.resources.images[name];
  }
}
import tankImageUrl from "../../assets/graphics/tank.png";
