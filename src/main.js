import { simulation as simConfig } from './config.js'
import { readyNN } from './nn.js'
import { Simulation } from './simulation.js'
import { listScenarioOptions, loadScenario } from './scenarios.js'
import { createSketch } from './render/sketch.js'
import { drawNetwork } from './ui/network-viz.js'
import { drawMosaic, hitTestMosaic, pageSlice } from './ui/mosaic.js'
import { prefersReducedMotion } from './motion.js'

const $ = (id) => document.getElementById(id)

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fillScenarios(select) {
  const options = listScenarioOptions()
  select.innerHTML = ''
  for (const opt of options) {
    const el = document.createElement('option')
    el.value = opt.id
    el.textContent = opt.name
    select.appendChild(el)
  }
  const random = document.createElement('option')
  random.value = 'random'
  random.textContent = 'Randomize'
  select.appendChild(random)
}

function updateStats(sim) {
  $('generation').textContent = String(sim.generation)
  $('best-fitness').textContent = sim.stats.bestFitness.toFixed(2)
  $('success-rate').textContent = `${Math.round(sim.stats.successRate * 100)}%`
  $('outcomes').textContent = `${sim.stats.landed} / ${sim.stats.crashed}`
  $('frame').textContent = String(sim.frame)
  $('best-ever').textContent = sim.bestEver.fitness > -Infinity ? sim.bestEver.fitness.toFixed(2) : '—'
  $('status').textContent = sim.status
  $('speed-label').textContent = `${sim.speed}x`
  $('pause').textContent = sim.paused ? 'Resume' : 'Pause'
  const slice = pageSlice(sim.landers, sim.mosaicPage)
  $('page-label').textContent = `${slice.page + 1} / ${slice.pages}`
  const focus = sim.focused()
  $('focus-label').textContent = sim.selectedId ? `lander #${sim.selectedId}` : 'best'
  document.body.dataset.generation = String(sim.generation)
  document.body.dataset.frame = String(sim.frame)
  document.body.dataset.focus = focus ? String(focus.id) : ''
}

function resizeOverlayCanvases() {
  const network = $('network-canvas')
  const mosaic = $('mosaic-canvas')
  const netWrap = $('network-wrap')
  const mosWrap = $('mosaic-wrap')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const netW = Math.max(280, netWrap.clientWidth)
  const netH = Math.round(netW * 1.05)
  network.width = Math.round(netW * dpr)
  network.height = Math.round(netH * dpr)
  network.style.width = netW + 'px'
  network.style.height = netH + 'px'
  const mosW = Math.max(320, mosWrap.clientWidth)
  const mosH = window.matchMedia('(max-width: 900px)').matches ? 360 : 280
  mosaic.width = Math.round(mosW * dpr)
  mosaic.height = Math.round(mosH * dpr)
  mosaic.style.width = mosW + 'px'
  mosaic.style.height = mosH + 'px'
}

async function boot() {
  await readyNN()
  const sim = new Simulation()
  sim.initPopulation()
  fillScenarios($('scenario'))
  resizeOverlayCanvases()

  const networkCtx = $('network-canvas').getContext('2d')
  const mosaicCtx = $('mosaic-canvas').getContext('2d')
  let lastViz = 0

  const redrawViz = (force = false) => {
    const throttle = prefersReducedMotion() || sim.speed > 8 ? 3 : 1
    if (!force && sim.frame - lastViz < throttle && sim.running) return
    lastViz = sim.frame
    drawNetwork(networkCtx, sim.focused(), { frame: sim.frame })
    drawMosaic(mosaicCtx, sim)
  }

  createSketch(sim, 'sim-holder', () => {
    updateStats(sim)
    redrawViz()
  })

  $('speed').addEventListener('input', (e) => {
    sim.speed = Number(e.target.value)
    updateStats(sim)
  })
  $('pop-size').addEventListener('change', (e) => {
    sim.popSize = Number(e.target.value)
    sim.reset()
    updateStats(sim)
  })
  $('mutation').addEventListener('input', (e) => {
    sim.mutationRate = Number(e.target.value) / 100
  })
  $('pause').addEventListener('click', () => {
    sim.paused = !sim.paused
    updateStats(sim)
    redrawViz(true)
  })
  $('reset').addEventListener('click', () => {
    sim.reset()
    updateStats(sim)
    redrawViz(true)
  })
  $('scenario').addEventListener('change', (e) => {
    const world = loadScenario(e.target.value)
    sim.setWorld(world, { keepChampion: Boolean(sim.bestEver.json) })
    sim.status = `Loaded ${world.name}`
    updateStats(sim)
    redrawViz(true)
  })
  $('brain-mode').addEventListener('change', (e) => {
    sim.evaluateOnly = e.target.value === 'evaluate'
  })
  $('export').addEventListener('click', () => {
    try {
      const json = sim.exportBrain()
      window.__lastExportedBrain = json
      downloadJson(`lander-brain-gen${sim.generation}.json`, json)
      sim.status = 'Brain exported'
      updateStats(sim)
    } catch (err) {
      sim.status = String(err.message || err)
      updateStats(sim)
    }
  })
  $('import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      const mode = $('brain-mode').value
      sim.importBrain(json, mode)
      window.__lastImportedBrain = json
      updateStats(sim)
      redrawViz(true)
    } catch (err) {
      sim.status = 'Could not import brain: ' + (err.message || err)
      updateStats(sim)
    }
    e.target.value = ''
  })
  $('page-prev').addEventListener('click', () => {
    sim.mosaicPage -= 1
    redrawViz(true)
    updateStats(sim)
  })
  $('page-next').addEventListener('click', () => {
    sim.mosaicPage += 1
    redrawViz(true)
    updateStats(sim)
  })
  $('mosaic-canvas').addEventListener('click', (event) => {
    const hit = hitTestMosaic(event, $('mosaic-canvas'), sim)
    if (hit) {
      sim.select(hit.id)
      updateStats(sim)
      redrawViz(true)
    }
  })

  document.addEventListener('visibilitychange', () => {
    sim.tabHidden = document.hidden
    if (document.hidden) sim.status = 'Paused while the tab is hidden'
    else if (!sim.paused) sim.status = 'Training'
    updateStats(sim)
  })

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault()
      sim.paused = !sim.paused
      updateStats(sim)
    }
  })

  window.addEventListener('resize', () => {
    resizeOverlayCanvases()
    redrawViz(true)
  })

  window.__sentient = {
    sim,
    exportBrain: () => sim.exportBrain(),
    importBrain: (json, mode) => sim.importBrain(json, mode),
    setScenario: (id) => {
      const world = loadScenario(id)
      sim.setWorld(world)
      $('scenario').value = id
      updateStats(sim)
    },
    setSpeed: (n) => {
      sim.speed = n
      $('speed').value = String(n)
    },
  }

  document.body.dataset.ready = 'true'
  sim.status = 'Training'
  updateStats(sim)
  redrawViz(true)
}

boot().catch((err) => {
  const status = $('status')
  status.textContent = 'Failed to start: ' + err.message
  console.error(err)
})
