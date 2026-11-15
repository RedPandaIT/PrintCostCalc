# Print Price Calculator

Personal tool to price 3D prints. Enter the slicer values (time, grams,
filament), get a cost breakdown and a quote to copy or screenshot for a
customer. See `vision.md` for the idea behind it.

## Run it

Open `index.html` in a browser. There is no build step and no server. Data is
stored in the browser's local storage (key `ppc.v1`).

## Code layout

```
index.html        page structure + script tags (order matters)
css/style.css     all styling
js/format.js      money / date / duration formatting, HTML escaping
js/calc.js        cost calculation (pure functions, no DOM)
js/store.js       app data (PPC.store.state) + local storage
js/settings.js    settings + filament list panel
js/editor.js      quote editor table
js/output.js      customer quote + copy button
js/history.js     history sidebar
js/app.js         starts everything, decides what re-renders
```

Each file hangs its code on one global `PPC` object (`PPC.calc`, `PPC.store`,
...) instead of using ES modules, because modules don't load from `file://`.

## Calculation

```
power cost    = minutes × printer kW × price per kWh ÷ 60
material cost = grams × filament price per kg ÷ 1000
price each    = (power + material) × margin
line total    = price each × amount
quote total   = sum of line totals + BTW
```
