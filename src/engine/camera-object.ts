import type { Game } from "./game";
import { GameObject } from "./game-object";
import { Vec2, Matrix2D } from "./math";

/**
 * A camera that defines the view transformation for rendering the scene.
 * 
 * The camera inherits from {@link GameObject}, meaning it has position,
 * rotation, and scale in world space. Its view matrix is the inverse of its
 * world transform, optionally combined with zoom, centering, smoothing, and
 * boundary limits.
 */
export class Camera extends GameObject {
    /** Zoom factor applied to the view. Default is `1`. */
    public zoom: number = 1;

    private _viewMatrix: Matrix2D = new Matrix2D();

    private limitEnabled: boolean = false;

    /** The rectangular limit area (world coordinates) the camera is constrained within. */
    public limit: { left: number; up: number; right: number; down: number } = {
        left: 0,
        up: 0,
        right: 0,
        down: 0,
    };

    private cameraPosition: Vec2 = new Vec2(0, 0);
    private smoothSpeed: number = 0.15;
    private useSmooth: boolean = false;

    /** Whether the camera centers the view at the origin of the viewport. */
    center: boolean;

    private limitDiff: Vec2 = new Vec2(0, 0);

    /**
     * Creates a new Camera instance.
     * @param game The game instance this camera belongs to.
     * @param center Whether the camera should center the viewport on the screen origin. Default is `true`.
     */
    constructor(game: Game, center: boolean = true) {
        super(game);
        this.center = center;
    }

    /**
     * Enables or disables camera boundary limits.
     * @param enabled Whether the limit should be enabled.
     */
    public enableLimit(enabled: boolean): void {
        this.limitEnabled = enabled;
    }

    /**
     * Sets the rectangular camera limit area in world coordinates.
     * @param left Left boundary.
     * @param up Top boundary.
     * @param right Right boundary.
     * @param down Bottom boundary.
     */
    public setLimit(left: number, up: number, right: number, down: number): void {
        this.limit = { left, up, right, down };
    }

    /**
     * Enables or disables smooth camera movement.
     * @param enabled Whether smoothing is enabled.
     * @param smoothSpeed The smoothing speed factor (default `5`). Higher is faster.
     */
    public enableSmooth(enabled: boolean, smoothSpeed: number = 5): void {
        this.useSmooth = enabled;
        this.smoothSpeed = smoothSpeed;
    }

    /**
     * Gets the current view matrix of the camera.
     * Applies world transform, zoom, centering, optional smoothing, and limits.
     * @returns The {@link Matrix2D} representing the view transformation.
     */
    public getViewMatrix(): Matrix2D {
        const viewportWidth = this.game.scaler.logicalWidth;
        const viewportHeight = this.game.scaler.logicalHeight;

        this.updateTransform();

        this._viewMatrix.copyFrom(this.worldTransform)
            .translate(this.limitDiff.x, this.limitDiff.y);

        if (this.useSmooth) {
            const local = this.globalToLocalPosition(this.cameraPosition);
            this._viewMatrix.translate(local.x, local.y);
        }

        this._viewMatrix.invert();
        this._viewMatrix.prepend(new Matrix2D(this.zoom, 0, 0, this.zoom, 0, 0));

        if (this.center) {
            this._viewMatrix.prepend(new Matrix2D(1, 0, 0, 1, viewportWidth / 2, viewportHeight / 2));
        }

        return this._viewMatrix;
    }

    /**
     * Converts screen coordinates into world coordinates.
     * @param screenPos A {@link Vec2} in screen space.
     * @returns A {@link Vec2} in world space.
     */
    public screenToWorld(screenPos: Vec2): Vec2 {
        const inverseViewMatrix = this.getViewMatrix().clone().invert();
        return inverseViewMatrix.transformVec2(screenPos);
    }

    /**
     * Converts world coordinates into screen coordinates.
     * @param worldPos A {@link Vec2} in world space.
     * @returns A {@link Vec2} in screen space.
     */
    public worldToScreen(worldPos: Vec2): Vec2 {
        const viewMatrix = this.getViewMatrix();
        return viewMatrix.transformVec2(worldPos);
    }

    /**
     * Updates the camera state each frame.
     * Handles smooth following and limit enforcement.
     * @param _deltaTime The time delta since the last frame (in seconds).
     */
    protected onUpdate(_deltaTime: number): void {
        this.limitDiff.set(0, 0);
        let globalPos = this.globalPosition;

        if (this.useSmooth) {
            this.cameraPosition = this.cameraPosition.add(
                this.globalPosition.clone().subtract(this.cameraPosition).multiplyScalar(this.smoothSpeed * _deltaTime)
            );
            globalPos = this.cameraPosition;
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
