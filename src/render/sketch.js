import p5 from 'p5'
import { prefersReducedMotion } from '../motion.js'
import { landerPoints, terrainHeight } from '../geom.js'
import { physics } from '../config.js'

function makeStars(p, count) {
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: p.random(p.width),
      y: p.random(p.height * 0.72),
      s: p.random(0.4, 1.8),
      a: p.random(80, 200),
    })
  }
  return stars
}

function drawLander(p, lander, isFocus, reduced) {
  const s = lander.state
  const pts = landerPoints(s, physics.body)
  const crashed = s.status === 'crashed' || s.status === 'out_of_fuel'
  const landed = s.status === 'landed'
  p.push()
  p.translate(s.x, s.y)
  p.rotate(s.angle)
  p.strokeWeight(isFocus ? 1.6 : 1)
  p.stroke(isFocus ? '#6ec6ff' : landed ? '#7dce9a' : crashed ? '#e07a5f' : '#c5d0dc')
  p.fill(crashed ? '#3a2424' : '#d7dde6')
  p.triangle(0, -physics.body.height / 2, -physics.body.width / 2, physics.body.height / 4, physics.body.width / 2, physics.body.height / 4)
  p.stroke('#9aa8b8')
  p.line(-4, physics.body.height / 5, -physics.body.legSpread, physics.body.legDown)
  p.line(4, physics.body.height / 5, physics.body.legSpread, physics.body.legDown)
  p.strokeWeight(2)
  p.line(-physics.body.legSpread - 3, physics.body.legDown, -physics.body.legSpread + 3, physics.body.legDown)
  p.line(physics.body.legSpread - 3, physics.body.legDown, physics.body.legSpread + 3, physics.body.legDown)

  if (s.status === 'flying' && s.main > 0.05) {
    const flicker = reduced ? 1 : p.random(0.75, 1.15)
    const len = 8 + s.main * 16 * flicker
    p.noStroke()
    p.fill(255, 180, 60, 210)
    p.triangle(-4, physics.body.legDown - 2, 4, physics.body.legDown - 2, 0, physics.body.legDown + len)
    p.fill(255, 240, 180, 220)
    p.triangle(-2, physics.body.legDown - 2, 2, physics.body.legDown - 2, 0, physics.body.legDown + len * 0.6)
  }
  if (s.status === 'flying' && s.left > 0.2) {
    p.fill(140, 200, 255, 200)
    p.noStroke()
    p.ellipse(-physics.body.width / 2 - 4, 0, 6, 4)
  }
  if (s.status === 'flying' && s.right > 0.2) {
    p.fill(140, 200, 255, 200)
    p.noStroke()
    p.ellipse(physics.body.width / 2 + 4, 0, 6, 4)
  }
  p.pop()

  if (isFocus && s.status === 'flying') {
    p.stroke(110, 198, 255, 90)
    p.strokeWeight(1)
    const range = physics.sensorRange * lander.sensors.down
    p.line(s.x, s.y, s.x, s.y + range)
    p.line(s.x, s.y, s.x - 0.45 * physics.sensorRange * lander.sensors.left, s.y + physics.sensorRange * lander.sensors.left)
    p.line(s.x, s.y, s.x + 0.45 * physics.sensorRange * lander.sensors.right, s.y + physics.sensorRange * lander.sensors.right)
  }
  return pts
}

export function createSketch(sim, parent, onAfterDraw) {
  let stars = []
  const sketch = (p) => {
    p.setup = () => {
      const canvas = p.createCanvas(sim.world.width, sim.world.height)
      canvas.parent(parent)
      canvas.elt.setAttribute('data-testid', 'sim-canvas')
      canvas.elt.setAttribute('id', 'sim-canvas')
      stars = makeStars(p, 70)
      p.frameRate(60)
    }

    p.draw = () => {
      const reduced = prefersReducedMotion()
      if (sim.running) {
        const steps = Math.max(1, sim.speed | 0)
        for (let i = 0; i < steps; i++) sim.step()
      }

      if (p.width !== sim.world.width || p.height !== sim.world.height) {
        p.resizeCanvas(sim.world.width, sim.world.height)
        stars = makeStars(p, 70)
      }

      p.background(7, 10, 18)
      for (const star of stars) {
        const a = reduced ? star.a : star.a + Math.sin(p.frameCount * 0.03 + star.x) * 20
        p.stroke(230, 235, 255, a)
        p.strokeWeight(star.s)
        p.point(star.x, star.y)
      }

      p.noStroke()
      p.fill(90, 150, 210, 40)
      p.ellipse(sim.world.width - 70, 54, 36, 36)
      p.fill(120, 180, 230, 70)
      p.ellipse(sim.world.width - 74, 50, 10, 8)

      p.fill(42, 48, 60)
      p.beginShape()
      p.vertex(0, sim.world.height)
      for (const pt of sim.world.terrain) p.vertex(pt.x, pt.y)
      p.vertex(sim.world.width, sim.world.height)
      p.endShape(p.CLOSE)

      const pad = sim.world.pad
      p.fill(198, 208, 220)
      p.rect(pad.x - pad.width / 2, pad.y - 4, pad.width, 8)
      p.fill(230, 192, 70)
      p.rect(pad.x - pad.width / 2, pad.y - 6, pad.width, 3)
      p.fill(7, 10, 18)
      for (let x = pad.x - pad.width / 2 + 8; x < pad.x + pad.width / 2 - 6; x += 14) {
        p.rect(x, pad.y - 3, 8, 2)
      }

      p.fill(72, 78, 90)
      for (const ob of sim.world.obstacles) {
        p.rect(ob.x, ob.y, ob.w, ob.h, 2)
      }

      const focus = sim.focused()
      for (const lander of sim.landers) {
        if (focus && lander.id === focus.id) continue
        p.push()
        p.drawingContext.globalAlpha = 0.55
        drawLander(p, lander, false, reduced)
        p.pop()
      }
      if (focus) drawLander(p, focus, true, reduced)

      p.fill(215, 224, 234, 180)
      p.noStroke()
      p.textFont('ui-monospace, monospace')
      p.textSize(11)
      p.text(sim.world.name, 10, 16)
      p.text(`g ${sim.world.gravity.toFixed(3)}`, 10, 30)

      if (onAfterDraw) onAfterDraw(p)
    }
  }
  return new p5(sketch)
}

export function groundY(world, x) {
  return terrainHeight(world, x)
}
