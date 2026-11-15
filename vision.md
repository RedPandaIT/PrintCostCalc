# Print Price Calculator — Vision

## What it is
A small single-page web app (no backend, data in local storage) that I use to price 3D prints for customers. It replaces `Print Cost Calculator.xlsx`, but it is not a copy of the spreadsheet: the goal is a quick quote workflow.

Personal tool, single user.

## Workflow
1. Slice a model in the printer software.
2. Copy the values (print time, filament grams) into the app, and pick the filament.
3. See the cost breakdown.
4. Copy/paste or screenshot a clean quote for the customer.

## Core features
- **Quote with multiple lines.** Each line: model name, amount, print time, grams, filament.
- **Filament list.** A saved list of filaments (name + price/kg), picked from a dropdown per line.
- **Settings** (saved in local storage): electricity price (per kWh), printer power (kWh), machine wear (per print hour, with an optional printer price and pay-off time to suggest it), waste %, markup, BTW rate (default 21%).
- **Cost calculation** per line, following the spreadsheet logic:
  - power cost = time × (power × price per kWh / 60)
  - material cost = grams × filament price per gram
  - cost per piece = power + wear + material
  - price per piece = cost per piece × (1 + markup %)
  - line total = price per piece × amount
  - quote total = sum of line totals + an optional labour / setup fee per quote (no markup on it), plus BTW
- **Quote output** that is easy to copy or screenshot. A toggle switches between:
  - *Prices only* (model, amount, price per piece, total incl. BTW), with costs and markup hidden
  - *Full breakdown* (also shows material, power and time costs)
- **Quote history.** Past quotes are saved (local storage) for my own reference and can be reopened. Each one can be deleted with a single click, no confirmation. A "new quote" button starts a fresh quote.
- **Sent quotes.** A quote follows the current settings and filament prices until I mark it as "Sent"; from then on its prices are frozen (with a "recalculate" button). Sent quotes show a badge in the history.

## Out of scope (for now)
- Business name / branding / quote notes
- Multi-user, accounts, backend

## Open details (to figure out later)
- Exact layout and styling of the quote output
- Time input format (minutes vs. hours:minutes)
- Rounding and currency formatting
