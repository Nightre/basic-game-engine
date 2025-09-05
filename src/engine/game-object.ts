import type { Camera } from "./camera-object";
import type { Game } from "./game";
import { Matrix2D, Vec2 } from "./math";

export class GameObject {
    protected _position: Vec2 = new Vec2();
    protected _scale: Vec2 = new Vec2(1, 1);
    protected _rotation: number = 0;

    public visible: boolean = true;

    public zIndex: number = 0;
    public childIndex: number = 0;

    public parent: GameObject | null = null;
    public children: GameObject[] = [];

    public localTransform: Matrix2D = new Matrix2D();
    public worldTransform: Matrix2D = new Matrix2D();

    protected _isDirty: boolean = true;

    public camera: Camera | null = null;
    public game: Game

    constructor(game?: Game) {
        // @ts-ignore
        this.game = game ?? window.game

        this._position.onChange(this.setDirty.bind(this))
        this._scale.onChange(this.setDirty.bind(this))
    }

    getCamera() {
        return this.camera || this.game.mainCamera
    }

    // --- Local Properties ---
    get position(): Vec2 {
        return this._position;
    }
    set position(value: Vec2) {
        this._position.set(value);
    }

    get scale(): Vec2 {
        return this._scale;
    }
    set scale(value: Vec2) {
        this._scale.set(value);
    }

    get rotation(): number {
        return this._rotation;
    }
    set rotation(value: number) {
        if (this._rotation !== value) {
            this._rotation = value;
            this.setDirty();
        }
    }

    // --- Global Properties (Getters / Setters) ---

    /**
     * Gets the object's position in world coordinates.
     */
    get globalPosition(): Vec2 {
        this.updateTransform();
        return new Vec2(this.worldTransform.tx, this.worldTransform.ty);
    }

    /**
     * Sets the object's position in world coordinates.
     * This calculates the required local position to achieve the desired global position.
     */
    set globalPosition(value: Vec2) {
        this.position = this.globalToLocalPosition(value);
    }

    /**
     * Gets the object's scale in world coordinates.
     * Note: This value is derived from the world transform matrix and may not
     * perfectly match expectations if parent objects have non-uniform scaling or rotation (skew).
     */
    get globalScale(): Vec2 {
        this.updateTransform();
        const m = this.worldTransform;
        const scaleX = Math.sqrt(m.a * m.a + m.c * m.c);
        const scaleY = Math.sqrt(m.b * m.b + m.d * m.d);
        return new Vec2(scaleX, scaleY);
    }

    /**
     * Sets the object's scale in world coordinates.
     * This calculates the required local scale to achieve the desired global scale.
     */
    set globalScale(value: Vec2) {
        this.scale = this.globalToLocalScale(value);
    }

    /**
     * Gets the object's rotation in world coordinates (in radians).
     */
    get globalRotation(): number {
        this.updateTransform();
        return Math.atan2(this.worldTransform.c, this.worldTransform.a);
    }

    /**
     * Sets the object's rotation in world coordinates (in radians).
     * This calculates the required local rotation to achieve the desired global rotation.
     */
    set globalRotation(value: number) {
        this.rotation = this.globalToLocalRotation(value);
    }

    public localToGlobalPosition(localPos: Vec2): Vec2 {
        this.updateTransform();
        return this.worldTransform.transformVec2(localPos);
    }

    public globalToLocalPosition(globalPos: Vec2): Vec2 {
        this.updateTransform();
        const inverseWorld = this.worldTransform.clone().invert();
        return inverseWorld.transformVec2(globalPos);
    }

    public localToGlobalScale(localScale: Vec2): Vec2 {
        if (!this.parent) {
            return localScale.clone();
        }
        this.parent.updateTransform();
        const parentGlobalScale = this.parent.globalScale;
        return new Vec2(parentGlobalScale.x * localScale.x, parentGlobalScale.y * localScale.y);
    }

    public globalToLocalScale(globalScale: Vec2): Vec2 {
        if (!this.parent) {
            return globalScale.clone();
        }
        this.parent.updateTransform();
        const parentGlobalScale = this.parent.globalScale;

        // Avoid division by zero, which would result in Infinity.
        const localScaleX = parentGlobalScale.x !== 0 ? globalScale.x / parentGlobalScale.x : 0;
        const localScaleY = parentGlobalScale.y !== 0 ? globalScale.y / parentGlobalScale.y : 0;

        return new Vec2(localScaleX, localScaleY);
    }

    public localToGlobalRotation(localRotation: number): number {
        if (!this.parent) {
            return localRotation;
        }
        this.parent.updateTransform();
        return this.parent.globalRotation + localRotation;
    }

    public globalToLocalRotation(globalRotation: number): number {
        if (!this.parent) {
            return globalRotation;
        }
        this.parent.updateTransform();
        return globalRotation - this.parent.globalRotation;
    }

    // --- Hierarchy Management ---

    addChild(child: GameObject) {
        if (child === this || this.isDescendantOf(child)) {
            throw new Error("Cannot add child: would create a cycle");
        }

        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        child.setDirty(); // Ensure child transform is recalculated
        return this
    }

    removeChild(child: GameObject) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            child.parent = null;
            this.children.splice(index, 1);
            child.setDirty(); // Ensure child transform is recalculated
        }
        return this
    }

    // --- Transform & Update Logic ---

    setDirty() {
        if (!this._isDirty) {
            this._isDirty = true;
            for (const child of this.children) {
                child.setDirty();
            }
        }
    }

    updateTransform() {
        if (!this._isDirty) return;

        // Ensure parent is up-to-date before calculating our own transform
        if (this.parent) {
            this.parent.updateTransform();
        }

        this.localTransform.identity()
            .translate(this._position.x, this._position.y)
            .rotate(this._rotation)
            .scale(this._scale.x, this._scale.y)

        if (this.parent) {
            this.worldTransform.copyFrom(this.parent.worldTransform).append(this.localTransform);
        } else {
            this.worldTransform.copyFrom(this.localTransform);
        }

        this._isDirty = false;
    }

    onPhysics(_deltaTime: number) { }

    physics(deltaTime: number) {
        this.onPhysics(deltaTime);
        this.updateTransform();

        for (const child of this.children) {
            child.physics(deltaTime);
        }
    }

    update(deltaTime: number, renderQueue: GameObject[]) {
        this.onUpdate(deltaTime);
        this.updateTransform();

        if (this.visible) {
            renderQueue.push(this);
        }

        for (const child of this.children.sort((a, b) => a.childIndex - b.childIndex)) {
            child.update(deltaTime, renderQueue);
        }
    }

    render(_ctx: CanvasRenderingContext2D) { }
    protected onUpdate(_deltaTime: number) { }

    isDescendantOf(target: GameObject): boolean {
        let current: GameObject | null = this.parent;
        while (current) {
            if (current === target) return true;
            current = current.parent;
        }
        return false;
    }

    destroy() {
        this.parent?.removeChild(this)
        this.children.forEach(child => {
            child.destroy()
        })
    }
}