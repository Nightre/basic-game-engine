
import { Camera } from "./camera-object";
import { GameObject } from "./game-object";
import { Matrix2D, Vec2 } from "./math";
import { AssetsManager } from "./assets";
import { InputManager } from "./input";

/**
 * Scaling modes for the canvas.
 * - `IGNORE`: Uses the physical pixel size directly, ignoring logical scaling.
 * - `EXPAND`: Expands or shrinks the logical viewport to fit parent while maintaining aspect ratio.
 */
export enum ScaleMode {
    IGNORE,
    EXPAND,
}

/**
 * Manages scaling of the HTMLCanvasElement to fit the parent container
 * while keeping a logical coordinate system for the game.
 *
 * Handles device pixel ratio (DPR), logical size, physical size,
 * and calculates transform scale and offsets.
 */
export class CanvasScaler {
    /** The canvas element being managed */
    canvas: HTMLCanvasElement;

    /** Base width of the game */
    public width: number;
    /** Base height of the game */
    public height: number;

    /** Logical dimensions: the coordinate system used in game logic */
    public logicalWidth: number;
    public logicalHeight: number;

    /** Physical pixel dimensions (including DPR) */
    public physicsWidth: number;
    public physicsHeight: number;

    /** CSS pixel dimensions of the canvas element */
    public canvasWidth: number;
    public canvasHeight: number;

    /** Device pixel ratio */
    public dpr: number = 1;
    /** Scaling mode */
    public mode: ScaleMode;

    /** Scale factor from logical to physical pixels */
    public scale: number = 1;

    /** Offsets in physical pixels for centering */
    public offsetX: number = 0;
    public offsetY: number = 0;

    /**
     * @param canvas HTMLCanvasElement to manage
     * @param baseWidth Logical base width
     * @param baseHeight Logical base height
     * @param mode Scaling mode (default: EXPAND)
     */
    constructor(canvas: HTMLCanvasElement, baseWidth: number, baseHeight: number, mode: ScaleMode = ScaleMode.EXPAND) {
        this.canvas = canvas;
        this.width = baseWidth;
        this.height = baseHeight;
        this.mode = mode;

        this.logicalWidth = baseWidth;
        this.logicalHeight = baseHeight;

        this.physicsWidth = baseWidth;
        this.physicsHeight = baseHeight;

        this.canvasWidth = baseWidth;
        this.canvasHeight = baseHeight;

        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    /** Change the scale mode and trigger resize */
    setMode(mode: ScaleMode) {
        this.mode = mode;
        this.resize();
    }

    /** Resize canvas to match parent container and DPR */
    resize() {
        const parent = this.canvas.parentElement || document.body;
        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight;

        this.dpr = window.devicePixelRatio || 1;

        const baseRatioExp = this.width / this.height;
        const parentRatioExp = parentWidth / parentHeight;

        this.canvas.style.width = parentWidth + "px";
        this.canvas.style.height = parentHeight + "px";

        this.canvasHeight = parentHeight;
        this.canvasWidth = parentWidth;

        this.physicsWidth = Math.round(parentWidth * this.dpr);
        this.physicsHeight = Math.round(parentHeight * this.dpr);

        switch (this.mode) {
            case ScaleMode.EXPAND:
                if (parentRatioExp > baseRatioExp) {
                    this.logicalHeight = this.height;
                    this.logicalWidth = this.height * parentRatioExp;
                } else {
                    this.logicalWidth = this.width;
                    this.logicalHeight = this.width / parentRatioExp;
                }
                break;
            case ScaleMode.IGNORE:
                this.logicalWidth = this.physicsWidth;
                this.logicalHeight = this.physicsHeight;
                break;
            default:
                break;
        }

        this.canvas.width = this.physicsWidth;
        this.canvas.height = this.physicsHeight;

        const scaleX = this.physicsWidth / this.logicalWidth;
        const scaleY = this.physicsHeight / this.logicalHeight;
        this.scale = Math.min(scaleX, scaleY);

        const newWidth = this.width * this.scale;
        const newHeight = this.height * this.scale;

        this.offsetX = (this.physicsWidth - newWidth) / 2;
        this.offsetY = (this.physicsHeight - newHeight) / 2;
    }

    /**
     * Convert CSS pixel coordinates (e.g. from mouse events) to logical screen coordinates.
     */
    cssToScreen(cssPos: Vec2) {
        const rect = this.canvas.getBoundingClientRect();
        const cssX = cssPos.x - rect.left;
        const cssY = cssPos.y - rect.top;

        const physX = cssX * this.dpr;
        const physY = cssY * this.dpr;

        const screenX = physX / this.scale;
        const screenY = physY / this.scale;
        return new Vec2(screenX, screenY);
    }

    /**
     * Get the 2D rendering context with high-quality smoothing enabled.
     */
    getContext() {
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
        }
        return ctx;
    }
}

