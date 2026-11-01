# Sentient Lander

A 2D lunar landing module that learns to land with neuroevolution. Each lander has a small TensorFlow.js neural network. After every generation the best brains are selected, crossed over and mutated, the same loop used in [sentient-rockets](https://github.com/dservidie/sentient-rockets).

## How it works

1. A population of landers spawns above a lunar surface.
2. Each brain reads pad-relative position, velocity, angle, spin, fuel and three ground sensors, then outputs main thrust plus left/right attitude thrusters.
3. Physics applies moon-like gravity, thrust, fuel burn and rotation. Touching the pad upright with low speed is a landing. Hitting terrain, rocks, the pad too hard, or flying off the map is a crash. Running out of fuel and then failing to land is a failure.
4. Fitness rewards soft, upright, centered, fuel-efficient landings and still gives partial credit for approaching the pad under control.
5. The top brains become parents. Children are made with uniform weight crossover and Gaussian mutation. Training pauses when the tab is hidden. Flame flicker and star twinkle are disabled when the system asks for reduced motion.

The live view on the right is the focused lander's network: node brightness is activation, connection color is weight sign, thickness is magnitude. Below that, a mosaic shows every lander in the population. Click a tile to inspect it. Large populations are paged.

## Run it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43180. Use **Scene Designer** to move the pad, sculpt terrain, change gravity and drop obstacles. Saved scenes appear in the training scenario list.

Turn **Speed** up to evolve faster. Landings usually start showing up after a few dozen generations on Training Ground at max speed.

## Move a brain between scenarios

1. Let a generation finish (or wait for a green landing).
2. Click **Export brain**. That JSON file is topology plus weights.
3. Pick another scenario, or open a scene you built in the designer.
4. Choose **Evaluate only** to run that brain as-is, or **Keep training** to seed a new population from it and keep evolving.
5. Click **Import brain** and select the JSON file.

The same file can be loaded into a different pad position, gravity, or obstacle layout.

## Tests

```bash
npm test          # unit tests (physics, landing, fitness, GA, brain save/load)
npm run test:e2e  # Playwright: load, generations, viz, brain transfer
npm run test:all
```

CI runs both suites and a production build on every push.
