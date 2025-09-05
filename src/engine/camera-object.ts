import type { Game } from "./game";
import { GameObject } from "./game-object";
import { Vec2, Matrix2D } from "./math";

export class Camera extends GameObject {
    public zoom: number = 1;
    private _viewMatrix: Matrix2D = new Matrix2D();

    private limitEnabled: boolean = false;
    public limit: { left: number; up: number; right: number; down: number } = {
        left: 0,
        up: 0,
        right: 0,
        down: 0,
    };

    private cameraPosition: Vec2 = new Vec2(0, 0);
    private smoothSpeed: number = 0.15;
    private useSmooth: boolean = false;

    center: boolean;
    private limitDiff: Vec2 = new Vec2(0, 0);

    constructor(game: Game, center: boolean = true) {
        super(game);
        this.center = center;
    }

    /** 开启或关闭相机限制 */
    public enableLimit(enabled: boolean): void {
        this.limitEnabled = enabled;
    }

    /** 设置相机限制范围 */
    public setLimit(left: number, up: number, right: number, down: number): void {
        this.limit = { left, up, right, down };
    }

    public enableSmooth(enabled: boolean, smoothSpeed: number = 5): void {
        this.useSmooth = enabled;
        this.smoothSpeed = smoothSpeed;
    }

    public getViewMatrix(): Matrix2D {
        const viewportWidth = this.game.scaler.logicalWidth;
        const viewportHeight = this.game.scaler.logicalHeight;

        this.updateTransform();

        this._viewMatrix.copyFrom(this.worldTransform)
            .translate(this.limitDiff.x, this.limitDiff.y)

        if (this.useSmooth) {
            const local = this.globalToLocalPosition(this.cameraPosition)
            this.globalPosition
            this._viewMatrix.translate(local.x, local.y)
        }

        this._viewMatrix.invert();
        this._viewMatrix.prepend(new Matrix2D(this.zoom, 0, 0, this.zoom, 0, 0));

        if (this.center) {
            this._viewMatrix.prepend(new Matrix2D(1, 0, 0, 1, viewportWidth / 2, viewportHeight / 2));
        }

        return this._viewMatrix;
    }

    public screenToWorld(screenPos: Vec2): Vec2 {
        const inverseViewMatrix = this.getViewMatrix().clone().invert();
        return inverseViewMatrix.transformVec2(screenPos);
    }

    public worldToScreen(worldPos: Vec2): Vec2 {
        const viewMatrix = this.getViewMatrix();
        return viewMatrix.transformVec2(worldPos);
    }

    protected onUpdate(_deltaTime: number): void {
        this.limitDiff.set(0, 0);
        let globalPos = this.globalPosition;

        if (this.useSmooth) {
            this.cameraPosition = this.cameraPosition.add(
                this.globalPosition.clone().subtract(this.cameraPosition).multiplyScalar(this.smoothSpeed * _deltaTime)
            )
            globalPos = this.cameraPosition
        }

        if (this.limitEnabled) {
            const viewportWidth = this.game.scaler.logicalWidth;
            const viewportHeight = this.game.scaler.logicalHeight;


            const viewport = new Vec2(viewportWidth, viewportHeight);
            const leftTop = globalPos.subtract(viewport.multiplyScalar(0.5));
            const rightDown = globalPos.add(viewport.multiplyScalar(0.5));

            const leftTopLimit = new Vec2(this.limit.left, this.limit.up);
            const rightDownLimit = new Vec2(this.limit.right, this.limit.down);

            const limitWidth = rightDownLimit.x - leftTopLimit.x;
            const limitHeight = rightDownLimit.y - leftTopLimit.y;

            const viewCenter = new Vec2(
                (leftTop.x + rightDown.x) / 2,
                (leftTop.y + rightDown.y) / 2
            );
            const limitCenter = new Vec2(
                (this.limit.left + this.limit.right) / 2,
                (this.limit.up + this.limit.down) / 2
            );

            if (viewportWidth > limitWidth) {
                this.limitDiff.x += limitCenter.x - viewCenter.x;
            } else {
                if (leftTop.x < leftTopLimit.x) {
                    this.limitDiff.x += leftTopLimit.x - leftTop.x;
                }
                if (rightDown.x > rightDownLimit.x) {
                    this.limitDiff.x += rightDownLimit.x - rightDown.x;
                }
            }

            if (viewportHeight > limitHeight) {
                this.limitDiff.y += limitCenter.y - viewCenter.y;
            } else {
                if (leftTop.y < leftTopLimit.y) {
                    this.limitDiff.y += leftTopLimit.y - leftTop.y;
                }
                if (rightDown.y > rightDownLimit.y) {
                    this.limitDiff.y += rightDownLimit.y - rightDown.y;
                }
            }
        }
    }
}
