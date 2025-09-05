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
    public width: number;
    public height: number;

    // 逻辑尺寸：游戏世界认为的画布大小
    public logicalWidth: number;
    public logicalHeight: number;

    // 视口物理尺寸：画布在屏幕上的实际像素数 (包含DPR)
    public physicsWidth: number;
    public physicsHeight: number;

    public canvasWidth: number;
    public canvasHeight: number;

    public dpr: number = 1;
    public mode: ScaleMode;

    // logical 需要缩放多少达到 physics
    public scale: number = 1


    // 物理大小的 offset
    public offsetX: number = 0;
    public offsetY: number = 0;

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

    setMode(mode: ScaleMode) {
        this.mode = mode;
        this.resize();
    }

    resize() {
        const parent = this.canvas.parentElement || document.body;
        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight;

        this.dpr = window.devicePixelRatio || 1;

        const baseRatioExp = this.width / this.height;
        const parentRatioExp = parentWidth / parentHeight;

        if (parentRatioExp > baseRatioExp) {
            this.logicalHeight = this.height;
            this.logicalWidth = this.height * parentRatioExp;
        } else {
            this.logicalWidth = this.width;
            this.logicalHeight = this.width / parentRatioExp;
        }

        this.canvas.style.width = parentWidth + "px";
        this.canvas.style.height = parentHeight + "px";

        this.canvasHeight = parentHeight
        this.canvasWidth = parentWidth

        this.physicsWidth = Math.round(parentWidth * this.dpr);
        this.physicsHeight = Math.round(parentHeight * this.dpr);

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

    cssToScreen(cssPos: Vec2) {
        const rect = this.canvas.getBoundingClientRect();
        const cssX = cssPos.x - rect.left;
        const cssY = cssPos.y - rect.top;

        const physX = cssX * this.dpr;
        const physY = cssY * this.dpr;

        const localX = physX - this.offsetX;
        const localY = physY - this.offsetY;

        const screenX = localX / this.scale;
        const screenY = localY / this.scale;
        return new Vec2(screenX, screenY);
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
            const scale = this.scaler.scale;

            const offsetX = this.scaler.offsetX;
            const offsetY = this.scaler.offsetY;

            const finalScale = scale;

            this.ctx.setTransform(
                m.a * finalScale,
                m.b * finalScale,
                m.c * finalScale,
                m.d * finalScale,
                m.tx * finalScale + offsetX,
                m.ty * finalScale + offsetY
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