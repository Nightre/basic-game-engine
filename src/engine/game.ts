import { Camera } from "./camera-object";
import { GameObject } from "./game-object";
import { Matrix2D, Vec2 } from "./math";
import { AssetsManager } from "./assets";
import { InputManager } from "./input";

export enum ScaleMode {
    IGNORE,
    EXPAND,
    KEEP,
    KEEP_WIDTH,
    KEEP_HEIGHT
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

        // 根据不同模式计算
        switch (this.mode) {
            case ScaleMode.IGNORE:
                this.logicalWidth = this.baseWidth;
                this.logicalHeight = this.baseHeight;

                this.canvas.style.width = this.baseWidth + "px";
                this.canvas.style.height = this.baseHeight + "px";

                this.viewportWidth = Math.round(this.baseWidth * this.dpr);
                this.viewportHeight = Math.round(this.baseHeight * this.dpr);
                break;

            case ScaleMode.KEEP: // 保持宽高比，会有黑边
                this.logicalWidth = this.baseWidth;
                this.logicalHeight = this.baseHeight;

                const baseRatio = this.baseWidth / this.baseHeight;
                const parentRatio = parentWidth / parentHeight;

                let newCssWidth: number;
                let newCssHeight: number;

                if (parentRatio > baseRatio) {
                    // 容器更宽，以高为准
                    newCssHeight = parentHeight;
                    newCssWidth = parentHeight * baseRatio;
                } else {
                    // 容器更高，以宽为准
                    newCssWidth = parentWidth;
                    newCssHeight = parentWidth / baseRatio;
                }

                this.canvas.style.width = newCssWidth + "px";
                this.canvas.style.height = newCssHeight + "px";

                this.viewportWidth = Math.round(newCssWidth * this.dpr);
                this.viewportHeight = Math.round(newCssHeight * this.dpr);
                break;

            case ScaleMode.KEEP_WIDTH:
                this.logicalWidth = this.baseWidth;
                this.logicalHeight = this.baseWidth / (parentWidth / parentHeight);

                this.canvas.style.width = parentWidth + "px";
                this.canvas.style.height = parentHeight + "px";

                this.viewportWidth = Math.round(parentWidth * this.dpr);
                this.viewportHeight = Math.round(parentHeight * this.dpr);
                break;

            case ScaleMode.KEEP_HEIGHT:
                this.logicalHeight = this.baseHeight;
                this.logicalWidth = this.baseHeight * (parentWidth / parentHeight);

                this.canvas.style.width = parentWidth + "px";
                this.canvas.style.height = parentHeight + "px";

                this.viewportWidth = Math.round(parentWidth * this.dpr);
                this.viewportHeight = Math.round(parentHeight * this.dpr);
                break;

            case ScaleMode.EXPAND: // 你的原始逻辑
            default:
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
                break;
        }

        this.canvas.width = this.viewportWidth;
        this.canvas.height = this.viewportHeight;
    }

    cssToScreen(cssPos: Vec2) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (cssPos.x - rect.left) * this.dpr;
        const y = (cssPos.y - rect.top) * this.dpr;
        return new Vec2(x, y);
    }

    getContext() {
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.imageSmoothingQuality = "low";
        }
        return ctx;
    }
}

interface IGameOptions {
    wdith: number,
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
    input = new InputManager(this)
    scaler!: CanvasScaler;

    constructor() {
        this.stage = new GameObject(this);
        //@ts-ignore
        window.game = this
    }

    start(options: IGameOptions) {
        this.scaler = new CanvasScaler(
            options.canvas,
            options.wdith,
            options.height,
            options.scale
        );
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
            this.ctx.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);

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