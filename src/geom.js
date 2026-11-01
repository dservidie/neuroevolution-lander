export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function wrapAngle(angle) {
  let a = angle
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export function randn(rng = Math.random) {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function pick(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)]
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
}

export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const den = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx)
  if (den === 0) return null
  const t = ((ax - cx) * (cy - dy) - (ay - cy) * (cx - dx)) / den
  const u = ((ax - cx) * (ay - by) - (ay - cy) * (ax - bx)) / den
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: ax + t * (bx - ax), y: ay + t * (by - ay), t }
}

export function terrainHeight(world, x) {
  const pts = world.terrain
  if (!pts.length) return world.height
  if (x <= pts[0].x) return pts[0].y
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y
  let lo = 0
  let hi = pts.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (pts[mid].x <= x) lo = mid
    else hi = mid
  }
  const a = pts[lo]
  const b = pts[hi]
  const t = (x - a.x) / Math.max(1e-6, b.x - a.x)
  return lerp(a.y, b.y, t)
}

export function localToWorld(state, localX, localY) {
  const c = Math.cos(state.angle)
  const s = Math.sin(state.angle)
  return {
    x: state.x + localX * c + localY * s,
    y: state.y + localX * s - localY * c,
  }
}

export function landerPoints(state, body) {
  const nose = localToWorld(state, 0, body.height / 2)
  const left = localToWorld(state, -body.width / 2, -body.height / 4)
  const right = localToWorld(state, body.width / 2, -body.height / 4)
  const leftFoot = localToWorld(state, -body.legSpread, -body.legDown)
  const rightFoot = localToWorld(state, body.legSpread, -body.legDown)
  const engine = localToWorld(state, 0, -body.legDown + 2)
  return { nose, left, right, leftFoot, rightFoot, engine }
}

export function raycastWorld(world, ox, oy, dx, dy, range) {
  const mag = Math.hypot(dx, dy) || 1
  const nx = (dx / mag) * range
  const ny = (dy / mag) * range
  const ex = ox + nx
  const ey = oy + ny
  let best = range
  const pts = world.terrain
  for (let i = 0; i < pts.length - 1; i++) {
    const hit = segmentsIntersect(ox, oy, ex, ey, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)
    if (hit) best = Math.min(best, hit.t * range)
  }
  for (const ob of world.obstacles) {
    const corners = [
      [ob.x, ob.y, ob.x + ob.w, ob.y],
      [ob.x + ob.w, ob.y, ob.x + ob.w, ob.y + ob.h],
      [ob.x + ob.w, ob.y + ob.h, ob.x, ob.y + ob.h],
      [ob.x, ob.y + ob.h, ob.x, ob.y],
    ]
    for (const [ax, ay, bx, by] of corners) {
      const hit = segmentsIntersect(ox, oy, ex, ey, ax, ay, bx, by)
      if (hit) best = Math.min(best, hit.t * range)
    }
  }
  return clamp(best / range, 0, 1)
}
