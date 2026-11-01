import { physics, simulation as simConfig } from './config.js'
import { computeFitness, liveScore } from './fitness.js'
import { cloneBrainToPopulation, nextBrains, seedFromBrain } from './ga.js'
import { NeuralNetwork } from './nn.js'
import { buildInputs, sense, spawnState, stepLander } from './physics.js'
import { presetWorld } from './scenarios.js'

let nextId = 1

function makeLander(brain, world, rng) {
  return {
    id: nextId++,
    brain,
    state: spawnState(world, rng, physics),
    sensors: { down: 1, left: 1, right: 1 },
    fitness: 0,
    liveScore: 0,
  }
}

export class Simulation {
  constructor(world = presetWorld('training-ground')) {
    this.world = world
    this.generation = 1
    this.frame = 0
    this.paused = false
    this.tabHidden = false
    this.speed = 1
    this.popSize = simConfig.popSize
    this.mutationRate = simConfig.mutationRate
    this.evaluateOnly = false
    this.selectedId = null
    this.mosaicPage = 0
    this.bestEver = { fitness: -Infinity, json: null, generation: 0 }
    this.history = []
    this.stats = {
      bestFitness: 0,
      avgFitness: 0,
      successRate: 0,
      landed: 0,
      crashed: 0,
      flying: 0,
    }
    this.landers = []
    this.status = 'Ready'
    this.rng = Math.random
  }

  get running() {
    return !this.paused && !this.tabHidden
  }

  initPopulation(brains) {
    this.disposeBrains()
    const created =
      brains ?? Array.from({ length: this.popSize }, () => new NeuralNetwork())
    this.landers = created.map((brain) => makeLander(brain, this.world, this.rng))
    this.frame = 0
    this.selectedId = null
    this.mosaicPage = 0
    this.refreshStats()
  }

  disposeBrains() {
    for (const lander of this.landers) {
      lander.brain.dispose()
    }
    this.landers = []
  }

  reset(keepBrains = false) {
    this.generation = 1
    this.history = []
    if (keepBrains && this.landers.length) {
      const brains = this.landers.map((l) => l.brain.copy())
      this.initPopulation(brains)
    } else {
      this.initPopulation()
    }
    this.status = 'Population reset'
  }

  setWorld(world, options = {}) {
    this.world = world
    if (options.keepChampion && this.bestEver.json) {
      const champ = NeuralNetwork.fromJSON(this.bestEver.json)
      const brains = this.evaluateOnly
        ? cloneBrainToPopulation(champ, this.popSize)
        : seedFromBrain(champ, this.popSize, { mutationRate: this.mutationRate })
      champ.dispose()
      this.initPopulation(brains)
    } else if (options.seedJson) {
      this.importBrain(options.seedJson, this.evaluateOnly ? 'evaluate' : 'train')
    } else {
      this.reset()
    }
  }

  select(id) {
    this.selectedId = id
  }

  focused() {
    if (this.selectedId != null) {
      const selected = this.landers.find((l) => l.id === this.selectedId)
      if (selected) return selected
    }
    return this.bestLive()
  }

  bestLive() {
    let best = this.landers[0]
    for (const lander of this.landers) {
      if (!best || lander.liveScore > best.liveScore) best = lander
    }
    return best
  }

  step() {
    if (!this.running) return false
    let flying = 0
    for (const lander of this.landers) {
      if (lander.state.status === 'flying') {
        flying += 1
        const sensors = sense(lander.state, this.world, physics)
        const inputs = buildInputs(lander.state, this.world, sensors, physics)
        const output = lander.brain.predict(inputs)
        lander.sensors = sensors
        lander.state = stepLander(
          lander.state,
          { main: output[0], left: output[1], right: output[2] },
          this.world,
          physics,
        )
        lander.liveScore = liveScore(lander.state, this.world)
      }
    }
    this.frame += 1
    this.refreshStats()
    if (flying === 0 || this.frame >= simConfig.timeoutFrames) {
      this.finishGeneration()
      return true
    }
    return false
  }

  finishGeneration() {
    for (const lander of this.landers) {
      if (lander.state.status === 'flying') {
        lander.state.status = lander.state.fuel <= 0 ? 'out_of_fuel' : 'timeout'
      }
      lander.fitness = computeFitness(lander.state, this.world)
      lander.liveScore = lander.fitness
    }
    const landed = this.landers.filter((l) => l.state.status === 'landed').length
    const ranked = [...this.landers].sort((a, b) => b.fitness - a.fitness)
    const best = ranked[0]
    const avg = ranked.reduce((sum, l) => sum + l.fitness, 0) / ranked.length
    const successRate = landed / this.landers.length
    this.history.push({
      generation: this.generation,
      bestFitness: best.fitness,
      avgFitness: avg,
      successRate,
      landed,
    })
    if (best.fitness > this.bestEver.fitness) {
      this.bestEver = {
        fitness: best.fitness,
        json: best.brain.toJSON(),
        generation: this.generation,
      }
    }
    this.stats.bestFitness = best.fitness
    this.stats.avgFitness = avg
    this.stats.successRate = successRate
    this.stats.landed = landed
    this.stats.crashed = this.landers.filter((l) => l.state.status === 'crashed').length
    this.stats.flying = 0

    if (!this.evaluateOnly) {
      const brains = nextBrains(this.landers, {
        popSize: this.popSize,
        mutationRate: this.mutationRate,
      })
      this.initPopulation(brains)
    } else {
      const brains = this.landers.map((l) => l.brain.copy())
      this.initPopulation(brains)
    }
    this.generation += 1
    this.status = landed
      ? `${landed} lander${landed === 1 ? '' : 's'} touched down`
      : 'Generation complete'
  }

  refreshStats() {
    const landed = this.landers.filter((l) => l.state.status === 'landed').length
    const crashed = this.landers.filter((l) => l.state.status === 'crashed').length
    const flying = this.landers.filter((l) => l.state.status === 'flying').length
    const scores = this.landers.map((l) => l.liveScore)
    this.stats.landed = landed
    this.stats.crashed = crashed
    this.stats.flying = flying
    this.stats.bestFitness = scores.length ? Math.max(...scores) : 0
    this.stats.avgFitness = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    this.stats.successRate = this.landers.length ? landed / this.landers.length : 0
  }

  exportBrain() {
    if (this.bestEver.json) return this.bestEver.json
    const focus = this.focused()
    if (!focus) throw new Error('No brain to export')
    return focus.brain.toJSON()
  }

  importBrain(json, mode = 'train') {
    const brain = NeuralNetwork.fromJSON(json)
    this.evaluateOnly = mode === 'evaluate'
    const brains =
      mode === 'evaluate'
        ? cloneBrainToPopulation(brain, this.popSize)
        : seedFromBrain(brain, this.popSize, { mutationRate: this.mutationRate })
    brain.dispose()
    this.generation = 1
    this.history = []
    this.bestEver = { fitness: -Infinity, json: null, generation: 0 }
    this.initPopulation(brains)
    this.status = mode === 'evaluate' ? 'Evaluating imported brain' : 'Training from imported brain'
  }
}
