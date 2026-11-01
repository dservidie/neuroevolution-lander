import p5 from 'p5'
import { WORLD_HEIGHT, WORLD_WIDTH } from './config.js'
import { flattenPad, worldToJSON, worldFromJSON } from './world.js'
import {
  deleteSavedScene,
  loadSavedScenes,
  randomWorld,
  saveSceneRecord,
  presetWorld,
} from './scenarios.js'
import { pointInRect } from './geom.js'

const $ = (id) => document.getElementById(id)

let world = presetWorld('training-ground')
world.name = 'Dojo 1'
let selected = null
let drag = null

function refreshSaved() {
  const select = $('saved-list')
  const scenes = loadSavedScenes()
  select.innerHTML = ''
  if (!scenes.length) {
    const opt = document.createElement('option')
    opt.textContent = '(none saved)'
    opt.value = ''
    select.appendChild(opt)
    return
  }
  for (const scene of scenes) {
    const opt = document.createElement('option')
    opt.value = scene.name
    opt.textContent = scene.name
    select.appendChild(opt)
  }
}

function setStatus(text) {
  $('designer-status').textContent = text
}

function hit(mx, my) {
  for (let i = world.obstacles.length - 1; i >= 0; i--) {
    const ob = world.obstacles[i]
    if (pointInRect(mx, my, ob)) return { kind: 'obstacle', index: i }
  }
  const pad = world.pad
  if (mx >= pad.x - pad.width / 2 && mx <= pad.x + pad.width / 2 && Math.abs(my - pad.y) < 16) {
    return { kind: 'pad' }
  }
  for (let i = 0; i < world.terrain.length; i++) {
    const pt = world.terrain[i]
    if (Math.hypot(pt.x - mx, pt.y - my) < 10) return { kind: 'terrain', index: i }
  }
  return null
}

new p5((p) => {
  p.setup = () => {
    const canvas = p.createCanvas(WORLD_WIDTH, WORLD_HEIGHT)
    canvas.parent('designer-holder')
    canvas.elt.setAttribute('data-testid', 'designer-canvas')
  }

  p.draw = () => {
    p.background(7, 10, 18)
    p.fill(42, 48, 60)
    p.noStroke()
    p.beginShape()
    p.vertex(0, WORLD_HEIGHT)
    for (const pt of world.terrain) p.vertex(pt.x, pt.y)
    p.vertex(WORLD_WIDTH, WORLD_HEIGHT)
    p.endShape(p.CLOSE)

    const pad = world.pad
    p.fill(198, 208, 220)
    p.rect(pad.x - pad.width / 2, pad.y - 4, pad.width, 8)
    p.fill(230, 192, 70)
    p.rect(pad.x - pad.width / 2, pad.y - 6, pad.width, 3)

    p.fill(72, 78, 90)
    world.obstacles.forEach((ob, i) => {
      p.stroke(selected?.kind === 'obstacle' && selected.index === i ? '#6ec6ff' : '#2a3344')
      p.rect(ob.x, ob.y, ob.w, ob.h, 2)
    })

    p.noStroke()
    for (let i = 0; i < world.terrain.length; i++) {
      const pt = world.terrain[i]
      const active = selected?.kind === 'terrain' && selected.index === i
      p.fill(active ? '#6ec6ff' : '#d7e0ea')
      p.circle(pt.x, pt.y, active ? 9 : 6)
    }

    p.fill(215, 224, 234)
    p.textFont('ui-monospace, monospace')
    p.textSize(12)
    p.text(`${world.name}   g ${world.gravity.toFixed(3)}`, 12, 18)
  }

  p.mousePressed = () => {
    if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return
    selected = hit(p.mouseX, p.mouseY)
    drag = selected ? { x: p.mouseX, y: p.mouseY } : null
  }

  p.mouseDragged = () => {
    if (!selected || !drag) return
    const dx = p.mouseX - drag.x
    const dy = p.mouseY - drag.y
    drag = { x: p.mouseX, y: p.mouseY }
    if (selected.kind === 'terrain') {
      const pt = world.terrain[selected.index]
      pt.y = Math.max(180, Math.min(WORLD_HEIGHT - 12, pt.y + dy))
      if (selected.index > 0 && selected.index < world.terrain.length - 1) {
        pt.x = Math.max(8, Math.min(WORLD_WIDTH - 8, pt.x + dx))
      }
      world.terrain.sort((a, b) => a.x - b.x)
      selected.index = world.terrain.indexOf(pt)
    } else if (selected.kind === 'pad') {
      world.pad.x = Math.max(world.pad.width / 2, Math.min(WORLD_WIDTH - world.pad.width / 2, world.pad.x + dx))
      world.pad.y = Math.max(220, Math.min(WORLD_HEIGHT - 20, world.pad.y + dy))
      world.terrain = flattenPad(world.terrain, world.pad)
    } else if (selected.kind === 'obstacle') {
      const ob = world.obstacles[selected.index]
      ob.x += dx
      ob.y += dy
    }
  }

  p.mouseReleased = () => {
    drag = null
  }
})

$('gravity').addEventListener('input', (e) => {
  world.gravity = Number(e.target.value) / 1000
})
$('pad-width').addEventListener('input', (e) => {
  world.pad.width = Number(e.target.value)
  world.terrain = flattenPad(world.terrain, world.pad)
})
$('scene-name').addEventListener('input', (e) => {
  world.name = e.target.value || 'untitled'
})
$('randomize').addEventListener('click', () => {
  const name = $('scene-name').value || 'Random'
  world = randomWorld()
  world.name = name
  $('gravity').value = String(Math.round(world.gravity * 1000))
  $('pad-width').value = String(world.pad.width)
  setStatus('Randomized surface, pad and gravity')
})
$('add-rock').addEventListener('click', () => {
  world.obstacles.push({
    x: WORLD_WIDTH / 2 - 12,
    y: 220,
    w: 24,
    h: 64,
  })
  selected = { kind: 'obstacle', index: world.obstacles.length - 1 }
  setStatus('Obstacle added')
})
$('save').addEventListener('click', () => {
  world.name = $('scene-name').value || world.name
  saveSceneRecord(worldToJSON(world))
  refreshSaved()
  $('saved-list').value = world.name
  setStatus('Saved ' + world.name)
})
$('load').addEventListener('click', () => {
  const name = $('saved-list').value
  const rec = loadSavedScenes().find((s) => s.name === name)
  if (!rec) return
  world = worldFromJSON(rec)
  $('scene-name').value = world.name
  $('gravity').value = String(Math.round(world.gravity * 1000))
  $('pad-width').value = String(world.pad.width)
  setStatus('Loaded ' + world.name)
})
$('delete').addEventListener('click', () => {
  const name = $('saved-list').value
  if (!name) return
  deleteSavedScene(name)
  refreshSaved()
  setStatus('Deleted ' + name)
})
$('download').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(worldToJSON(world), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scene-${world.name.replace(/\s+/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
})
$('import-scene').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    world = worldFromJSON(JSON.parse(await file.text()))
    $('scene-name').value = world.name
    $('gravity').value = String(Math.round(world.gravity * 1000))
    $('pad-width').value = String(world.pad.width)
    setStatus('Imported scene')
  } catch (err) {
    setStatus('Import failed: ' + err.message)
  }
  e.target.value = ''
})

refreshSaved()
$('gravity').value = String(Math.round(world.gravity * 1000))
$('pad-width').value = String(Math.round(world.pad.width))
$('scene-name').value = world.name
