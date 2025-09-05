import mitt from "mitt";

/**
 * Events emitted by {@link AssetsManager}.
 * - `load`: Fires when a single asset is loaded.
 * - `progress`: Reports overall loading progress (0..1).
 * - `complete`: Fires when all assets are loaded.
 */
type Events = {
    load: { url: string; name?: string; asset: unknown };
    progress: number;
    complete: void;
};

/**
 * Asset manager for loading and caching resources such as images, audio,
 * JSON, XML, and text files.
 *
 * - Supports automatic caching to avoid duplicate loading.
 * - Provides events for progress tracking and completion.
 * - Images (PNG, JPG, SVG) are converted to `HTMLImageElement` or `HTMLCanvasElement`.
 * - Audio files are returned as `HTMLAudioElement`.
 * - JSON files are parsed into objects.
 * - XML files are parsed into `Document`.
 * - Text files are returned as raw strings.
 */
export class AssetsManager {
    /** Cache of loaded resources (url → asset) */
    private cache: Map<string, unknown> = new Map();
    /** Mapping of names to URLs (name → url) */
    private nameMap: Map<string, string> = new Map();
    private emitter = mitt<Events>();

    /** Subscribe to asset loading events */
    on = this.emitter.on;
    /** Unsubscribe from asset loading events */
    off = this.emitter.off;

    /**
     * Load a single image (PNG, JPG, SVG).
     *
     * @param url Resource URL.
     * @param name Optional alias name.
     * @returns A Promise resolving to an HTMLImageElement or HTMLCanvasElement.
     */
    async loadImage(url: string, name?: string): Promise<HTMLImageElement | HTMLCanvasElement> {
        if (this.cache.has(url)) {
            return this.cache.get(url) as HTMLImageElement | HTMLCanvasElement;
        }

        const isSvg = url.endsWith(".svg");
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let final: HTMLImageElement | HTMLCanvasElement = img;

                if (isSvg) {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img, 0, 0);
                    final = canvas;
                }

                this.cache.set(url, final);
                if (name) this.nameMap.set(name, url);
                this.emitter.emit("load", { url, name, asset: final });
                resolve(final);
            };
            img.onerror = (err) => reject(err);
            img.src = url;
        });
    }

    /**
     * Load an audio file.
     *
     * @param url Resource URL.
     * @param name Optional alias name.
     * @returns A Promise resolving to an HTMLAudioElement.
     */
    async loadAudio(url: string, name?: string): Promise<HTMLAudioElement> {
        if (this.cache.has(url)) {
            return this.cache.get(url) as HTMLAudioElement;
        }

        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.cache.set(url, audio);
                if (name) this.nameMap.set(name, url);
                this.emitter.emit("load", { url, name, asset: audio });
                resolve(audio);
            };
            audio.onerror = (err) => reject(err);
            audio.src = url;
            audio.load();
        });
    }

    /**
     * Load and parse a JSON file.
     *
     * @param url Resource URL.
     * @param name Optional alias name.
     * @returns A Promise resolving to the parsed JSON object.
     */
    async loadJSON<T = any>(url: string, name?: string): Promise<T> {
        if (this.cache.has(url)) {
            return this.cache.get(url) as T;
        }
        const response = await fetch(url);
        const data = await response.json();
        this.cache.set(url, data);
        if (name) this.nameMap.set(name, url);
        this.emitter.emit("load", { url, name, asset: data });
        return data;
    }

    /**
     * Load and parse an XML file.
     *
     * @param url Resource URL.
     * @param name Optional alias name.
     * @returns A Promise resolving to an XML Document.
     */
    async loadXML(url: string, name?: string): Promise<Document> {
        if (this.cache.has(url)) {
            return this.cache.get(url) as Document;
        }
        const response = await fetch(url);
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");
        this.cache.set(url, xml);
        if (name) this.nameMap.set(name, url);
        this.emitter.emit("load", { url, name, asset: xml });
        return xml;
    }

    /**
     * Load a plain text file.
     *
     * @param url Resource URL.
     * @param name Optional alias name.
     * @returns A Promise resolving to the text string.
     */
    async loadText(url: string, name?: string): Promise<string> {
        if (this.cache.has(url)) {
            return this.cache.get(url) as string;
        }
        const response = await fetch(url);
        const text = await response.text();
        this.cache.set(url, text);
        if (name) this.nameMap.set(name, url);
        this.emitter.emit("load", { url, name, asset: text });
        return text;
    }

    /**
     * Guess asset type from file extension.
     */
    private guessType(url: string): "image" | "audio" | "json" | "xml" | "text" {
        const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
        if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
        if (ext === "json") return "json";
        if (["xml"].includes(ext)) return "xml";
        if (["txt", "csv", "md", "log"].includes(ext)) return "text";
        return "text";
    }

    /**
     * Load multiple assets at once.
     * If `type` is not provided, it will be guessed from the file extension.
     *
     * @param assets Array of resources to load.
     * @returns A Promise resolving to a map of url → loaded resource.
     */
    async loadAll(
        assets: { url: string; name?: string; type?: "image" | "audio" | "json" | "xml" | "text" }[]
    ): Promise<Map<string, unknown>> {
        let loaded = 0;
        const total = assets.length;

        const results = await Promise.all(
            assets.map(async ({ url, name, type }) => {
                const resolvedType = type ?? this.guessType(url);
                let loader: Promise<unknown>;
                switch (resolvedType) {
                    case "image":
                        loader = this.loadImage(url, name);
                        break;
                    case "audio":
                        loader = this.loadAudio(url, name);
                        break;
                    case "json":
                        loader = this.loadJSON(url, name);
                        break;
                    case "xml":
                        loader = this.loadXML(url, name);
                        break;
                    case "text":
                    default:
                        loader = this.loadText(url, name);
                        break;
                }
                const asset = await loader;
                loaded++;
                this.emitter.emit("progress", loaded / total);
                return asset;
            })
        );

        this.emitter.emit("complete");
        return new Map(assets.map(({ url }, i) => [url, results[i]]));
    }


    /**
     * Get a loaded resource by URL or alias name.
     *
     * @param key Resource URL or alias.
     * @returns The cached resource, or `undefined` if not loaded.
     */
    get<T = unknown>(key: string): T | undefined {
        if (this.cache.has(key)) {
            return this.cache.get(key) as T;
        }
        if (this.nameMap.has(key)) {
            const url = this.nameMap.get(key)!;
            return this.cache.get(url) as T;
        }
        return undefined;
    }

    /** Clear all cached resources and alias mappings. */
    clear() {
        this.cache.clear();
        this.nameMap.clear();
    }
}
