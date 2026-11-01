import { beforeAll, describe, expect, it } from 'vitest'
import { NeuralNetwork, readyNN } from '../src/nn.js'

beforeAll(async () => {
  await readyNN()
})

describe('neural network save/load', () => {
  it('keeps topology and predictions after JSON round-trip', () => {
    const nn = new NeuralNetwork(4, 5, 2)
    const inputs = [0.1, -0.2, 0.3, 0.9]
    const first = nn.predict(inputs)
    const json = nn.toJSON()
    expect(json.kind).toBe('sentient-lander-brain')
    expect(json.topology.inputNodes).toBe(4)
    expect(json.topology.hiddenNodes).toBe(5)
    expect(json.topology.outputNodes).toBe(2)
    const clone = NeuralNetwork.fromJSON(json)
    const second = clone.predict(inputs)
    expect(second[0]).toBeCloseTo(first[0], 5)
    expect(second[1]).toBeCloseTo(first[1], 5)
    expect(clone.lastHidden.length).toBe(5)
    nn.dispose()
    clone.dispose()
  })

  it('copy produces an independent network with the same weights', () => {
    const nn = new NeuralNetwork(3, 4, 2)
    const copy = nn.copy()
    const inputs = [0.2, 0.4, 0.6]
    const a = nn.predict(inputs)
    const b = copy.predict(inputs)
    expect(b[0]).toBeCloseTo(a[0], 5)
    copy.mutate(1, 3)
    const c = copy.predict(inputs)
    expect(Math.abs(c[0] - a[0]) + Math.abs(c[1] - a[1])).toBeGreaterThan(0.01)
    nn.dispose()
    copy.dispose()
  })

  it('rejects invalid JSON', () => {
    expect(() => NeuralNetwork.fromJSON({ foo: 1 })).toThrow(/Not a sentient lander brain/)
  })
})
