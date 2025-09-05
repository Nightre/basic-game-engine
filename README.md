# Basic Canvas Game Engine

A minimal game engine framework based on the native Canvas API. Focused on simple implementation of core features, without complex rendering pipelines and additional dependencies.

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

Run the demo:

```bash
yarn install
yarn dev
```

## Demo Overview

Check [demo.ts](./src/demo.ts) for a complete example showcasing:
- Camera following with smooth movement and boundaries
- Y-axis depth sorting
- Mouse interaction
- Multiple game objects
- Basic sprite rendering