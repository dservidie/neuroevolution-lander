import { beforeAll, describe, expect, it } from 'vitest'
import { eliteCount, nextBrains, seedFromBrain, tournament } from '../src/ga.js'
import { NeuralNetwork, readyNN } from '../src/nn.js'

beforeAll(async () => {
  await readyNN()
})

function pack(fitnessValues) {
  return fitnessValues.map((fitness) => ({
    fitness,
    brain: new NeuralNetwork(3, 3, 2),
  }))
}

describe('genetic algorithm', () => {
  it('keeps population size and elite copies', () => {
    const people = pack([1, 4, 2, 9, 3, 0.5, 1.2, 0.2])
    const next = nextBrains(people, { popSize: 8, mutationRate: 0, eliteFraction: 0.25, rng: () => 0.1 })
    expect(next.length).toBe(8)
    expect(eliteCount(8, 0.25)).toBe(2)
    const best = [...people].sort((a, b) => b.fitness - a.fitness)[0]
    const elite = next[0].predict([0.1, 0.2, 0.3])
    const original = best.brain.predict([0.1, 0.2, 0.3])
    expect(elite[0]).toBeCloseTo(original[0], 5)
    people.forEach((p) => p.brain.dispose())
    next.forEach((b) => b.dispose())
  })

  it('tournament prefers higher fitness', () => {
    const people = [
      { fitness: 1, brain: null },
      { fitness: 8, brain: null },
      { fitness: 3, brain: null },
    ]
    let i = 0
    const seq = [0, 0.4, 0.9]
    const winner = tournament(people, 3, () => seq[i++ % seq.length])
    expect(winner.fitness).toBe(8)
  })

  it('crossover mixes parent weights', () => {
    const a = new NeuralNetwork(3, 3, 2)
    const b = new NeuralNetwork(3, 3, 2)
    const child = NeuralNetwork.crossover(a, b, () => 0.4)
    expect(child.cache.length).toBe(a.cache.length)
    const mixed = child.cache.some((layer, i) =>
      layer.data.some((value, j) => value === b.cache[i].data[j] || value === a.cache[i].data[j]),
    )
    expect(mixed).toBe(true)
    a.dispose()
    b.dispose()
    child.dispose()
  })

  it('mutation changes at least some weights at rate 1', () => {
    const nn = new NeuralNetwork(3, 3, 2)
    const before = Array.from(nn.cache[0].data)
    nn.mutate(1, 1, () => 0.01)
    const changed = nn.cache[0].data.some((value, i) => value !== before[i])
    expect(changed).toBe(true)
    nn.dispose()
  })

  it('can seed a new population from one brain', () => {
    const source = new NeuralNetwork(3, 3, 2)
    const brains = seedFromBrain(source, 5, { mutationRate: 0.2 })
    expect(brains.length).toBe(5)
    const srcOut = source.predict([0.2, 0.1, 0.4])
    const eliteOut = brains[0].predict([0.2, 0.1, 0.4])
    expect(eliteOut[0]).toBeCloseTo(srcOut[0], 5)
    source.dispose()
    brains.forEach((b) => b.dispose())
  })
})
