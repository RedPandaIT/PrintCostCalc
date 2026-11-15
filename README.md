# Print Price Calculator

Personal tool to price 3D prints. Enter the slicer values (time, grams,
filament), get a cost breakdown and a quote to copy or screenshot for a
customer. See `vision.md` for the idea behind it.

**Live page: https://redpandait.github.io/PrintCostCalc/**

## Run it

Open `index.html` in a browser. There is no build step and no server. Data is
stored in the browser's local storage (key `ppc.v1`).

## Hosting

Published with GitHub Pages by `.github/workflows/pages.yml`: every push to
`main` deploys `index.html`, `css/` and `js/`. Your data stays in each
visitor's own browser, so the hosted page starts empty for everyone.

## Calculation

```
power cost    = minutes × printer kW × price per kWh ÷ 60
wear cost     = hours × machine wear per hour
material cost = grams × filament price per kg ÷ 1000 × (1 + waste %)
price each    = (power + wear + material) × (1 + margin %)
line total    = price each × amount
quote total   = sum of line totals + BTW
```
