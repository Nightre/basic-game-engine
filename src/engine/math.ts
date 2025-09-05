
export class Vec2 {
    protected _x!: number;
    protected _y!: number;
    protected onChangeFn?: () => void;

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    set x(n: number) {
        if (this._x !== n) {
            this._x = n;
            this.onChangeFn?.();
        }
    }

    set y(n: number) {
        if (this._y !== n) {
            this._y = n;
            this.onChangeFn?.();
        }
    }

    constructor(x: Vec2 | number = 0, y?: number) {
        this.set(x, y);
    }

    onChange(fn: () => void) {
        this.onChangeFn = fn;
    }

    set(x: Vec2 | number, y?: number): Vec2 {
        let changed = false;

        if (typeof x == "number") {
            if (y !== undefined) {
                if (this._x !== x || this._y !== y) {
                    changed = true;
                    this._x = x;
                    this._y = y;
                }
            } else {
                if (this._x !== x || this._y !== x) {
                    changed = true;
                    this._x = x;
                    this._y = x;
                }
            }
        } else {
            if (this._x !== x._x || this._y !== x._y) {
                changed = true;
                this._x = x._x;
                this._y = x._y;
            }
        }

        if (changed) this.onChangeFn?.();
        return this;
    }

    /**
     * Create a clone of this vector.
     * @returns A new `Vec2` with the same values.
     */
    clone(): Vec2 {
        return new Vec2(this._x, this._y);
    }

    /**
     * Add another vector to this one.
     * @param other - The vector to add.
     * @returns A new `Vec2` containing the result.
     */
    add(other: Vec2): Vec2 {
        return new Vec2(this._x + other._x, this._y + other._y);
    }

    /**
     * Subtract another vector from this one.
     * @param other - The vector to subtract.
     * @returns A new `Vec2` containing the result.
     */
    subtract(other: Vec2): Vec2 {
        return new Vec2(this._x - other._x, this._y - other._y);
    }

    /**
     * Multiply this vector by a scalar.
     * @param scalar - The scalar value.
     * @returns A new `Vec2` containing the result.
     */
    multiplyScalar(scalar: number): Vec2 {
        return new Vec2(this._x * scalar, this._y * scalar);
    }

    /**
     * Divide this vector by a scalar.
     * @param scalar - The scalar value.
     * @returns A new `Vec2` containing the result. If scalar is 0, returns (0,0).
     */
    divideScalar(scalar: number): Vec2 {
        if (scalar !== 0) {
            return new Vec2(this._x / scalar, this._y / scalar);
        }
        return new Vec2(0, 0);
    }

    /**
     * Get the length (magnitude) of the vector.
     * @returns The length of the vector.
     */
    length(): number {
        return Math.sqrt(this._x * this._x + this._y * this._y);
    }

    /**
     * Get the squared length of the vector.
     * @returns The squared length of the vector.
     */
    lengthSq(): number {
        return this._x * this._x + this._y * this._y;
    }

    /**
     * Normalize this vector (make it have length 1).
     * @returns A new normalized vector. Returns (0,0) if length is 0.
     */
    normalize(): Vec2 {
        const len = this.length();
        return len > 0 ? this.divideScalar(len) : new Vec2(0, 0);
    }

    /**
     * Compute the dot product with another vector.
     * @param other - The other vector.
     * @returns The dot product.
     */
    dot(other: Vec2): number {
        return this._x * other._x + this._y * other._y;
    }

    /**
     * Get the distance to another vector.
     * @param other - The other vector.
     * @returns The distance.
     */
    distanceTo(other: Vec2): number {
        return Math.sqrt(this.distanceToSq(other));
    }

    /**
     * Get the squared distance to another vector.
     * @param other - The other vector.
     * @returns The squared distance.
     */
    distanceToSq(other: Vec2): number {
        const dx = this._x - other._x;
        const dy = this._y - other._y;
        return dx * dx + dy * dy;
    }

    /**
     * Limit the length of this vector.
     * @param max - The maximum length.
     * @returns A new vector with length clamped to `max`.
     */
    limit(max: number): Vec2 {
        const lenSq = this.lengthSq();
        if (lenSq > max * max) {
            return this.normalize().multiplyScalar(max);
        }
        return this.clone();
    }

    /**
     * Get the angle of this vector in radians.
     * @returns The angle in radians.
     */
    angle(): number {
        return Math.atan2(this._y, this._x);
    }

    /**
     * Linearly interpolate between this vector and another.
     * @param other - The target vector.
     * @param t - Interpolation factor (0.0 to 1.0).
     * @returns A new interpolated vector.
     */
    lerp(other: Vec2, t: number): Vec2 {
        return new Vec2(
            this._x + (other._x - this._x) * t,
            this._y + (other._y - this._y) * t
        );
    }

    /**
     * Check if this vector is equal to another.
     * @param other - The vector to compare with.
     * @returns True if both x and y are equal.
     */
    equals(other: Vec2): boolean {
        return this._x === other._x && this._y === other._y;
    }

