import type { Game } from "./game";
import { Vec2 } from "./math";

export const drawSprite = (ctx: CanvasRenderingContext2D, assets: string, offset?: Vec2, center?: boolean, game?: Game) => {
    // @ts-ignore
    game = (game ?? window.game) as Game

    const image = game.assets.get<ImageBitmap>(assets)!
    if (center) {
        const imageOffset = new Vec2(image.width, image.height).divideScalar(-2)
        if (offset) {
            offset = offset.add(imageOffset)
        } else {
            offset = imageOffset
        }
    }
    ctx.drawImage(image, offset?.x ?? 0, offset?.y ?? 0)
}