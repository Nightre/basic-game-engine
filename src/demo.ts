import { Camera } from './engine/camera-object'
import { Game, ScaleMode } from './engine/game'
import { GameObject } from './engine/game-object'
import { drawSprite } from './engine/utils'
import './style.css'

class Ysort extends GameObject {
    offset = 0
    protected onUpdate(_deltaTime: number): void {
        this.childIndex = this.globalPosition.y + this.offset
    }
}

class Player extends Ysort {
    speed: number = 100
    offset: number = 32
    constructor(game: Game) {
        super(game)
        const camera = new Camera(game)
        camera.position.set(16, 16)
        camera.setLimit(0, 0, 2000, 2000)
        camera.enableLimit(true)
        camera.enableSmooth(true, 3)

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

class Mouse extends GameObject {
    protected onUpdate(_deltaTime: number): void {
        this.position = this.game.input.getMouseLocal(this.parent!)
    }
    render(ctx: CanvasRenderingContext2D): void {
        drawSprite(ctx, "player")
        // or : ctx.drawImage(asset.get("player")!, 0, 0)
    }
}

class Tree extends Ysort {
    offset: number = 58

    render(ctx: CanvasRenderingContext2D): void {
        drawSprite(ctx, "tree")
        // or : ctx.drawImage(asset.get("player")!, 0, 0)
    }
}

class Tips extends GameObject {
    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = "#000"
        ctx.font = "16px Arial"
        ctx.textBaseline = "top"
        ctx.fillText("WASD to move", 10, 10)
    }
}

const game = new Game()
game.start({
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    width: 600,
    height: 600,
    scale: ScaleMode.EXPAND
})
const asset = game.assets
const input = game.input

await asset.loadAll([
    { url: "./vite.svg", name: "player" },
    { url: "./tree.svg", name: "tree" },
])

const ysortNode = new GameObject(game)
game.stage.addChild(ysortNode)

const player = new Player(game)
ysortNode.addChild(player)
game.stage.addChild(new Mouse(game))

for (let index = 0; index < 1000; index++) {
    const tree = new Tree(game)
    tree.position.set(Math.random() * 2000, Math.random() * 2000)

    ysortNode.addChild(tree)
}

const uiCamera = new Camera(game, false)
const tips = new Tips(game)
tips.setCamera(uiCamera)

game.stage.addChild(tips)