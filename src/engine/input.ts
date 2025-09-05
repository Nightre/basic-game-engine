import mitt from "mitt";
import type { CanvasScaler, Game } from "./game";
import type { GameObject } from "./game-object";
import { Vec2 } from "./math";

/**
 * Defines the mapping between event names and their payload structures.
 * This provides type safety for the event emitter.
 */
type Events = {
    keydown: { code: string; event: KeyboardEvent };
    keyup: { code: string; event: KeyboardEvent };
    mousemove: { position: Vec2; event: MouseEvent };
    mousedown: { position: Vec2; button: number; event: MouseEvent };
    mouseup: { position: Vec2; button: number; event: MouseEvent };
    click: { position: Vec2; button: number; event: MouseEvent };
    wheel: { event: WheelEvent };
    contextmenu: { position: Vec2; event: MouseEvent };
};


/**
 * Manages user input for keyboard and mouse events.
 * Provides two ways to handle input:
 * 1. Polling: Using methods like `isKeyDown()` or `wasKeyPressed()` in an update loop.
 * 2. Event-driven: Listening to events via the public `emitter` property (e.g., `input.emitter.on('keydown', callback)`).
 */
export class InputManager {
    private game: Game;
    private scaler: CanvasScaler;

    /**
     * The event emitter for input events.
     * Other parts of the game can listen to this for input changes.
     *
     * @example
     * ```ts
     * const input = new InputManager(game);
     * input.emitter.on('keydown', ({ code }) => {
     *   if (code === 'Space') console.log('Jump!');
     * });
     * input.emitter.on('click', ({ position, button }) => {
     *   console.log(`Clicked button ${button} at world position`, position);
     * });
     * ```
     */
    private emitter = mitt<Events>();

    on = this.emitter.on;
    off = this.emitter.off;

    // Mouse position in world coordinates
    mousePosition: Vec2 = new Vec2();

    // Tracks keys pressed in the current frame (e.g., "KeyW", "Space", "ArrowUp").
    private keysDown: Set<string> = new Set();
    // Tracks keys pressed in the previous frame.
    private keysDownLastFrame: Set<string> = new Set();

    // Tracks mouse buttons pressed in the current frame (0: left, 1: middle, 2: right).
    private buttonsDown: Set<number> = new Set();
    // Tracks mouse buttons pressed in the previous frame.
    private buttonsDownLastFrame: Set<number> = new Set();

    // Event handler references for cleanup
    private handleMouseMove!: (event: MouseEvent) => void;
    private handleKeyDown!: (event: KeyboardEvent) => void;
    private handleKeyUp!: (event: KeyboardEvent) => void;
    private handleMouseDown!: (event: MouseEvent) => void;
    private handleMouseUp!: (event: MouseEvent) => void;
    private handleClick!: (event: MouseEvent) => void;
    private handleWheel!: (event: WheelEvent) => void;
    private handleContextMenu!: (event: MouseEvent) => void;

    constructor(game: Game) {
        this.game = game;
        this.scaler = game.scaler;
        this.attachEventListeners();
    }

    /**
     * Attaches all necessary event listeners for keyboard and mouse input.
     * @private
     */
    private attachEventListeners(): void {
        const canvas = this.scaler.canvas;

        // --- Mouse Movement ---
        canvas.addEventListener('mousemove', this.handleMouseMove = (event: MouseEvent) => {
            const cssPos = new Vec2(event.clientX, event.clientY);
            const screenPos = this.scaler.cssToScreen(cssPos);
            const worldPoint = this.game.mainCamera.screenToWorld(screenPos)
            this.mousePosition.set(worldPoint);

            this.emitter.emit('mousemove', { position: this.mousePosition.clone(), event });
        });

        // --- Keyboard ---
        window.addEventListener('keydown', this.handleKeyDown = (event: KeyboardEvent) => {
            // Prevent duplicate events for held keys
            if (!this.keysDown.has(event.code)) {
                this.keysDown.add(event.code);
                this.emitter.emit('keydown', { code: event.code, event });
            }
        });

        window.addEventListener('keyup', this.handleKeyUp = (event: KeyboardEvent) => {
            this.keysDown.delete(event.code);
            this.emitter.emit('keyup', { code: event.code, event });
        });

        // --- Mouse Buttons ---
        canvas.addEventListener('mousedown', this.handleMouseDown = (event: MouseEvent) => {
            this.buttonsDown.add(event.button);
            this.emitter.emit('mousedown', { position: this.mousePosition.clone(), button: event.button, event });
        });

        canvas.addEventListener('mouseup', this.handleMouseUp = (event: MouseEvent) => {
            this.buttonsDown.delete(event.button);
            this.emitter.emit('mouseup', { position: this.mousePosition.clone(), button: event.button, event });
        });

        // --- Additional Convenient Mouse Events ---
        canvas.addEventListener('click', this.handleClick = (event: MouseEvent) => {
            this.emitter.emit('click', { position: this.mousePosition.clone(), button: event.button, event });
        });

        canvas.addEventListener('wheel', this.handleWheel = (event: WheelEvent) => {
            event.preventDefault(); // Prevent page scrolling
            this.emitter.emit('wheel', { event });
        });

        canvas.addEventListener('contextmenu', this.handleContextMenu = (event: MouseEvent) => {
            event.preventDefault(); // Prevent browser's right-click menu
            this.emitter.emit('contextmenu', { position: this.mousePosition.clone(), event });
        });
    }

