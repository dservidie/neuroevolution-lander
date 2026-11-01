import { INPUT_LABELS, OUTPUT_LABELS } from '../config.js'
import { clamp } from '../geom.js'

function nodeFill(activation, ctx) {
  const t = clamp(activation, 0, 1)
  const r = Math.round(18 + t * 210)
  const g = Math.round(28 + t * 210)
  const b = Math.round(42 + t * 180)
  return `rgb(${r}, ${g}, ${b})`
}

function layerPositions(count, x, height, pad = 22) {
  const usable = height - pad * 2
  const step = count === 1 ? 0 : usable / (count - 1)
  return Array.from({ length: count }, (_, i) => ({
    x,
    y: pad + i * step,
  }))
}

export function drawNetwork(ctx, lander, options = {}) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0c111b'
  ctx.fillRect(0, 0, width, height)

  if (!lander?.brain) {
    ctx.fillStyle = '#8b98a8'
    ctx.font = '13px ui-monospace, monospace'
    ctx.fillText('No brain selected', 16, 28)
    ctx.canvas.dataset.updated = String(options.frame ?? 0)
    ctx.canvas.dataset.nodeCount = '0'
    return
  }

  const brain = lander.brain
  const inputs = layerPositions(brain.inputNodes, 54, height, 18)
  const hidden = layerPositions(brain.hiddenNodes, width * 0.5, height, 18)
  const outputs = layerPositions(brain.outputNodes, width - 58, height, 46)
  const [w1, , w2] = brain.cache
  const radius = options.radius ?? 8

  ctx.lineCap = 'round'
  for (let i = 0; i < brain.inputNodes; i++) {
    for (let j = 0; j < brain.hiddenNodes; j++) {
      const weight = w1.data[i * brain.hiddenNodes + j]
      if (Math.abs(weight) < 0.05) continue
      ctx.strokeStyle = weight >= 0 ? 'rgba(94, 200, 255, 0.55)' : 'rgba(255, 107, 107, 0.55)'
      ctx.lineWidth = 0.4 + Math.abs(weight) * 2.2
      ctx.beginPath()
      ctx.moveTo(inputs[i].x, inputs[i].y)
      ctx.lineTo(hidden[j].x, hidden[j].y)
      ctx.stroke()
    }
  }
  for (let i = 0; i < brain.hiddenNodes; i++) {
    for (let j = 0; j < brain.outputNodes; j++) {
      const weight = w2.data[i * brain.outputNodes + j]
      if (Math.abs(weight) < 0.05) continue
      ctx.strokeStyle = weight >= 0 ? 'rgba(94, 200, 255, 0.7)' : 'rgba(255, 107, 107, 0.7)'
      ctx.lineWidth = 0.5 + Math.abs(weight) * 2.4
      ctx.beginPath()
      ctx.moveTo(hidden[i].x, hidden[i].y)
      ctx.lineTo(outputs[j].x, outputs[j].y)
      ctx.stroke()
    }
  }

  const drawNodes = (pts, activations, labels) => {
    pts.forEach((pt, i) => {
      ctx.beginPath()
      ctx.fillStyle = nodeFill(activations[i] ?? 0)
      ctx.strokeStyle = '#d7e0ea'
      ctx.lineWidth = 1
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      if (labels && options.labels !== false) {
        ctx.fillStyle = '#9aa8b8'
        ctx.font = '10px ui-monospace, monospace'
        ctx.textAlign = pt.x < width / 2 ? 'right' : 'left'
        const tx = pt.x < width / 2 ? pt.x - radius - 6 : pt.x + radius + 6
        ctx.fillText(labels[i], tx, pt.y + 3)
      }
    })
  }

  drawNodes(inputs, brain.lastInput.map((v) => (v + 1) / 2), INPUT_LABELS)
  drawNodes(hidden, brain.lastHidden)
  drawNodes(outputs, brain.lastOutput, OUTPUT_LABELS)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#d7e0ea'
  ctx.font = '12px ui-monospace, monospace'
  const status = lander.state?.status ?? ''
  ctx.fillText(`Lander #${lander.id}  ${status}`, 12, 16)

  ctx.canvas.dataset.updated = String(options.frame ?? 0)
  ctx.canvas.dataset.nodeCount = String(brain.inputNodes + brain.hiddenNodes + brain.outputNodes)
  ctx.canvas.dataset.landerId = String(lander.id)
  ctx.canvas.dataset.status = status
}

export function drawMiniNetwork(ctx, x, y, w, h, lander, highlight) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = '#0c111b'
  ctx.fillRect(x, y, w, h)

  const border =
    highlight === 'selected'
      ? '#6ec6ff'
      : lander.state.status === 'landed'
        ? '#7dce9a'
        : lander.state.status === 'crashed' || lander.state.status === 'out_of_fuel'
          ? '#e07a5f'
          : highlight === 'best'
            ? '#e6c07b'
            : '#2a3344'
  ctx.strokeStyle = border
  ctx.lineWidth = highlight === 'selected' || highlight === 'best' ? 2.4 : 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

  if (!lander.brain) {
    ctx.restore()
    return
  }

  const brain = lander.brain
  const inPts = layerPositions(brain.inputNodes, x + 12, h, 8).map((p) => ({ x: p.x, y: y + p.y }))
  const hidPts = layerPositions(brain.hiddenNodes, x + w * 0.5, h, 8).map((p) => ({
    x: p.x,
    y: y + p.y,
  }))
  const outPts = layerPositions(brain.outputNodes, x + w - 12, h, 12).map((p) => ({
    x: p.x,
    y: y + p.y,
  }))
  const [w1, , w2] = brain.cache

  ctx.lineWidth = 0.6
  for (let i = 0; i < brain.inputNodes; i++) {
    for (let j = 0; j < brain.hiddenNodes; j++) {
      const weight = w1.data[i * brain.hiddenNodes + j]
      if (Math.abs(weight) < 0.18) continue
      ctx.strokeStyle = weight >= 0 ? 'rgba(94,200,255,0.45)' : 'rgba(255,107,107,0.45)'
      ctx.beginPath()
      ctx.moveTo(inPts[i].x, inPts[i].y)
      ctx.lineTo(hidPts[j].x, hidPts[j].y)
      ctx.stroke()
    }
  }
  for (let i = 0; i < brain.hiddenNodes; i++) {
    for (let j = 0; j < brain.outputNodes; j++) {
      const weight = w2.data[i * brain.outputNodes + j]
      if (Math.abs(weight) < 0.18) continue
      ctx.strokeStyle = weight >= 0 ? 'rgba(94,200,255,0.6)' : 'rgba(255,107,107,0.6)'
      ctx.beginPath()
      ctx.moveTo(hidPts[i].x, hidPts[i].y)
      ctx.lineTo(outPts[j].x, outPts[j].y)
      ctx.stroke()
    }
  }

  const dots = (pts, acts, r) => {
    pts.forEach((pt, i) => {
      ctx.beginPath()
      ctx.fillStyle = nodeFill(acts[i] ?? 0.15)
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  dots(inPts, brain.lastInput.map((v) => (v + 1) / 2), 2.2)
  dots(hidPts, brain.lastHidden, 2.4)
  dots(outPts, brain.lastOutput, 2.8)

  ctx.fillStyle = '#9aa8b8'
  ctx.font = '9px ui-monospace, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('#' + lander.id, x + 4, y + h - 5)
  ctx.restore()
}
