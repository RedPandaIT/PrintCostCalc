// Cost calculation. Pure functions: no DOM, no storage.
// Same logic as the original spreadsheet:
//   power cost    = minutes * printer kW * price per kWh / 60
//   wear cost     = minutes / 60 * wear per hour (printer depreciation, nozzles, upkeep)
//   material cost = grams * (filament price per kg / 1000) * (1 + waste %)
//   price each    = (power + wear + material) * (1 + markup %)
//   line total    = price each * amount
//   quote total   = subtotal + BTW
// The settings and filament prices come from each quote's own snapshot.
var PPC = window.PPC || {};

PPC.calc = {
  // "1,5" or "1.5" or "" -> number (0 when not a number)
  num(value) {
    const n = parseFloat(String(value).replace(',', '.'));
    return isNaN(n) ? 0 : n;
  },

  // Accepts what slicers show: "5h 25m", "5h25m10s", "1d 2h", "5:25", or plain
  // minutes ("325"). Returns minutes, 0 for empty input, null if not understood.
  parseDuration(text) {
    const s = String(text).trim().toLowerCase();
    if (s === '') return 0;

    const clock = s.match(/^(\d+):(\d{1,2})$/);
    if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

    if (/^\d+([.,]\d+)?$/.test(s)) return this.num(s);

    const minutesPerUnit = { d: 1440, h: 60, min: 1, m: 1, s: 1 / 60 };
    let total = 0;
    let found = false;
    const rest = s.replace(/(\d+(?:[.,]\d+)?)\s*(d|h|min|m|s)/g, (_, n, unit) => {
      found = true;
      total += this.num(n) * minutesPerUnit[unit];
      return '';
    });
    return found && rest.trim() === '' ? total : null;
  },

  // Costs for one quote line. `filament` may be undefined (then material is 0).
  line(line, settings, filament) {
    const minutes = this.parseDuration(line.time) || 0;
    const grams = this.num(line.grams);
    const amount = this.num(line.amount);

    const powerCost = (minutes * settings.printerKw * settings.pricePerKwh) / 60;
    const wearCost = (minutes / 60) * (settings.wearPerHour || 0);
    // The waste buffer covers failed prints, purge and supports.
    const wasteFactor = 1 + (settings.wastePercent || 0) / 100;
    const baseMaterialCost = filament ? (grams * filament.pricePerKg) / 1000 : 0;
    const materialCost = baseMaterialCost * wasteFactor; // material including the waste buffer
    const wasteCost = materialCost - baseMaterialCost;
    const cost = powerCost + wearCost + materialCost;
    const priceEach = cost * (1 + (settings.markupPercent || 0) / 100);

    return {
      minutes,
      grams,
      amount,
      filament,
      powerCost,
      wearCost,
      baseMaterialCost, // filament only, no waste buffer
      wasteCost, // the waste buffer on top of the material
      overheadCost: wearCost + wasteCost, // machine wear + waste: costs that aren't material or power
      markupCost: priceEach - cost, // what the markup adds
      materialCost,
      cost,
      priceEach,
      total: priceEach * amount,
    };
  },

  // Costs for a whole quote: per-line results plus subtotal, BTW and total.
  // Uses the quote's own frozen prices (quote.pricing), not the current settings.
  quote(quote) {
    const { settings, filaments } = quote.pricing;
    const lines = quote.lines.map((line) => {
      const filament = filaments.find((f) => f.id === line.filamentId);
      return this.line(line, settings, filament);
    });
    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const vat = (subtotal * settings.vatPercent) / 100;
    return { lines, subtotal, vat, total: subtotal + vat };
  },
};
