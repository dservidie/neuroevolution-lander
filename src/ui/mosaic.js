import { simulation } from '../config.js'
import { drawMiniNetwork } from './network-viz.js'

export function mosaicLayout(count, width, height) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * (width / Math.max(height, 1)))))
  const rows = Math.max(1, Math.ceil(count / cols))
  const tileW = width / cols
  const tileH = height / rows
  return { cols, rows, tileW, tileH }
}

export function pageSlice(landers, page, pageSize = simulation.mosaicPageSize) {
  const pages = Math.max(1, Math.ceil(landers.length / pageSize))
  const current = ((page % pages) + pages) % pages
  const start = current * pageSize
  return {
    page: current,
    pages,
    items: landers.slice(start, start + pageSize),
    start,
  }
}

export function drawMosaic(ctx, sim) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0c111b'
  ctx.fillRect(0, 0, width, height)

  const slice = pageSlice(sim.landers, sim.mosaicPage)
  const layout = mosaicLayout(Math.max(slice.items.length, 1), width, height)
  const best = sim.bestLive()

  slice.items.forEach((lander, i) => {
    const col = i % layout.cols
    const row = Math.floor(i / layout.cols)
    const x = col * layout.tileW
    const y = row * layout.tileH
    let highlight = null
    if (sim.selectedId === lander.id) highlight = 'selected'
    else if (best && best.id === lander.id) highlight = 'best'
    drawMiniNetwork(ctx, x + 2, y + 2, layout.tileW - 4, layout.tileH - 4, lander, highlight)
  })

  ctx.canvas.dataset.tileCount = String(slice.items.length)
  ctx.canvas.dataset.page = String(slice.page)
  ctx.canvas.dataset.pages = String(slice.pages)
  ctx.canvas.dataset.updated = String(sim.frame)
  return { slice, layout }
}

export function hitTestMosaic(event, canvas, sim) {
  const rect = canvas.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height
  const slice = pageSlice(sim.landers, sim.mosaicPage)
  const layout = mosaicLayout(Math.max(slice.items.length, 1), canvas.width, canvas.height)
  const col = Math.floor(x / layout.tileW)
  const row = Math.floor(y / layout.tileH)
  const index = row * layout.cols + col
  return slice.items[index] ?? null
}
