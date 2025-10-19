export type View = { scale: number; offsetX: number; offsetY: number };

export function screenToImage(x: number, y: number, v: View) {
  return { x: (x - v.offsetX)/v.scale, y: (y - v.offsetY)/v.scale };
}

export function imageToScreen(x: number, y: number, v: View) {
  return { x: x*v.scale + v.offsetX, y: y*v.scale + v.offsetY };
}
