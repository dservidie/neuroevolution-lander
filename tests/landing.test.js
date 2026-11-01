import { describe, expect, it } from 'vitest'
import { physics } from '../src/config.js'
import { clamp, wrapAngle } from '../src/geom.js'
import { classifyContact, isSoftUpright, padContact } from '../src/landing.js'
import { createLanderState, stepLander } from '../src/physics.js'
import { flatWorld, hoverState } from './helpers.js'

describe('landing detection', () => {
  it('counts a slow upright pad touch as a landing', () => {
    const world = flatWorld()
    const state = hoverState(world, { vy: 0.4, vx: 0, angle: 0 })
    expect(padContact(state, world, physics.body)).toBe(true)
    expect(isSoftUpright(state, physics)).toBe(true)
    expect(classifyContact(state, world, physics)).toBe('landed')
  })

  it('rejects a hard impact on the pad', () => {
    const world = flatWorld()
    const state = hoverState(world, { vy: 4, vx: 0, angle: 0 })
    expect(classifyContact(state, world, physics)).toBe('crashed')
  })

  it('rejects a tilted pad touch', () => {
    const world = flatWorld()
    const state = hoverState(world, { vy: 0.3, angle: 0.6 })
    expect(classifyContact(state, world, physics)).toBe('crashed')
  })

  it('rejects a slow touch that misses the pad', () => {
    const world = flatWorld()
    const state = hoverState(world, { x: 40, vy: 0.2, angle: 0 })
    expect(padContact(state, world, physics.body)).toBe(false)
    expect(classifyContact(state, world, physics)).toBe('crashed')
  })

  it('crashes into obstacles', () => {
    const world = flatWorld({
      obstacles: [{ x: 390, y: 200, w: 30, h: 80 }],
    })
    const state = hoverState(world, { x: 400, y: 220, vy: 0.2 })
    expect(classifyContact(state, world, physics)).toBe('crashed')
  })

  it('stays flying while still above the surface', () => {
    const world = flatWorld()
    const state = hoverState(world, { y: 80, vy: 0.2 })
    expect(classifyContact(state, world, physics)).toBe('flying')
  })

  it('a simple controller can land on a flat pad', () => {
    const world = flatWorld({ gravity: 0.05 })
    let state = createLanderState({ x: world.pad.x, y: 90 })
    for (let i = 0; i < 500; i++) {
      const dx = world.pad.x - state.x
      const targetAngle = clamp(dx * 0.003 - state.vx * 0.1, -0.35, 0.35)
      const err = wrapAngle(targetAngle - state.angle)
      const left = err > 0 ? clamp(err * 8, 0, 1) : 0
      const right = err < 0 ? clamp(-err * 8, 0, 1) : 0
      const alt = world.pad.y - physics.body.legDown - state.y
      const targetVy = clamp(alt / 90, 0.2, 1.4)
      const main = clamp(0.45 + (state.vy - targetVy) * 1.1, 0, 1)
      state = stepLander(state, { main, left, right }, world, physics)
      if (state.status !== 'flying') break
    }
    expect(state.status).toBe('landed')
  })

  it('crashes after leaving the world', () => {
    const world = flatWorld()
    let state = hoverState(world, { x: 400, y: 80, vx: 8, fuel: 0 })
    for (let i = 0; i < 80; i++) {
      state = stepLander(state, { main: 0, left: 0, right: 0 }, world, physics)
      if (state.status !== 'flying') break
    }
    expect(state.status).toBe('crashed')
  })
})
