import { WORLD_HEIGHT, WORLD_WIDTH, storageKeys } from './config.js'
import { createWorld, worldFromJSON } from './world.js'

export const PRESETS = [
  {
    id: 'training-ground',
    name: 'Training Ground',
    padX: WORLD_WIDTH * 0.5,
    padWidth: 160,
    roughness: 0.45,
    seed: 2.2,
    gravity: 0.068,
    spawn: { x: WORLD_WIDTH * 0.5, y: 64, xJitter: 28, angleJitter: 0.08 },
  },
  {
    id: 'offset-pad',
    name: 'Offset Pad',
    padX: WORLD_WIDTH * 0.74,
    padWidth: 110,
    roughness: 0.85,
    seed: 4.1,
    gravity: 0.066,
    spawn: { x: WORLD_WIDTH * 0.28, y: 64, xJitter: 40, angleJitter: 0.16 },
  },
  {
    id: 'boulder-field',
    name: 'Boulder Field',
    padX: WORLD_WIDTH * 0.58,
    padWidth: 100,
    roughness: 1.05,
    seed: 7.6,
    gravity: 0.066,
    obstacles: [
      { x: 180, y: 250, w: 28, h: 70 },
      { x: 330, y: 210, w: 24, h: 90 },
      { x: 470, y: 240, w: 32, h: 60 },
    ],
    spawn: { x: WORLD_WIDTH * 0.22, y: 60, xJitter: 28, angleJitter: 0.14 },
  },
  {
    id: 'low-g',
    name: 'Low Gravity',
    padX: WORLD_WIDTH * 0.42,
    padWidth: 120,
    roughness: 0.7,
    seed: 3.3,
    gravity: 0.042,
    spawn: { x: WORLD_WIDTH * 0.55, y: 58, xJitter: 50, angleJitter: 0.2 },
  },
  {
    id: 'high-g',
    name: 'High Gravity',
    padX: WORLD_WIDTH * 0.5,
    padWidth: 150,
    roughness: 0.4,
    seed: 1.1,
    gravity: 0.09,
    spawn: { x: WORLD_WIDTH * 0.5, y: 56, xJitter: 24, angleJitter: 0.08 },
  },
]

export function presetWorld(id) {
  const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[0]
  return createWorld({ ...preset, name: preset.name })
}

export function randomWorld(rng = Math.random) {
  const padX = 120 + rng() * (WORLD_WIDTH - 240)
  const padWidth = 80 + rng() * 80
  const gravity = 0.034 + rng() * 0.05
  const obstacles = []
  const count = Math.floor(rng() * 4)
  for (let i = 0; i < count; i++) {
    const w = 18 + rng() * 22
    const h = 40 + rng() * 70
    let x = 40 + rng() * (WORLD_WIDTH - 80)
    if (Math.abs(x + w / 2 - padX) < padWidth) x += padWidth + 30
    obstacles.push({
      x: Math.min(WORLD_WIDTH - 50, x),
      y: 180 + rng() * 80,
      w,
      h,
    })
  }
  return createWorld({
    name: 'Random ' + Math.floor(rng() * 1000),
    padX,
    padWidth,
    padY: WORLD_HEIGHT * (0.78 + rng() * 0.06),
    roughness: 0.4 + rng() * 0.9,
    seed: rng() * 10,
    gravity,
    obstacles,
    spawn: {
      x: WORLD_WIDTH * (0.25 + rng() * 0.5),
      y: 54 + rng() * 24,
      xJitter: 20 + rng() * 40,
      angleJitter: 0.08 + rng() * 0.16,
    },
  })
}

export function loadSavedScenes() {
  try {
    const raw = localStorage.getItem(storageKeys.scenes)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSceneRecord(world) {
  const scenes = loadSavedScenes().filter((s) => s.name !== world.name)
  scenes.push(world)
  localStorage.setItem(storageKeys.scenes, JSON.stringify(scenes))
  return scenes
}

export function deleteSavedScene(name) {
  const scenes = loadSavedScenes().filter((s) => s.name !== name)
  localStorage.setItem(storageKeys.scenes, JSON.stringify(scenes))
  return scenes
}

export function sceneFromStorage(name) {
  const rec = loadSavedScenes().find((s) => s.name === name)
  if (!rec) return null
  return worldFromJSON(rec)
}

export function listScenarioOptions() {
  const presets = PRESETS.map((p) => ({ id: p.id, name: p.name, kind: 'preset' }))
  const saved = loadSavedScenes().map((s) => ({ id: 'saved:' + s.name, name: s.name, kind: 'saved' }))
  return [...presets, ...saved]
}

export function loadScenario(id) {
  if (id === 'random') return randomWorld()
  if (id.startsWith('saved:')) {
    return sceneFromStorage(id.slice(6)) ?? presetWorld('training-ground')
  }
  return presetWorld(id)
}
