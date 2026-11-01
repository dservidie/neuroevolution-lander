import { simulation } from './config.js'
import { pick } from './geom.js'
import { NeuralNetwork } from './nn.js'

export function tournament(ranked, size = 3, rng = Math.random) {
  let best = pick(ranked, rng)
  for (let i = 1; i < size; i++) {
    const candidate = pick(ranked, rng)
    if (candidate.fitness > best.fitness) best = candidate
  }
  return best
}

export function eliteCount(popSize, fraction = simulation.eliteFraction) {
  return Math.max(2, Math.round(popSize * fraction))
}

export function nextBrains(individuals, options = {}) {
  const popSize = options.popSize ?? individuals.length
  const rate = options.mutationRate ?? simulation.mutationRate
  const deviation = options.mutationDeviation ?? simulation.mutationDeviation
  const rng = options.rng ?? Math.random
  const ranked = [...individuals].sort((a, b) => b.fitness - a.fitness)
  const keep = Math.min(eliteCount(popSize, options.eliteFraction), ranked.length)
  const brains = []

  for (let i = 0; i < keep; i++) {
    brains.push(ranked[i].brain.copy())
  }

  while (brains.length < popSize) {
    const parentA = tournament(ranked, 3, rng)
    const parentB = tournament(ranked, 3, rng)
    const child = NeuralNetwork.crossover(parentA.brain, parentB.brain, rng)
    child.mutate(rate, deviation, rng)
    brains.push(child)
  }

  return brains
}

export function seedFromBrain(source, popSize, options = {}) {
  const rate = options.mutationRate ?? simulation.mutationRate
  const deviation = options.mutationDeviation ?? simulation.mutationDeviation
  const rng = options.rng ?? Math.random
  const brains = [source.copy()]
  while (brains.length < popSize) {
    const child = source.copy()
    child.mutate(rate, deviation, rng)
    brains.push(child)
  }
  return brains
}

export function cloneBrainToPopulation(source, popSize) {
  const brains = []
  for (let i = 0; i < popSize; i++) brains.push(source.copy())
  return brains
}
