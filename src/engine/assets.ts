import mitt from "mitt";

type Events = {
    load: { url: string; name?: string; img: HTMLCanvasElement | HTMLImageElement };
    progress: number;
    complete: void;
};

export class AssetsManager {
    private cache: Map<string, HTMLImageElement | HTMLCanvasElement> = new Map(); // url -> image/texture
    private nameMap: Map<string, string> = new Map(); // name -> url
    private emitter = mitt<Events>();

    on = this.emitter.on;
    off = this.emitter.off;

    /**
     * 加载单个资源
     * - 如果是 svg，会转成 canvas 缓存
     */
    async load(url: string, name?: string): Promise<HTMLImageElement | HTMLCanvasElement> {
        if (this.cache.has(url)) {
            return Promise.resolve(this.cache.get(url)!);
        }

        const isSvg = url.endsWith(".svg");
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let final: HTMLImageElement | HTMLCanvasElement = img;

                if (isSvg) {
                    // 转 canvas（纹理）
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img, 0, 0);
                    final = canvas;
                }

                this.cache.set(url, final);
                if (name) this.nameMap.set(name, url);
                this.emitter.emit("load", { url, name, img: final });
                resolve(final);
            };
            img.onerror = (err) => reject(err);
            img.src = url;
        });
    }

    /**
     * 批量加载
     */
    async loadAll(
        assets: { url: string; name?: string }[]
    ): Promise<Map<string, HTMLImageElement | HTMLCanvasElement>> {
        let loaded = 0;
        const total = assets.length;

        const results = await Promise.all(
            assets.map(({ url, name }) =>
                this.load(url, name).then((img) => {
                    loaded++;
                    this.emitter.emit("progress", loaded / total);
                    return img;
                })
            )
        );

        this.emitter.emit("complete");
        return new Map(assets.map(({ url }, i) => [url, results[i]]));
    }

    /**
     * 根据 url 或 name 获取资源
     */
    get(key: string) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        if (this.nameMap.has(key)) {
            const url = this.nameMap.get(key)!;
            return this.cache.get(url);
        }
        return undefined;
    }

    clear() {
        this.cache.clear();
        this.nameMap.clear();
    }
}