import { describe, expect, it } from 'vitest'
import { physics } from '../src/config.js'
import { createLanderState, stepLander } from '../src/physics.js'
import { flatWorld } from './helpers.js'

const open = () =>
  flatWorld({
    pad: { x: 400, width: 100, y: 490 },
    terrain: [
      { x: 0, y: 490 },
      { x: 800, y: 490 },
    ],
  })

describe('physics', () => {
  it('applies gravity downward when idle', () => {
    const world = open()
    const start = createLanderState({ x: 400, y: 80 })
    const next = stepLander(start, { main: 0, left: 0, right: 0 }, world, physics)
    expect(next.vy).toBeGreaterThan(start.vy)
    expect(next.vy).toBeCloseTo(world.gravity * physics.linDamp, 5)
    expect(next.y).toBeGreaterThan(start.y)
  })

  it('main thruster fights gravity and burns fuel', () => {
    const world = open()
    world.gravity = 0.05
    const start = createLanderState({ x: 400, y: 80 }, { fuel: 100 })
    const idle = stepLander(start, { main: 0, left: 0, right: 0 }, world, physics)
    const thrust = stepLander(start, { main: 1, left: 0, right: 0 }, world, physics)
    expect(thrust.vy).toBeLessThan(idle.vy)
    expect(thrust.fuel).toBeLessThan(start.fuel)
    expect(thrust.main).toBe(1)
  })

  it('left and right attitude thrusters rotate opposite ways', () => {
    const world = open()
    const start = createLanderState({ x: 400, y: 80 })
    const left = stepLander(start, { main: 0, left: 1, right: 0 }, world, physics)
    const right = stepLander(start, { main: 0, left: 0, right: 1 }, world, physics)
    expect(left.av).toBeGreaterThan(0)
    expect(right.av).toBeLessThan(0)
    expect(left.fuel).toBeLessThan(start.fuel)
  })

  it('cannot thrust without fuel', () => {
    const world = open()
    const start = createLanderState({ x: 400, y: 80 }, { fuel: 0 })
    const next = stepLander(start, { main: 1, left: 1, right: 1 }, world, physics)
    expect(next.main).toBe(0)
    expect(next.left).toBe(0)
    expect(next.right).toBe(0)
    expect(next.vy).toBeCloseTo(world.gravity * physics.linDamp, 5)
  })

  it('uses scenario gravity instead of the default', () => {
    const world = open()
    world.gravity = 0.12
    const start = createLanderState({ x: 400, y: 80 })
    const next = stepLander(start, { main: 0, left: 0, right: 0 }, world, physics)
    expect(next.vy).toBeCloseTo(0.12 * physics.linDamp, 5)
  })
})
