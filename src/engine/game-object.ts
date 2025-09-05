import type { Camera } from "./camera-object";
import type { Game } from "./game";
import { Matrix2D, Vec2 } from "./math";

/**
 * Represents an object in the game world.
 * 
 * GameObjects form a tree hierarchy: each object can have children and a parent.
 * Transformations (position, scale, rotation) are hierarchical, i.e., children inherit their parent's world transform.
 *
 * Provides utilities to convert between local and global coordinates,
 * manage hierarchy, and update transforms.
 */
export class GameObject {
    /** Local position of the object */
    protected _position: Vec2 = new Vec2();

    /** Local scale of the object */
    protected _scale: Vec2 = new Vec2(1, 1);

    /** Local rotation of the object, in radians */
    protected _rotation: number = 0;

    /** Whether the object is visible and should be rendered */
    public visible: boolean = true;

    /** Rendering z-order. Higher values are rendered on top. */
    public zIndex: number = 0;

    /** Index used for ordering children within the same parent */
    public _childIndex: number = 0;
    private childIndexDirty: boolean = false;

    /** Parent GameObject, or null if root */
    public parent: GameObject | null = null;

    /** List of child GameObjects */
    public children: GameObject[] = [];

    /** Local transform matrix */
    public localTransform: Matrix2D = new Matrix2D();

    /** World transform matrix (includes parent transforms) */
    public worldTransform: Matrix2D = new Matrix2D();

    private isDirty: boolean = true;

    /** Camera explicitly assigned to this object (optional) */
    public _camera: Camera | null = null;

    /** Reference to the game instance */
    public game: Game;

    /** Returns the assigned camera, or the game's main camera if not set */
    get camera() {
        return this._camera || this.game.mainCamera;
    }

    /** Returns the child index used for sorting */
    get childIndex() {
        return this._childIndex;
    }

    /**
     * Sets the child index and marks parent for re-sorting if changed.
     */
    set childIndex(v: number) {
        if (this._childIndex != v) {
            this._childIndex = v;
            this.parent?.setChildIndexDirty();
        }
    }

    /**
     * Creates a new GameObject.
     * @param game The game instance. Defaults to `window.game` if not provided.
     */
    constructor(game?: Game) {
        // @ts-ignore
        this.game = game ?? window.game;

        this._position.onChange(this.setDirty.bind(this));
        this._scale.onChange(this.setDirty.bind(this));
    }

    /** Assigns a camera to this object */
    setCamera(camera: Camera | null) {
        this._camera = camera;
    }

    // --- Local Properties ---

    /** Local position of the object */
    get position(): Vec2 {
        return this._position;
    }
    set position(value: Vec2) {
        this._position.set(value);
    }

    /** Local scale of the object */
    get scale(): Vec2 {
        return this._scale;
    }
    set scale(value: Vec2) {
        this._scale.set(value);
    }

    /** Local rotation of the object, in radians */
    get rotation(): number {
        return this._rotation;
    }
    set rotation(value: number) {
        if (this._rotation !== value) {
            this._rotation = value;
            this.setDirty();
        }
    }

    // --- Global Properties ---

    /** World position of the object */
    get globalPosition(): Vec2 {
        this.updateTransform();
        return new Vec2(this.worldTransform.tx, this.worldTransform.ty);
    }

    /** Sets the object's world position */
    set globalPosition(value: Vec2) {
        this.position = this.globalToLocalPosition(value);
    }

    /** World scale of the object */
    get globalScale(): Vec2 {
        this.updateTransform();
        const m = this.worldTransform;
        const scaleX = Math.sqrt(m.a * m.a + m.c * m.c);
        const scaleY = Math.sqrt(m.b * m.b + m.d * m.d);
        return new Vec2(scaleX, scaleY);
    }

    /** Sets the object's world scale */
    set globalScale(value: Vec2) {
        this.scale = this.globalToLocalScale(value);
    }

    /** World rotation of the object, in radians */
    get globalRotation(): number {
        this.updateTransform();
        return Math.atan2(this.worldTransform.c, this.worldTransform.a);
    }

    /** Sets the object's world rotation */
    set globalRotation(value: number) {
        this.rotation = this.globalToLocalRotation(value);
    }

    // --- Coordinate Conversions ---

    /** Converts a local position to world coordinates */
    public localToGlobalPosition(localPos: Vec2): Vec2 {
        this.updateTransform();
        return this.worldTransform.transformVec2(localPos);
    }

