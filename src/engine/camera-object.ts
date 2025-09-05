import type { Game } from "./game";
import { GameObject } from "./game-object";
import { Vec2, Matrix2D } from "./math";

/**
 * A camera that defines the view transformation for rendering the scene.
 * 
 * The camera inherits from {@link GameObject}, meaning it has position,
 * rotation, and scale in world space. Its view matrix is the inverse of its
 * world transform, optionally combined with zoom and viewport centering.
 */
export class Camera extends GameObject {
    /** Zoom factor of the camera. Default is `1` (no zoom). */
    public zoom: number = 1;

    /**
     * Cached view matrix.  
     * The view matrix is the inverse of the camera's world transform,
     * combined with zoom and viewport offset.
     */
    private _viewMatrix: Matrix2D = new Matrix2D();

    /**
     * Whether the camera should center the view on the viewport.
     * If `true`, the camera will offset by `(viewportWidth/2, viewportHeight/2)`.
     */
    center: boolean

    constructor(game: Game, center: boolean = true) {
        super(game)
        this.center = center
    }

    /**
     * Computes and returns the view matrix used for rendering.  
     * The matrix is built by inverting the camera's world transform,
     * applying zoom, and optionally centering based on the viewport size.
     *
     * @returns The current view matrix.
     */
    public getViewMatrix(): Matrix2D {
        const viewportWidth = this.game.scaler.width;
        const viewportHeight = this.game.scaler.height;

        this.updateTransform();

        this._viewMatrix.copyFrom(this.worldTransform).invert();
        this._viewMatrix.prepend(new Matrix2D(this.zoom, 0, 0, this.zoom, 0, 0));

        if (this.center) {
            this._viewMatrix.prepend(new Matrix2D(1, 0, 0, 1, viewportWidth / 2, viewportHeight / 2));
        }

        return this._viewMatrix;
    }

    /**
     * Converts a point from **screen coordinates** to **world coordinates**.
     *
     * @param screenPos - The position in screen space (pixels).
     * @returns The equivalent point in world space.
     */
    public screenToWorld(screenPos: Vec2): Vec2 {
        const inverseViewMatrix = this.getViewMatrix().clone().invert();
        const worldPoint = inverseViewMatrix.transformVec2(screenPos);

        return worldPoint;
    }

    /**
     * Converts a point from **world coordinates** to **screen coordinates**.
     *
     * @param worldPos - The position in world space.
     * @returns The equivalent point in screen space (pixels).
     */
    public worldToScreen(worldPos: Vec2): Vec2 {
        const viewMatrix = this.getViewMatrix();
        const screenPoint = viewMatrix.transformVec2(worldPos);
        return screenPoint;
    }
}
