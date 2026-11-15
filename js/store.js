// App data + local storage. Owns PPC.store.state, the single source of truth:
//
//   {
//     settings:       { pricePerKwh, printerKw, margin, vatPercent },
//     filaments:      [ { id, name, pricePerKg } ],
//     quotes:         [ { id, name, createdAt, showBreakdown, lines: [...] } ],
//     currentQuoteId: id of the quote being edited
//   }
//
// A quote line is { id, model, amount, time, grams, filamentId }. Values typed
// by the user are kept as strings; PPC.calc turns them into numbers.
var PPC = window.PPC || {};

PPC.store = {
  KEY: 'ppc.v1',
  state: null,

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  defaults() {
    return {
      settings: { pricePerKwh: 0.3, printerKw: 0.15, margin: 1.4, vatPercent: 21 },
      filaments: [{ id: this.uid(), name: 'PLA', pricePerKg: 13.99 }],
      quotes: [],
      currentQuoteId: null,
    };
  },

  // Fills in anything missing from saved data (used for local storage and backups).
  normalize(saved) {
    const defaults = this.defaults();
    if (!saved) return defaults;
    return { ...defaults, ...saved, settings: { ...defaults.settings, ...saved.settings } };
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
      showBreakdown: false,
      lines: [this.newLine(null)],
    };
    this.state.quotes.push(quote);
    this.state.currentQuoteId = quote.id;
    return quote;
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
