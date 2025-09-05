# Basic Canvas Game Engine

A minimal game engine framework based on the native Canvas API. Focused on simple implementation of core features, without complex rendering pipelines and additional dependencies.

# [Demo](https://raw.githack.com/Nightre/basic-game-engine/master/dist/index.html)

## Features

- **Camera System**
  - Position limits
  - Smooth follow
  - Viewport transformations
- **Scene Graph**
  - Hierarchical transformations
  - Global/Local coordinate systems
  - Z-index ordering (global and child sorting)
- **Input Management**
  - Keyboard and mouse handling
  - Polling and event-based input
- **Asset Management**
  - Asynchronous resource loading
  - Progress tracking
- **Canvas Scaling**
  - Device pixel ratio support
  - Responsive container sizing
- **Basic Game Loop**
  - Time-based updates
  - Flexible rendering pipeline

## Quick Start

1. Install dependencies:
```bash
yarn install
```

2. Run demo:
```bash
yarn dev
```

## Basic Usage

```typescript
// Create game instance
const game = new Game()

// Initialize canvas
game.start({
    canvas: document.getElementById("canvas"),
    width: 600,
    height: 600,
    scale: ScaleMode.EXPAND
})

// Load assets
await game.assets.loadAll([
    { url: "./player.svg", name: "player" }
])

// Create game object
class Player extends GameObject {
    render(ctx: CanvasRenderingContext2D) {
        drawSprite(ctx, "player")
    }
    
    onUpdate(dt: number) {
        // Handle input & movement
        const dir = game.input.getVector("KeyA", "KeyD", "KeyW", "KeyS")
        this.position = this.position.add(dir.multiplyScalar(dt * 100))
    }
}

// Add to scene
const player = new Player(game)
game.stage.addChild(player)
```

See demo.ts for more examples.

## Build

```bash
yarn build
```

## License

MIT