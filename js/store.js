// App data + local storage. Owns PPC.store.state, the single source of truth:
//
//   {
//     settings:       { pricePerKwh, printerKw, wearPerHour, printerCost, payoffHours,
//                       wastePercent, marginPercent, vatPercent },
//     filaments:      [ { id, name, pricePerKg } ],
//     quotes:         [ { id, name, createdAt, sentAt, showBreakdown, lines: [...], pricing } ],
//     currentQuoteId: id of the quote being edited
//   }
//
// A quote line is { id, model, amount, time, grams, filamentId }. Values typed
// by the user are kept as strings; PPC.calc turns them into numbers.
//
// Each quote has its own `pricing` snapshot { at, settings, filaments }: a copy
// of the settings and filament prices it was made with. Calculations use that
// copy, so changing settings or filament prices later doesn't alter old quotes.
// "Recalculate" in the editor replaces the snapshot with the current prices.
//
// That freezing only applies to quotes marked as sent (`sentAt` is a date).
// A quote that has not been sent yet follows the current prices: refreshUnsent()
// updates its snapshot whenever settings or filament prices change.
var PPC = window.PPC || {};

PPC.store = {
  KEY: 'ppc.v1',
  state: null,
  HELPER_KEYS: ['printerCost', 'payoffHours'],

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  defaults() {
    return {
      settings: {
        pricePerKwh: 0.3,
        printerKw: 0.15,
        wearPerHour: 0,
        printerCost: 0,
        payoffHours: 0,
        wastePercent: 10,
        marginPercent: 40,
        vatPercent: 21,
      },
      filaments: [{ id: this.uid(), name: 'PLA', pricePerKg: 13.99 }],
      quotes: [],
      currentQuoteId: null,
    };
  },

  // Old data stored the margin as a multiplier (`margin: 1.4`). It is now a
  // percentage (`marginPercent: 40`). Convert before defaults are filled in.
  upgradeSettings(settings) {
    if (!settings || settings.margin === undefined) return settings;
    const { margin, ...rest } = settings;
    if (rest.marginPercent === undefined) {
      rest.marginPercent = Number(((margin - 1) * 100).toFixed(4));
    }
    return rest;
  },

  // Fills in anything missing from saved data (used for local storage and backups).
  normalize(saved) {
    const defaults = this.defaults();
    if (!saved) return defaults;
    const savedSettings = this.upgradeSettings(saved.settings);
    const state = { ...defaults, ...saved, settings: { ...defaults.settings, ...savedSettings } };

    // Quotes saved before pricing snapshots existed get one from the current prices.
    // A saved quote without a waste buffer was made before that setting existed,
    // so it gets 0% (its total must not change); only new quotes get the default.
    state.quotes.forEach((quote) => {
      if (this.isValidPricing(quote.pricing)) {
        const frozen = this.upgradeSettings(quote.pricing.settings);
        quote.pricing.settings = { ...defaults.settings, wastePercent: 0, wearPerHour: 0, ...frozen };
      } else {
        quote.pricing = { ...this.snapshotPricing(state), at: quote.createdAt };
        quote.pricing.settings.wastePercent = 0;
        quote.pricing.settings.wearPerHour = 0;
      }
    });
    return state;
  },

  // Makes sure a quote is open: the newest one, or a fresh one if there are none.
  ensureCurrentQuote() {
    if (this.currentQuote()) return;
    const newest = this.state.quotes[this.state.quotes.length - 1];
    if (newest) this.state.currentQuoteId = newest.id;
    else this.addQuote();
  },

  load() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(this.KEY));
    } catch (e) {
      console.warn('Could not read saved data, starting fresh.', e);
    }
    this.state = this.normalize(saved);
    this.ensureCurrentQuote();
    this.refreshUnsent();
  },

  save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save data.', e);
    }
  },

  // ---- quotes ----

  currentQuote() {
    return this.state.quotes.find((q) => q.id === this.state.currentQuoteId);
  },

  // A new line copies the filament of the previous line (you usually reuse it).
  newLine(previousLine) {
    const firstFilament = this.state.filaments[0];
    return {
      id: this.uid(),
      model: '',
      amount: '1',
      time: '',
      grams: '',
      filamentId: previousLine ? previousLine.filamentId : firstFilament ? firstFilament.id : '',
    };
  },

  addQuote() {
    const quote = {
      id: this.uid(),
      name: '',
      createdAt: new Date().toISOString(),
      sentAt: null,
      showBreakdown: false,
      lines: [this.newLine(null)],
      pricing: this.snapshotPricing(),
    };
    this.state.quotes.push(quote);
    this.state.currentQuoteId = quote.id;
    return quote;
  },

  // ---- pricing snapshots ----

  isValidPricing(pricing) {
    return !!pricing && typeof pricing.settings === 'object' && Array.isArray(pricing.filaments);
  },

  // A copy of the current settings and filament prices.
  snapshotPricing(from = this.state) {
    return {
      at: new Date().toISOString(),
      settings: { ...from.settings },
      filaments: from.filaments.map((f) => ({ ...f })),
    };
  },

  // Replace the quote's snapshot with the current prices. Filaments that were
  // deleted since, but are still used by a line, keep their old price.
  recalculate(quote) {
    const fresh = this.snapshotPricing();
    const usedIds = new Set(quote.lines.map((l) => l.filamentId));
    quote.pricing.filaments.forEach((old) => {
      if (usedIds.has(old.id) && !fresh.filaments.some((f) => f.id === old.id)) {
        fresh.filaments.push(old);
      }
    });
    quote.pricing = fresh;
  },

  isSent(quote) {
    return !!quote.sentAt;
  },

  // Marking as sent freezes the prices; un-marking lets them follow the current ones again.
  setSent(quote, sent) {
    quote.sentAt = sent ? new Date().toISOString() : null;
    if (!sent) this.refreshUnsent();
  },

  // Quotes that are not sent yet always use the current prices.
  refreshUnsent() {
    this.state.quotes.forEach((quote) => {
      if (!this.isSent(quote) && this.pricingDiffers(quote)) this.recalculate(quote);
    });
  },

  // A filament picked for a line must have a price in the quote's snapshot.
  ensureFilamentPriced(quote, filamentId) {
    if (!filamentId || quote.pricing.filaments.some((f) => f.id === filamentId)) return;
    const current = this.state.filaments.find((f) => f.id === filamentId);
    if (current) quote.pricing.filaments.push({ ...current });
  },

  // True when the quote's frozen prices differ from the current ones.
  pricingDiffers(quote) {
    const frozen = quote.pricing;
    const now = this.state;
    // printerCost / payoffHours only help to suggest a wear value; they don't price anything.
    const priced = Object.keys(now.settings).filter((k) => !this.HELPER_KEYS.includes(k));
    if (priced.some((key) => now.settings[key] !== frozen.settings[key])) {
      return true;
    }
    return quote.lines.some((line) => {
      const old = frozen.filaments.find((f) => f.id === line.filamentId);
      const current = now.filaments.find((f) => f.id === line.filamentId);
      return old && current && old.pricePerKg !== current.pricePerKg;
    });
  },

  // True when nothing has been filled in yet.
  isBlank(quote) {
    return !quote.name && quote.lines.every((l) => !l.model && !l.time && !l.grams);
  },

  setCurrent(id) {
    if (this.state.quotes.some((q) => q.id === id)) this.state.currentQuoteId = id;
  },

  // Removes a quote. If it was the open one, opens the newest remaining quote
  // (or a fresh one when nothing is left).
  deleteQuote(id) {
    const s = this.state;
    s.quotes = s.quotes.filter((q) => q.id !== id);
    if (s.currentQuoteId === id) {
      const newest = s.quotes[s.quotes.length - 1];
      if (newest) s.currentQuoteId = newest.id;
      else this.addQuote();
    }
  },

  // ---- filaments ----

  addFilament() {
    const filament = { id: this.uid(), name: '', pricePerKg: 0 };
    this.state.filaments.push(filament);
    return filament;
  },

  deleteFilament(id) {
    this.state.filaments = this.state.filaments.filter((f) => f.id !== id);
  },
};
