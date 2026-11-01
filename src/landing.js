import { physics as defaultPhysics } from './config.js'
import { landerPoints, terrainHeight, wrapAngle } from './geom.js'
import { hitsObstacle, onPadX } from './world.js'

export function touchingGround(state, world, body = defaultPhysics.body) {
  const pts = landerPoints(state, body)
  const samples = [pts.leftFoot, pts.rightFoot, pts.engine, pts.left, pts.right]
  for (const pt of samples) {
    if (pt.y >= terrainHeight(world, pt.x) - 0.2) return true
    if (hitsObstacle(pt.x, pt.y, world)) return true
  }
  return false
}

export function outOfBounds(state, world) {
  return state.x < -30 || state.x > world.width + 30 || state.y < -50 || state.y > world.height + 20
}

export function padContact(state, world, body = defaultPhysics.body) {
  const pts = landerPoints(state, body)
  const feet = [pts.leftFoot, pts.rightFoot]
  const bothOnPad = feet.every((pt) => onPadX(pt.x, world.pad))
  const nearPadHeight = feet.every((pt) => Math.abs(pt.y - world.pad.y) < 10)
  const groundIsPad = Math.abs(terrainHeight(world, state.x) - world.pad.y) < 1.6
  return bothOnPad && nearPadHeight && groundIsPad
}

export function isSoftUpright(state, phys = defaultPhysics) {
  const angle = Math.abs(wrapAngle(state.angle))
  return (
    angle <= phys.landAngle &&
    state.vy <= phys.landVy &&
    state.vy > -0.45 &&
    Math.abs(state.vx) <= phys.landVx &&
    Math.abs(state.av) <= phys.landAv
  )
}

export function classifyContact(state, world, phys = defaultPhysics) {
  if (hitsObstacle(state.x, state.y, world)) return 'crashed'
  const pts = landerPoints(state, phys.body)
  if ([pts.nose, pts.left, pts.right, pts.engine].some((pt) => hitsObstacle(pt.x, pt.y, world))) {
    return 'crashed'
  }
  if (outOfBounds(state, world)) return 'crashed'
  if (!touchingGround(state, world, phys.body)) return 'flying'
  if (padContact(state, world, phys.body) && isSoftUpright(state, phys)) return 'landed'
  return 'crashed'
}

export function impactSpeed(state) {
  return Math.hypot(state.vx, Math.max(0, state.vy))
}
