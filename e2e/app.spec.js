import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.__errors = errors
})

async function boot(page) {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 })
}

test('page loads without console errors', async ({ page }) => {
  await boot(page)
  await expect(page.locator('h1')).toHaveText('Sentient Lander')
  await expect(page.getByTestId('generation')).toHaveText('1')
  await expect(page.getByTestId('sim-canvas')).toBeVisible()
  await expect(page.getByTestId('network-canvas')).toBeVisible()
  await expect(page.getByTestId('mosaic-canvas')).toBeVisible()
  const errors = page.__errors.filter((text) => !/favicon|Download the React DevTools/i.test(text))
  expect(errors).toEqual([])
})

test('generations advance at max speed', async ({ page }) => {
  await boot(page)
  await page.evaluate(() => window.__sentient.setSpeed(20))
  await expect(page.getByTestId('generation')).not.toHaveText('1', { timeout: 25000 })
  const gen = Number(await page.getByTestId('generation').innerText())
  expect(gen).toBeGreaterThan(1)
})

test('network visualization renders and updates', async ({ page }) => {
  await boot(page)
  const canvas = page.getByTestId('network-canvas')
  await expect(canvas).toHaveAttribute('data-node-count', '24')
  const first = await canvas.getAttribute('data-updated')
  await page.evaluate(() => window.__sentient.setSpeed(12))
  await expect(canvas).not.toHaveAttribute('data-updated', first, { timeout: 15000 })
  const mosaic = page.getByTestId('mosaic-canvas')
  await expect(mosaic).toHaveAttribute('data-tile-count', /[1-9]/)
  await mosaic.click({ position: { x: 40, y: 40 } })
  await expect(page.locator('#focus-label')).toContainText('lander')
})

test('export and import a brain across scenarios', async ({ page }) => {
  await boot(page)
  await page.evaluate(() => window.__sentient.setSpeed(20))
  await expect(page.getByTestId('generation')).not.toHaveText('1', { timeout: 25000 })

  const downloadPromise = page.waitForEvent('download')
  await page.locator('#export').click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const json = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  expect(json.kind).toBe('sentient-lander-brain')
  expect(json.topology.inputNodes).toBe(11)

  await page.evaluate(() => window.__sentient.setScenario('offset-pad'))
  await page.locator('#brain-mode').selectOption('evaluate')
  await page.locator('#import').setInputFiles({
    name: 'brain.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(json)),
  })
  await expect(page.getByTestId('status')).toContainText(/Evaluating imported brain/)
  await expect(page.getByTestId('generation')).toHaveText('1')
  const frame = await page.locator('#frame').innerText()
  await page.waitForFunction((prev) => document.getElementById('frame').textContent !== prev, frame)
  const worldName = await page.evaluate(() => window.__sentient.sim.world.name)
  expect(worldName).toBe('Offset Pad')
  expect(await page.evaluate(() => window.__sentient.sim.evaluateOnly)).toBe(true)
})