    // --- Static Methods ---

    /**
     * Add two vectors.
     * @param v1 - The first vector.
     * @param v2 - The second vector.
     * @returns A new `Vec2` containing the result.
     */
    static add(v1: Vec2, v2: Vec2): Vec2 {
        return new Vec2(v1._x + v2._x, v1._y + v2._y);
    }

    /**
     * Subtract one vector from another.
     * @param v1 - The first vector.
     * @param v2 - The vector to subtract.
     * @returns A new `Vec2` containing the result.
     */
    static subtract(v1: Vec2, v2: Vec2): Vec2 {
        return new Vec2(v1._x - v2._x, v1._y - v2._y);
    }

    /**
     * Create a unit vector from an angle in radians.
     * @param angle - The angle in radians.
     * @returns A new unit vector pointing in the given direction.
     */
    static fromAngle(angle: number): Vec2 {
        return new Vec2(Math.cos(angle), Math.sin(angle));
    }
}

export class Matrix2D {
    a: number; b: number;
    c: number; d: number;
    tx: number; ty: number;

    constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
        this.a = a; this.b = b;
        this.c = c; this.d = d;
        this.tx = tx; this.ty = ty;
    }

    identity(): this {
        this.a = 1; this.b = 0;
        this.c = 0; this.d = 1;
        this.tx = 0; this.ty = 0;
        return this;
    }

    // this = this * other
    append(other: Matrix2D): this {
        const a1 = this.a, b1 = this.b, c1 = this.c, d1 = this.d, tx1 = this.tx, ty1 = this.ty;
        const a2 = other.a, b2 = other.b, c2 = other.c, d2 = other.d, tx2 = other.tx, ty2 = other.ty;

        this.a = a1 * a2 + b1 * c2;
        this.b = a1 * b2 + b1 * d2;
        this.c = c1 * a2 + d1 * c2;
        this.d = c1 * b2 + d1 * d2;
        this.tx = a1 * tx2 + b1 * ty2 + tx1;
        this.ty = c1 * tx2 + d1 * ty2 + ty1;
        return this;
    }

    // this = other * this
    prepend(other: Matrix2D): this {
        const a1 = other.a, b1 = other.b, c1 = other.c, d1 = other.d, tx1 = other.tx, ty1 = other.ty;
        const a2 = this.a, b2 = this.b, c2 = this.c, d2 = this.d, tx2 = this.tx, ty2 = this.ty;

        this.a = a1 * a2 + b1 * c2;
        this.b = a1 * b2 + b1 * d2;
        this.c = c1 * a2 + d1 * c2;
        this.d = c1 * b2 + d1 * d2;
        this.tx = a1 * tx2 + b1 * ty2 + tx1;
        this.ty = c1 * tx2 + d1 * ty2 + ty1;
        return this;
    }

    translate(x: number, y: number): this {
        this.tx += this.a * x + this.c * y;
        this.ty += this.b * x + this.d * y;
        return this;
    }

    scale(x: number, y: number): this {
        this.a *= x; this.b *= x;
        this.c *= y; this.d *= y;
        return this;
    }

    rotate(angle: number): this {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const a1 = this.a, b1 = this.b, c1 = this.c, d1 = this.d;

        this.a = a1 * cos - c1 * sin;
        this.b = b1 * cos - d1 * sin;
        this.c = a1 * sin + c1 * cos;
        this.d = b1 * sin + d1 * cos;
        return this;
    }

    clone(): Matrix2D {
        return new Matrix2D(this.a, this.b, this.c, this.d, this.tx, this.ty);
    }

    copyFrom(other: Matrix2D): this {
        this.a = other.a; this.b = other.b;
        this.c = other.c; this.d = other.d;
        this.tx = other.tx; this.ty = other.ty;
        return this;
    }

    invert(): this {
        const a1 = this.a;
        const b1 = this.b;
        const c1 = this.c;
        const d1 = this.d;
        const tx1 = this.tx;
        const ty1 = this.ty;

        const determinant = a1 * d1 - b1 * c1;

        if (determinant === 0) {
            return this.identity();
        }

        const invDet = 1 / determinant;

        this.a = d1 * invDet;
        this.b = -b1 * invDet;
        this.c = -c1 * invDet;
        this.d = a1 * invDet;
        this.tx = (c1 * ty1 - d1 * tx1) * invDet;
        this.ty = (b1 * tx1 - a1 * ty1) * invDet;

        return this;
    }

    transformPoint(x: number, y: number): Vec2 {
        return new Vec2(
            this.a * x + this.c * y + this.tx,
            this.b * x + this.d * y + this.ty
        );
    }

    transformVec2(vec: Vec2): Vec2 {
        const x = vec.x
        const y = vec.y

        return new Vec2(
            this.a * x + this.c * y + this.tx,
            this.b * x + this.d * y + this.ty
        );
    }
}