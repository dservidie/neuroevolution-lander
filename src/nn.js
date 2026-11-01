import * as tf from '@tensorflow/tfjs'
import { TOPOLOGY } from './config.js'
import { randn } from './geom.js'

let readyPromise

export async function readyNN() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await tf.setBackend('cpu')
      await tf.ready()
      tf.env().set('DEBUG', false)
    })()
  }
  return readyPromise
}

function sigmoid(x) {
  if (x < -20) return 0
  if (x > 20) return 1
  return 1 / (1 + Math.exp(-x))
}

function tensorsFromCache(cache) {
  return cache.map((layer) => tf.tensor(Array.from(layer.data), layer.shape))
}

export class NeuralNetwork {
  constructor(a, b, c, d) {
    if (a && typeof a === 'object' && a.getWeights) {
      this.model = a
      this.inputNodes = b
      this.hiddenNodes = c
      this.outputNodes = d
    } else {
      this.inputNodes = a ?? TOPOLOGY.inputNodes
      this.hiddenNodes = b ?? TOPOLOGY.hiddenNodes
      this.outputNodes = c ?? TOPOLOGY.outputNodes
      this.model = this.createModel()
    }
    this.lastInput = new Array(this.inputNodes).fill(0)
    this.lastHidden = new Array(this.hiddenNodes).fill(0)
    this.lastOutput = new Array(this.outputNodes).fill(0)
    this.refreshCache()
  }

  createModel() {
    const model = tf.sequential()
    model.add(
      tf.layers.dense({
        units: this.hiddenNodes,
        inputShape: [this.inputNodes],
        activation: 'sigmoid',
      }),
    )
    model.add(
      tf.layers.dense({
        units: this.outputNodes,
        activation: 'sigmoid',
      }),
    )
    return model
  }

  refreshCache() {
    const weights = this.model.getWeights()
    this.cache = weights.map((tensor) => ({
      shape: tensor.shape.slice(),
      data: Float32Array.from(tensor.dataSync()),
    }))
  }

  applyCache() {
    const tensors = tensorsFromCache(this.cache)
    this.model.setWeights(tensors)
    tensors.forEach((t) => t.dispose())
  }

  copy() {
    return tf.tidy(() => {
      const modelCopy = this.createModel()
      const weights = this.model.getWeights()
      const copies = weights.map((w) => w.clone())
      modelCopy.setWeights(copies)
      return new NeuralNetwork(modelCopy, this.inputNodes, this.hiddenNodes, this.outputNodes)
    })
  }

  mutate(rate, deviation = 0.28, rng = Math.random) {
    this.cache = this.cache.map((layer) => ({
      shape: layer.shape,
      data: layer.data.map((value) => (rng() < rate ? value + randn(rng) * deviation : value)),
    }))
    this.applyCache()
  }

  predict(inputs) {
    const [w1, b1, w2, b2] = this.cache
    const hidden = new Array(this.hiddenNodes)
    for (let j = 0; j < this.hiddenNodes; j++) {
      let sum = b1.data[j]
      for (let i = 0; i < this.inputNodes; i++) {
        sum += inputs[i] * w1.data[i * this.hiddenNodes + j]
      }
      hidden[j] = sigmoid(sum)
    }
    const output = new Array(this.outputNodes)
    for (let j = 0; j < this.outputNodes; j++) {
      let sum = b2.data[j]
      for (let i = 0; i < this.hiddenNodes; i++) {
        sum += hidden[i] * w2.data[i * this.outputNodes + j]
      }
      output[j] = sigmoid(sum)
    }
    this.lastInput = Array.from(inputs)
    this.lastHidden = hidden
    this.lastOutput = output
    return output
  }

  dispose() {
    if (this.model) this.model.dispose()
    this.model = null
  }

  toJSON() {
    return {
      version: 1,
      kind: 'neuroevolution-lander-brain',
      topology: {
        inputNodes: this.inputNodes,
        hiddenNodes: this.hiddenNodes,
        outputNodes: this.outputNodes,
        hiddenActivation: 'sigmoid',
        outputActivation: 'sigmoid',
      },
      weights: this.cache.map((layer) => ({
        shape: layer.shape,
        data: Array.from(layer.data),
      })),
    }
  }

  static fromJSON(json) {
    if (!json || json.kind !== 'neuroevolution-lander-brain' || !json.topology || !json.weights) {
      throw new Error('Not a neuroevolution lander brain')
    }
    const { inputNodes, hiddenNodes, outputNodes } = json.topology
    const nn = new NeuralNetwork(inputNodes, hiddenNodes, outputNodes)
    nn.cache = json.weights.map((layer) => ({
      shape: layer.shape,
      data: Float32Array.from(layer.data),
    }))
    nn.applyCache()
    return nn
  }

  static crossover(a, b, rng = Math.random) {
    const child = a.copy()
    child.cache = a.cache.map((layer, i) => ({
      shape: layer.shape,
      data: layer.data.map((value, j) => (rng() < 0.5 ? value : b.cache[i].data[j])),
    }))
    child.applyCache()
    return child
  }
}
