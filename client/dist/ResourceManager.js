const GRAPHICS_URLS = {
    tank: "/assets/graphics/tank.png",
};
export default class ResourceManager {
    static graphics = {};
    constructor() { }
    static async load() {
        return new Promise(async (res, rej) => {
            const resources = { graphics: {} };
            const promises = Object.entries(GRAPHICS_URLS).map(async ([entity, url]) => {
                const image = new Image();
                image.src = url;
                await image.decode();
                resources.graphics[entity] =
                    await createImageBitmap(image);
            });
            await Promise.all(promises);
            res(resources);
        });
    }
}
