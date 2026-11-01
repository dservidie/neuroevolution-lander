import { WORLD_HEIGHT, WORLD_WIDTH, physics } from './config.js'
import { clamp, pointInRect } from './geom.js'

export function padBounds(pad) {
  return {
    left: pad.x - pad.width / 2,
    right: pad.x + pad.width / 2,
    y: pad.y,
  }
}

export function flattenPad(terrain, pad) {
  const { left, right, y } = padBounds(pad)
  const kept = terrain.filter((p) => p.x < left - 1 || p.x > right + 1)
  kept.push({ x: left, y })
  kept.push({ x: right, y })
  kept.sort((a, b) => a.x - b.x)
  if (kept[0].x !== 0) kept.unshift({ x: 0, y: kept[0].y })
  const last = kept[kept.length - 1]
  if (last.x !== WORLD_WIDTH) kept.push({ x: WORLD_WIDTH, y: last.y })
  return kept
}

export function hills(x, seed, roughness) {
  return (
    Math.sin(x * 0.012 + seed) * 26 * roughness +
    Math.sin(x * 0.027 + seed * 1.7) * 14 * roughness +
    Math.sin(x * 0.06 + seed * 0.4) * 7 * roughness
  )
}

export function buildTerrain({
  padX = WORLD_WIDTH * 0.5,
  padWidth = 120,
  padY = WORLD_HEIGHT * 0.82,
  roughness = 1,
  seed = 1.4,
  width = WORLD_WIDTH,
  height = WORLD_HEIGHT,
} = {}) {
  const baseY = padY
  const points = []
  const step = 36
  for (let x = 0; x <= width; x += step) {
    const y = clamp(baseY + hills(x, seed, roughness), height * 0.58, height - 18)
    points.push({ x, y })
  }
  const pad = { x: padX, width: padWidth, y: padY }
  return { terrain: flattenPad(points, pad), pad }
}

export function createWorld(options = {}) {
  const width = options.width ?? WORLD_WIDTH
  const height = options.height ?? WORLD_HEIGHT
  const built = buildTerrain({
    padX: options.padX ?? width * 0.5,
    padWidth: options.padWidth ?? 120,
    padY: options.padY ?? height * 0.82,
    roughness: options.roughness ?? 1,
    seed: options.seed ?? 1.4,
    width,
    height,
  })
  return {
    name: options.name ?? 'custom',
    width,
    height,
    gravity: options.gravity ?? physics.gravity,
    terrain: options.terrain ?? built.terrain,
    pad: options.pad ?? built.pad,
    obstacles: (options.obstacles ?? []).map((o) => ({ ...o })),
    spawn: {
      x: options.spawn?.x ?? (options.pad ?? built.pad).x,
      y: options.spawn?.y ?? 72,
      xJitter: options.spawn?.xJitter ?? 48,
      angleJitter: options.spawn?.angleJitter ?? 0.18,
    },
  }
}

export function worldToJSON(world) {
  return {
    name: world.name,
    width: world.width,
    height: world.height,
    gravity: world.gravity,
    terrain: world.terrain,
    pad: world.pad,
    obstacles: world.obstacles,
    spawn: world.spawn,
  }
}

export function worldFromJSON(json) {
  if (!json || !json.pad || !Array.isArray(json.terrain)) {
    throw new Error('Invalid scene JSON')
  }
  return createWorld(json)
}

export function hitsObstacle(x, y, world) {
  return world.obstacles.some((ob) => pointInRect(x, y, ob))
}

export function onPadX(x, pad) {
  return x >= pad.x - pad.width / 2 && x <= pad.x + pad.width / 2
}