    /** Converts a world position to local coordinates */
    public globalToLocalPosition(globalPos: Vec2): Vec2 {
        this.updateTransform();
        const inverseWorld = this.worldTransform.clone().invert();
        return inverseWorld.transformVec2(globalPos);
    }

    /** Converts a local scale to world scale */
    public localToGlobalScale(localScale: Vec2): Vec2 {
        if (!this.parent) return localScale.clone();
        this.parent.updateTransform();
        const parentGlobalScale = this.parent.globalScale;
        return new Vec2(parentGlobalScale.x * localScale.x, parentGlobalScale.y * localScale.y);
    }

    /** Converts a world scale to local scale */
    public globalToLocalScale(globalScale: Vec2): Vec2 {
        if (!this.parent) return globalScale.clone();
        this.parent.updateTransform();
        const parentGlobalScale = this.parent.globalScale;
        const localScaleX = parentGlobalScale.x !== 0 ? globalScale.x / parentGlobalScale.x : 0;
        const localScaleY = parentGlobalScale.y !== 0 ? globalScale.y / parentGlobalScale.y : 0;
        return new Vec2(localScaleX, localScaleY);
    }

    /** Converts a local rotation to world rotation */
    public localToGlobalRotation(localRotation: number): number {
        if (!this.parent) return localRotation;
        this.parent.updateTransform();
        return this.parent.globalRotation + localRotation;
    }

    /** Converts a world rotation to local rotation */
    public globalToLocalRotation(globalRotation: number): number {
        if (!this.parent) return globalRotation;
        this.parent.updateTransform();
        return globalRotation - this.parent.globalRotation;
    }

    // --- Hierarchy Management ---

    /**
     * Adds a child GameObject.
     * @throws Error if adding would create a cycle.
     */
    addChild(child: GameObject) {
        if (child === this || this.isDescendantOf(child)) {
            throw new Error("Cannot add child: would create a cycle");
        }
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        child.setDirty();
        this.setChildIndexDirty();
        return this;
    }

    /** Removes a child GameObject */
    removeChild(child: GameObject) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            child.parent = null;
            this.children.splice(index, 1);
            child.setDirty();
        }
        this.setChildIndexDirty();
        return this;
    }

    // --- Transform & Update ---

    /** Marks this object (and its children) as needing a transform update */
    setDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            for (const child of this.children) {
                child.setDirty();
            }
        }
    }

    /** Marks child ordering as dirty */
    setChildIndexDirty() {
        this.childIndexDirty = true;
    }

    /** Updates local and world transforms */
    updateTransform() {
        if (!this.isDirty) return;
        if (this.parent) this.parent.updateTransform();

        this.localTransform.identity()
            .translate(this._position.x, this._position.y)
            .rotate(this._rotation)
            .scale(this._scale.x, this._scale.y);

        if (this.parent) {
            this.worldTransform.copyFrom(this.parent.worldTransform).append(this.localTransform);
        } else {
            this.worldTransform.copyFrom(this.localTransform);
        }

        this.isDirty = false;
    }

    /** Physics step (override in subclasses) */
    onPhysics(_deltaTime: number) {}

    /** Calls physics update recursively */
    physics(deltaTime: number) {
        this.onPhysics(deltaTime);
        this.updateTransform();
        for (const child of this.children) child.physics(deltaTime);
    }

    /** Update step */
    update(deltaTime: number, renderQueue: GameObject[]) {
        this.onUpdate(deltaTime);
        this.updateTransform();

        if (this.visible) renderQueue.push(this);

        if (this.childIndexDirty) {
            this.children.sort((a, b) => a._childIndex - b._childIndex);
            this.childIndexDirty = false;
        }

        for (const child of this.children) child.update(deltaTime, renderQueue);
    }

    /** Rendering step (override in subclasses) */
    render(_ctx: CanvasRenderingContext2D) {}

    /** Update logic (override in subclasses) */
    protected onUpdate(_deltaTime: number) {}

    /** Checks if this object is a descendant of another */
    isDescendantOf(target: GameObject): boolean {
        let current: GameObject | null = this.parent;
        while (current) {
            if (current === target) return true;
            current = current.parent;
        }
        return false;
    }

    /** Destroys this object and all its children */
    destroy() {
        this.parent?.removeChild(this);
        this.children.forEach(child => child.destroy());
    }
}