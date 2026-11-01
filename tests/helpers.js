import { createWorld } from '../src/world.js'
import { createLanderState } from '../src/physics.js'
import { physics } from '../src/config.js'

export function flatWorld(overrides = {}) {
  const pad = { x: 400, width: 120, y: 450, ...overrides.pad }
  return createWorld({
    name: 'test',
    width: 800,
    height: 500,
    gravity: 0.05,
    pad,
    terrain: [
      { x: 0, y: 450 },
      { x: pad.x - pad.width / 2, y: pad.y },
      { x: pad.x + pad.width / 2, y: pad.y },
      { x: 800, y: 450 },
    ],
    obstacles: overrides.obstacles ?? [],
    spawn: { x: pad.x, y: 80, xJitter: 0, angleJitter: 0 },
    ...overrides,
  })
}

export function hoverState(world, extra = {}) {
  return createLanderState(
    { x: world.pad.x, y: world.pad.y - physics.body.legDown },
    {
      vx: 0,
      vy: 0.2,
      angle: 0,
      av: 0,
      fuel: physics.fuelMax,
      ...extra,
    },
  )
}