/** Options for initializing a {@link Game}. */
interface IGameOptions {
    width: number,
    height: number,
    canvas: HTMLCanvasElement,
    scale?: ScaleMode
}

/**
 * Core game engine class.
 * Manages stage (scene graph), main loop, rendering, assets, input, and scaling.
 */
export class Game {

    /** Canvas rendering context */
    private ctx!: CanvasRenderingContext2D | null;
    private lastTime: number = 0;

    /** Root node of the scene graph */
    public stage: GameObject;
    /** Queue of objects to render each frame */
    private renderQueue: GameObject[] = [];

    /** Main camera */
    mainCamera: Camera = new Camera(this);
    /** Whether the game loop is alive */
    alive: boolean = true;

    /** Asset manager */
    assets = new AssetsManager();
    /** Input manager */
    input!: InputManager;
    /** Canvas scaler */
    scaler!: CanvasScaler;

    constructor() {
        this.stage = new GameObject(this);
        //@ts-ignore
        window.game = this;
    }

    /** Set a custom main camera */
    setMainCamera(camera: Camera) {
        this.mainCamera = camera;
    }

    /** Start the game loop with given options */
    start(options: IGameOptions) {
        this.scaler = new CanvasScaler(
            options.canvas,
            options.width,
            options.height,
            options.scale
        );
        this.input = new InputManager(this);

        this.ctx = this.scaler.getContext();
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    /** Main game loop (update, physics, render) */
    loop(currentTime: number) {
        if (!this.ctx || !this.scaler) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.renderQueue = [];

        // 输入更新
        this.input.update();

        // 更新对象
        this.stage.update(deltaTime, this.renderQueue);

        // 物理计算
        this.stage.physics(deltaTime);

        // 渲染
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.renderQueue.sort((a, b) => a.zIndex - b.zIndex);

        for (const obj of this.renderQueue) {
            this.ctx.save();

            const camera = obj.camera;

            let finalTransform: Matrix2D;

            if (camera) {
                // Camera view matrix * world transform
                const viewMatrix = camera.getViewMatrix();
                finalTransform = viewMatrix.clone().append(obj.worldTransform);
            } else {
                finalTransform = obj.worldTransform;
            }

            const m = finalTransform;
            const scale = this.scaler.scale;
            const finalScale = scale;

            this.ctx.setTransform(
                m.a * finalScale,
                m.b * finalScale,
                m.c * finalScale,
                m.d * finalScale,
                m.tx * finalScale,
                m.ty * finalScale
            );

            obj.render(this.ctx);

            this.ctx.restore();
        }

        if (this.alive) {
            requestAnimationFrame((time) => this.loop(time));
        }
    }

    /** Destroy the game and release resources */
    destroy() {
        this.alive = false;
        if (this.stage) {
            this.stage.destroy();
        }
    }

    /** Replace the current stage with a new one */
    changeStage(stage: GameObject) {
        this.stage.destroy();
        this.stage = stage;
    }
}
