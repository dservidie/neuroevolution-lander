import { describe, expect, it } from 'vitest'
import { computeFitness, liveScore } from '../src/fitness.js'
import { flatWorld, hoverState } from './helpers.js'

describe('fitness', () => {
  it('rewards a soft upright centered landing over a crash', () => {
    const world = flatWorld()
    const landed = hoverState(world, { status: 'landed', impactSpeed: 0.3, fuel: 80 })
    const crashed = hoverState(world, { status: 'crashed', impactSpeed: 4, fuel: 80, x: 40 })
    expect(computeFitness(landed, world)).toBeGreaterThan(computeFitness(crashed, world))
  })

  it('prefers a centered landing to one at the pad edge', () => {
    const world = flatWorld()
    const center = hoverState(world, { status: 'landed', impactSpeed: 0.4, fuel: 60 })
    const edge = hoverState(world, {
      status: 'landed',
      impactSpeed: 0.4,
      fuel: 60,
      x: world.pad.x + world.pad.width / 2 - 2,
    })
    expect(computeFitness(center, world)).toBeGreaterThan(computeFitness(edge, world))
  })

  it('prefers saving fuel on otherwise equal landings', () => {
    const world = flatWorld()
    const rich = hoverState(world, { status: 'landed', impactSpeed: 0.4, fuel: 90 })
    const poor = hoverState(world, { status: 'landed', impactSpeed: 0.4, fuel: 10 })
    expect(computeFitness(rich, world)).toBeGreaterThan(computeFitness(poor, world))
  })

  it('gives partial credit for flying over the pad upright', () => {
    const world = flatWorld()
    const over = hoverState(world, { y: 120, vy: 0.4, status: 'flying' })
    const far = hoverState(world, { x: 40, y: 120, vy: 0.4, status: 'flying' })
    expect(liveScore(over, world)).toBeGreaterThan(liveScore(far, world))
  })

  it('scores a softer landing higher than a firmer one', () => {
    const world = flatWorld()
    const soft = hoverState(world, { status: 'landed', impactSpeed: 0.2, fuel: 50 })
    const firm = hoverState(world, { status: 'landed', impactSpeed: 1.2, fuel: 50 })
    expect(computeFitness(soft, world)).toBeGreaterThan(computeFitness(firm, world))
  })
})
