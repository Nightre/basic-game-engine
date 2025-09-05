import { Camera } from "./camera-object";
import { GameObject } from "./game-object";
import { Matrix2D, Vec2 } from "./math";
import { AssetsManager } from "./assets";
import { InputManager } from "./input";

export enum ScaleMode {
    IGNORE,
    EXPAND,
    KEEP,
}

export class CanvasScaler {
    canvas: HTMLCanvasElement;
    public baseWidth: number;
    public baseHeight: number;

    // 逻辑尺寸：游戏世界认为的画布大小
    public logicalWidth: number;
    public logicalHeight: number;

    // 视口物理尺寸：画布在屏幕上的实际像素数 (包含DPR)
    public viewportWidth: number;
    public viewportHeight: number;

    public dpr: number = 1;
    public mode: ScaleMode;

    public scale: number = 1
    public offsetX: number = 0;
    public offsetY: number = 0;

    constructor(canvas: HTMLCanvasElement, baseWidth: number, baseHeight: number, mode: ScaleMode = ScaleMode.EXPAND) {
        this.canvas = canvas;
        this.baseWidth = baseWidth;
        this.baseHeight = baseHeight;
        this.mode = mode;

        this.logicalWidth = baseWidth;
        this.logicalHeight = baseHeight;

        this.viewportWidth = baseWidth;
        this.viewportHeight = baseHeight;


        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    setMode(mode: ScaleMode) {
        this.mode = mode;
        this.resize();
    }

    resize() {
        const parent = this.canvas.parentElement || document.body;
        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight;

        this.dpr = window.devicePixelRatio || 1;

        const baseRatioExp = this.baseWidth / this.baseHeight;
        const parentRatioExp = parentWidth / parentHeight;

        if (parentRatioExp > baseRatioExp) {
            this.logicalHeight = this.baseHeight;
            this.logicalWidth = this.baseHeight * parentRatioExp;
        } else {
            this.logicalWidth = this.baseWidth;
            this.logicalHeight = this.baseWidth / parentRatioExp;
        }

        this.canvas.style.width = parentWidth + "px";
        this.canvas.style.height = parentHeight + "px";

        this.viewportWidth = Math.round(parentWidth * this.dpr);
        this.viewportHeight = Math.round(parentHeight * this.dpr);

        this.canvas.width = this.viewportWidth;
        this.canvas.height = this.viewportHeight;

        const scaleX = parentWidth / this.baseWidth;
        const scaleY = parentHeight / this.baseHeight;
        this.scale = Math.min(scaleX, scaleY);

        const newWidth = this.baseWidth * this.scale;
        const newHeight = this.baseHeight * this.scale;

        this.offsetX = (parentWidth - newWidth) / 2;
        this.offsetY = (parentHeight - newHeight) / 2;
    }

    cssToScreen(cssPos: Vec2) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (cssPos.x - rect.left - this.offsetX) / this.scale;
        const y = (cssPos.y - rect.top - this.offsetY) / this.scale;
        return new Vec2(x, y);
    }

    getContext() {
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
        }
        return ctx;
    }
}

interface IGameOptions {
    width: number,
    height: number,
    canvas: HTMLCanvasElement,
    scale?: ScaleMode
}

export class Game {

    private ctx!: CanvasRenderingContext2D | null;
    private lastTime: number = 0;

    public stage: GameObject;
    private renderQueue: GameObject[] = [];

    mainCamera: Camera = new Camera(this);
    alive: boolean = true

    assets = new AssetsManager()
    input!: InputManager
    scaler!: CanvasScaler;

    constructor() {
        this.stage = new GameObject(this);
        //@ts-ignore
        window.game = this
    }
    setMainCamera(camera: Camera) {
        this.mainCamera = camera
    }
    start(options: IGameOptions) {
        this.scaler = new CanvasScaler(
            options.canvas,
            options.width,
            options.height,
            options.scale
        );
        this.input = new InputManager(this)

        this.ctx = this.scaler.getContext();
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    loop(currentTime: number) {
        if (!this.ctx || !this.scaler) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.renderQueue = [];

        // 输入更新
        this.input.update()

        // 更新
        this.stage.update(deltaTime, this.renderQueue);

        // 物理
        this.stage.physics(deltaTime);

        // 渲染
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.renderQueue.sort((a, b) => a.zIndex - b.zIndex);

        for (const obj of this.renderQueue) {
            this.ctx.save();

            const camera = obj.getCamera();

            let finalTransform: Matrix2D; // 最终的变换

            if (camera) {
                // 有摄像机就 摄像机Transform dot obj.worldTransform
                const viewMatrix = camera.getViewMatrix();
                finalTransform = viewMatrix.clone().append(obj.worldTransform);
            } else {
                finalTransform = obj.worldTransform;
            }

            const m = finalTransform;
            const dpr = this.scaler.dpr
            const scale = this.scaler.scale;

            const offsetX = this.scaler.offsetX;
            const offsetY = this.scaler.offsetY;

            const finalScale = scale * dpr;

            this.ctx.setTransform(
                m.a * finalScale,
                m.b * finalScale,
                m.c * finalScale,
                m.d * finalScale,
                m.tx * finalScale + offsetX * dpr,
                m.ty * finalScale + offsetY * dpr
            );

            obj.render(this.ctx);

            this.ctx.restore();
        }

        if (this.alive) {
            requestAnimationFrame((time) => this.loop(time));
        }
    }

    destroy() {
        this.alive = false
        if (this.stage) {
            this.stage.destroy()
        }
    }
}