const GRAPHICS_URLS = {
  tank: "/assets/graphics/tank.png",
};

export type Resources = {
  graphics: Record<keyof typeof GRAPHICS_URLS, ImageBitmap>;
};

type ResourcesUnderConstruction<T extends keyof Resources = keyof Resources> =
  Record<T, Partial<Resources[T]>>;

export default class ResourceManager {
  static graphics: Record<string, ImageBitmap> = {};

  constructor() {}

  static async load(): Promise<Resources> {
    return new Promise(async (res, rej) => {
      const resources: ResourcesUnderConstruction = { graphics: {} };

      const promises = Object.entries(GRAPHICS_URLS).map(
        async ([entity, url]) => {
          const image = new Image();
          image.src = url;

          await image.decode();

          resources.graphics[entity as keyof typeof GRAPHICS_URLS] =
            await createImageBitmap(image);
        },
      );

      await Promise.all(promises);

      res(resources as Resources);
    });
  }
}
