import { physics as defaultPhysics } from './config.js'
import { clamp, raycastWorld, wrapAngle } from './geom.js'
import { classifyContact, impactSpeed, outOfBounds } from './landing.js'

export function createLanderState(spawn, overrides = {}) {
  return {
    x: spawn.x ?? 0,
    y: spawn.y ?? 80,
    vx: 0,
    vy: 0,
    angle: 0,
    av: 0,
    fuel: defaultPhysics.fuelMax,
    status: 'flying',
    age: 0,
    closestDist: Number.POSITIVE_INFINITY,
    impactSpeed: 0,
    main: 0,
    left: 0,
    right: 0,
    ...overrides,
  }
}

export function spawnState(world, rng = Math.random, phys = defaultPhysics) {
  const jitter = world.spawn.xJitter ?? 40
  return createLanderState({
    x: world.spawn.x + (rng() * 2 - 1) * jitter,
    y: world.spawn.y,
  }, {
    angle: (rng() * 2 - 1) * (world.spawn.angleJitter ?? 0.15),
    vy: 0.18,
    fuel: phys.fuelMax,
  })
}

export function sense(state, world, phys = defaultPhysics) {
  const range = phys.sensorRange
  const down = raycastWorld(world, state.x, state.y, 0, 1, range)
  const left = raycastWorld(world, state.x, state.y, -0.45, 1, range)
  const right = raycastWorld(world, state.x, state.y, 0.45, 1, range)
  return { down, left, right }
}

export function buildInputs(state, world, sensors, phys = defaultPhysics) {
  const pad = world.pad
  return [
    clamp((pad.x - state.x) / (world.width / 2), -1, 1),
    clamp((pad.y - state.y) / world.height, -1, 1),
    clamp(state.vx / phys.vmax, -1, 1),
    clamp(state.vy / phys.vmax, -1, 1),
    Math.sin(state.angle),
    Math.cos(state.angle),
    clamp(state.av / phys.avmax, -1, 1),
    clamp(state.fuel / phys.fuelMax, 0, 1),
    sensors.down,
    sensors.left,
    sensors.right,
  ]
}

export function stepLander(state, action, world, phys = defaultPhysics) {
  if (state.status !== 'flying') return { ...state }

  const next = { ...state }
  let main = clamp(action.main ?? 0, 0, 1)
  let left = clamp(action.left ?? 0, 0, 1)
  let right = clamp(action.right ?? 0, 0, 1)

  const burn = main * phys.mainFuel + (left + right) * phys.attitudeFuel
  if (next.fuel <= 0) {
    main = 0
    left = 0
    right = 0
    next.fuel = 0
  } else {
    next.fuel = Math.max(0, next.fuel - burn)
  }

  const gravity = world.gravity ?? phys.gravity
  const thrust = main * phys.mainThrust
  next.vx += Math.sin(next.angle) * thrust
  next.vy += -Math.cos(next.angle) * thrust + gravity
  next.av += (left - right) * phys.attitude
  next.av *= phys.angDamp
  next.angle = wrapAngle(next.angle + next.av)
  next.vx *= phys.linDamp
  next.vy *= phys.linDamp
  next.x += next.vx
  next.y += next.vy
  next.age += 1
  next.main = main
  next.left = left
  next.right = right

  const dist = Math.hypot(next.x - world.pad.x, next.y - world.pad.y)
  if (dist < next.closestDist) next.closestDist = dist

  if (outOfBounds(next, world)) {
    next.status = 'crashed'
    next.impactSpeed = impactSpeed(next)
    return next
  }

  const contact = classifyContact(next, world, phys)
  if (contact !== 'flying') {
    next.status = contact
    next.impactSpeed = impactSpeed(next)
    if (contact === 'landed') {
      next.vx = 0
      next.vy = 0
      next.av = 0
    }
  }

  return next
}
