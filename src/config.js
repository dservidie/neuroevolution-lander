export const WORLD_WIDTH = 720
export const WORLD_HEIGHT = 460

export const INPUT_LABELS = [
  'dx',
  'dy',
  'vx',
  'vy',
  'sin',
  'cos',
  'spin',
  'fuel',
  'alt',
  'altL',
  'altR',
]

export const OUTPUT_LABELS = ['main', 'left', 'right']

export const TOPOLOGY = {
  inputNodes: INPUT_LABELS.length,
  hiddenNodes: 10,
  outputNodes: OUTPUT_LABELS.length,
}

export const physics = {
  gravity: 0.07,
  mainThrust: 0.125,
  attitude: 0.0042,
  angDamp: 0.982,
  linDamp: 0.999,
  fuelMax: 140,
  mainFuel: 0.14,
  attitudeFuel: 0.035,
  vmax: 6,
  avmax: 0.18,
  sensorRange: 220,
  body: {
    width: 14,
    height: 18,
    legSpread: 9,
    legDown: 11,
  },
  landAngle: (15 * Math.PI) / 180,
  landVy: 1.55,
  landVx: 1.05,
  landAv: 0.1,
}

export const simulation = {
  popSize: 36,
  popSizeMin: 8,
  popSizeMax: 80,
  timeoutFrames: 480,
  eliteFraction: 0.1,
  mutationRate: 0.14,
  mutationDeviation: 0.38,
  mosaicPageSize: 24,
}

export const fitnessWeights = {
  distance: 1.6,
  angle: 0.9,
  speed: 0.7,
  fuel: 0.35,
  overPad: 0.55,
  descent: 1.1,
  landed: 10,
  soft: 3.2,
  centered: 2.4,
  crash: 0.25,
}

export const storageKeys = {
  scenes: 'sentient-lander-scenes',
  physics: 'sentient-lander-physics',
}

export function cloneConfig() {
  return {
    physics: { ...physics, body: { ...physics.body } },
    simulation: { ...simulation },
    fitnessWeights: { ...fitnessWeights },
  }
}
