import { Camera } from './engine/camera-object'
import { Game, ScaleMode } from './engine/game'
import { GameObject } from './engine/game-object'
import './style.css'


const game = new Game()
game.start({
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    width: 1600,
    height: 800,
    scale: ScaleMode.EXPAND
})
const asset = game.assets
const input = game.input

asset.loadAll([
    { url: "./vite.svg", name: "player" },
    { url: "./tree.svg", name: "tree" },
])
asset.on("complete", () => {
    const ysortNode = new GameObject(game)
    game.stage.addChild(ysortNode)

    const player = new Player(game)
    ysortNode.addChild(player)

    game.stage.addChild(new Debug(game))
    game.stage.addChild(new C(game))

    for (let index = 0; index < 100; index++) {
        const tree = new Tree(game)
        tree.position.set(Math.random() * 500, Math.random() * 500)

        ysortNode.addChild(tree)
    }
})

class Debug extends GameObject {
    constructor(game: Game) {
        super(game)
        const c = new Camera(game, true)
        this.game.stage.addChild(c)
        this.camera = c
    }
    render(_ctx: CanvasRenderingContext2D): void {
        _ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"; // Green, semi-transparent
        _ctx.lineWidth = 4;
        _ctx.strokeRect(
            -this.game.scaler.width / 2, -this.game.scaler.height / 2,
            this.game.scaler.width, this.game.scaler.height)
    }
}

class Ysort extends GameObject {
    offset = 0
    protected onUpdate(_deltaTime: number): void {
        this.childIndex = this.globalPosition.y + this.offset
    }
}

class Player extends Ysort {
    speed: number = 200
    offset: number = 32
    constructor(game: Game) {
        super(game)
        const camera = new Camera(game)
        camera.position.set(16, 16)
        this.addChild(camera)
        game.setMainCamera(camera)
    }
    render(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(asset.get("player")!, 0, 0)
    }
    protected onUpdate(dt: number): void {
        const dir = input.getVector("KeyA", "KeyD", "KeyW", "KeyS").normalize()
        this.position = this.position.add(dir.multiplyScalar(dt * this.speed))
        super.onUpdate(dt)
    }
}

class C extends GameObject {
    protected onUpdate(_deltaTime: number): void {
        this.position = this.game.input.getMouseLocal(this.parent!)
    }
    render(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(asset.get("player")!, 0, 0)
    }
}

class Tree extends Ysort {
    offset: number = 58

    render(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(asset.get("tree")!, 0, 0)
    }
}