    /**
     * Updates the state of keys and buttons for the next frame.
     * This should be called once per frame, at the end of the game loop.
     */
    public update(): void {
        this.keysDownLastFrame = new Set(this.keysDown);
        this.buttonsDownLastFrame = new Set(this.buttonsDown);
    }

    /**
     * Checks if a key is currently pressed (continuous detection).
     * @param key - The key code (e.g., "KeyW", "Space").
     * @returns True if the key is pressed, false otherwise.
     */
    isKeyDown(key: string): boolean {
        return this.keysDown.has(key);
    }

    /**
     * Checks if a key is currently released.
     * @param key - The key code (e.g., "KeyW", "Space").
     * @returns True if the key is released, false otherwise.
     */
    isKeyUp(key: string): boolean {
        return !this.keysDown.has(key);
    }

    /**
     * Checks if a key was pressed in the current frame (single trigger).
     * @param key - The key code (e.g., "KeyW", "Space").
     * @returns True if the key was just pressed, false otherwise.
     */
    wasKeyPressed(key: string): boolean {
        return this.keysDown.has(key) && !this.keysDownLastFrame.has(key);
    }

    /**
     * Checks if a key was released in the current frame (single trigger).
     * @param key - The key code (e.g., "KeyW", "Space").
     * @returns True if the key was just released, false otherwise.
     */
    wasKeyReleased(key: string): boolean {
        return !this.keysDown.has(key) && this.keysDownLastFrame.has(key);
    }

    /**
     * Checks if a mouse button is currently pressed (continuous detection).
     * @param button - The mouse button number (0: left, 1: middle, 2: right).
     * @returns True if the button is pressed, false otherwise.
     */
    isButtonDown(button: number): boolean {
        return this.buttonsDown.has(button);
    }

    /**
     * Checks if a mouse button is currently released.
     * @param button - The mouse button number (0: left, 1: middle, 2: right).
     * @returns True if the button is released, false otherwise.
     */
    isButtonUp(button: number): boolean {
        return !this.buttonsDown.has(button);
    }

    /**
     * Checks if a mouse button was pressed in the current frame (single trigger).
     * @param button - The mouse button number (0: left, 1: middle, 2: right).
     * @returns True if the button was just pressed, false otherwise.
     */
    wasButtonPressed(button: number): boolean {
        return this.buttonsDown.has(button) && !this.buttonsDownLastFrame.has(button);
    }

    /**
     * Checks if a mouse button was released in the current frame (single trigger).
     * @param button - The mouse button number (0: left, 1: middle, 2: right).
     * @returns True if the button was just released, false otherwise.
     */
    wasButtonReleased(button: number): boolean {
        return !this.buttonsDown.has(button) && this.buttonsDownLastFrame.has(button);
    }

    /**
     * Converts the world mouse position to local coordinates relative to a game object.
     * @param entity - The game object to convert coordinates for.
     * @returns The mouse position in the game object's local coordinate system.
     */
    getMouseLocal(entity: GameObject): Vec2 {
        return entity.globalToLocalPosition(this.mousePosition);
    }

    /**
     * Gets an axis value (-1, 0, or 1) from two opposing keys.
     * @param negativeAction - The key for the negative direction (e.g., "KeyA").
     * @param positiveAction - The key for the positive direction (e.g., "KeyD").
     * @returns -1, 0, or 1 representing the axis state.
     */
    getAxis(negativeAction: string, positiveAction: string): number {
        let value = 0;
        if (this.isKeyDown(positiveAction)) {
            value += 1;
        }
        if (this.isKeyDown(negativeAction)) {
            value -= 1;
        }
        return value;
    }

    /**
     * Gets a normalized 2D vector from four directional keys (e.g., WASD).
     * @param negativeX - Key for left movement ("KeyA").
     * @param positiveX - Key for right movement ("KeyD").
     * @param negativeY - Key for up movement ("KeyW").
     * @param positiveY - Key for down movement ("KeyS").
     * @returns A normalized Vec2 representing the direction. Returns a zero vector if no keys are pressed.
     */
    getVector(negativeX: string, positiveX: string, negativeY: string, positiveY: string): Vec2 {
        const x = this.getAxis(negativeX, positiveX);
        const y = this.getAxis(negativeY, positiveY);

        const vector = new Vec2(x, y);

        // Normalize to prevent faster diagonal movement.
        return vector.normalize();
    }

    /**
     * Removes all event listeners and cleans up resources.
     */
    public destroy(): void {
        const canvas = this.scaler.canvas;

        // Remove all listeners
        canvas.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        canvas.removeEventListener('mousedown', this.handleMouseDown);
        canvas.removeEventListener('mouseup', this.handleMouseUp);
        canvas.removeEventListener('click', this.handleClick);
        canvas.removeEventListener('wheel', this.handleWheel);
        canvas.removeEventListener('contextmenu', this.handleContextMenu);

        // Clear all active event listeners from the emitter
        this.emitter.all.clear();

        // Clear state sets
        this.keysDown.clear();
        this.keysDownLastFrame.clear();
        this.buttonsDown.clear();
        this.buttonsDownLastFrame.clear();
    }
}