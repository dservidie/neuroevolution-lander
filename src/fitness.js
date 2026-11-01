import { fitnessWeights as weights, physics } from './config.js'
import { clamp, wrapAngle } from './geom.js'
import { onPadX } from './world.js'

function parts(state, world) {
  const pad = world.pad
  const dx = Math.abs(state.x - pad.x)
  const dist = Math.hypot(state.x - pad.x, state.y - pad.y)
  const maxDist = Math.hypot(world.width, world.height)
  const overPad = onPadX(state.x, pad)
  const angleScore = 1 - clamp(Math.abs(wrapAngle(state.angle)) / Math.PI, 0, 1)
  const speed = Math.hypot(state.vx, state.vy)
  const speedScore = 1 - clamp(speed / 8, 0, 1)
  const vyScore = 1 - clamp(Math.max(0, state.vy) / 5, 0, 1)
  const fuelScore = clamp(state.fuel / physics.fuelMax, 0, 1)
  const alt = clamp((pad.y - state.y) / world.height, 0, 1)
  const nearGround = 1 - alt
  const xScore = 1 - clamp(dx / (world.width / 2), 0, 1)
  const closest = 1 - clamp((state.closestDist ?? dist) / maxDist, 0, 1)
  return {
    pad,
    dx,
    dist,
    overPad,
    angleScore,
    speedScore,
    vyScore,
    fuelScore,
    nearGround,
    xScore,
    closest,
  }
}

export function shapingScore(state, world, w = weights) {
  const p = parts(state, world)
  return (
    2.2 * p.xScore +
    1.5 * p.closest +
    w.angle * p.angleScore +
    1.15 * p.vyScore +
    w.speed * p.speedScore +
    w.fuel * p.fuelScore +
    (p.overPad ? 1.6 : 0) +
    (p.overPad ? 3.4 * p.nearGround * p.vyScore * p.angleScore : 0.35 * p.nearGround)
  )
}

export function computeFitness(state, world, w = weights) {
  const p = parts(state, world)
  const shaped = shapingScore(state, world, w)
  if (state.status === 'landed') {
    const soft = 1 - clamp(state.impactSpeed / physics.landVy, 0, 1)
    const centered = 1 - clamp(p.dx / (p.pad.width / 2), 0, 1)
    return 22 + w.soft * soft + w.centered * centered + 3 * p.fuelScore + 2 * p.angleScore
  }
  if (state.status === 'crashed') {
    const impact = 1 - clamp((state.impactSpeed || 0) / 8, 0, 1)
    const padBonus = p.overPad ? 1.3 * p.vyScore * p.angleScore : -0.35
    let score = shaped * 0.85 + padBonus + 0.9 * impact
    if (state.y < 20) score *= 0.25
    return Math.max(0.05, score)
  }
  return shaped * (0.28 + 0.72 * p.nearGround)
}

export function liveScore(state, world, w = weights) {
  if (state.status === 'landed' || state.status === 'crashed') {
    return computeFitness(state, world, w)
  }
  return shapingScore(state, world, w) * (0.45 + 0.55 * parts(state, world).nearGround)
}
