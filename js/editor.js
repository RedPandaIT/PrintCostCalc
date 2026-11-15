// Quote editor: the table where you type the slicer values. Renders into #editor.
//
// render() rebuilds the whole table (only needed when the quote or its lines
// change). While typing we only call refreshTotals(), so inputs keep focus.
var PPC = window.PPC || {};

PPC.editor = {
  root: null,

  init() {
    this.root = document.getElementById('editor');

    // Typing in any input/select: copy the value into the current quote.
    this.root.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      if (!field) return;

      const quote = PPC.store.currentQuote();
      const row = e.target.closest('tr[data-line]');
      if (row) {
        const line = quote.lines.find((l) => l.id === row.dataset.line);
        line[field] = e.target.value;
        if (field === 'filamentId') PPC.store.ensureFilamentPriced(quote, line.filamentId);
      } else {
        quote[field] = e.target.value;
      }
      PPC.app.update();
    });

    this.root.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const quote = PPC.store.currentQuote();

      if (action === 'add-line') {
        quote.lines.push(PPC.store.newLine(quote.lines[quote.lines.length - 1]));
        this.render();
        PPC.app.update();
        this.root.querySelector('tr[data-line]:last-child input').focus();
      } else if (action === 'recalculate') {
        PPC.store.recalculate(quote);
        this.render();
        PPC.app.update();
      } else if (action === 'remove-line') {
        const id = e.target.closest('tr').dataset.line;
        quote.lines = quote.lines.filter((l) => l.id !== id);
        if (quote.lines.length === 0) quote.lines.push(PPC.store.newLine(null));
        this.render();
        PPC.app.update();
      }
    });
  },

  render() {
    const quote = PPC.store.currentQuote();
    const esc = PPC.format.esc;

    // Dropdown choices: the current filaments, plus filaments that were deleted
    // but are still used by a line (their price lives on in the quote).
    const current = PPC.store.state.filaments;
    const usedIds = new Set(quote.lines.map((l) => l.filamentId));
    const removed = quote.pricing.filaments.filter(
      (f) => usedIds.has(f.id) && !current.some((c) => c.id === f.id)
    );
    const choices = [
      ...current.map((f) => ({ id: f.id, name: f.name || '(unnamed)' })),
      ...removed.map((f) => ({ id: f.id, name: (f.name || '(unnamed)') + ' (removed)' })),
    ];

    const rows = quote.lines
      .map((line) => {
        const options = choices
          .map(
            (c) =>
              `<option value="${c.id}"${c.id === line.filamentId ? ' selected' : ''}>${esc(c.name)}</option>`
          )
          .join('');

        return `
        <tr data-line="${line.id}">
          <td><input data-field="model" value="${esc(line.model)}" placeholder="Model name"></td>
          <td><input data-field="amount" class="narrow" inputmode="numeric" value="${esc(line.amount)}"></td>
          <td><input data-field="time" class="narrow" value="${esc(line.time)}" placeholder="1h 10m"></td>
          <td><input data-field="grams" class="narrow" inputmode="decimal" value="${esc(line.grams)}" placeholder="10g"></td>
          <td><select data-field="filamentId"><option value="">—</option>${options}</select></td>
          <td><input data-field="handling" class="narrow" inputmode="decimal" value="${esc(line.handling || '')}" placeholder="0"></td>
          <td class="num each"></td>
          <td class="num total"></td>
          <td><button class="icon" data-action="remove-line" title="Remove line">×</button></td>
        </tr>`;
      })
      .join('');

    this.root.innerHTML = `
      <div class="notice" id="pricing-notice" hidden>
        <span>This quote was sent with the prices from <strong id="pricing-date"></strong>, which differ
          from your current settings.</span>
        <button data-action="recalculate">Recalculate with current prices</button>
      </div>
      <label class="field">Customer / reference
        <input data-field="name" value="${esc(quote.name)}" placeholder="optional">
      </label>
      <div class="table-wrap">
        <table class="lines">
          <thead><tr>
            <th>Model</th><th>Quantity</th><th>Time</th><th>Grams</th><th>Filament</th><th>Handling €/pc</th>
            <th class="num">Price each</th><th class="num">Line total</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="editor-foot">
        <button data-action="add-line">+ Add line</button>
        <div class="summary"><span>Total incl. BTW</span><strong id="editor-total"></strong></div>
      </div>
      <label class="field fee">Handling fee: &nbsp;
        € <input data-field="handlingFee" class="narrow" inputmode="decimal" value="${esc(quote.handlingFee)}" placeholder="0">
      </label>
      `;

    this.refreshTotals();
  },

  // Update the computed cells and the "invalid input" highlights.
  refreshTotals() {
    const quote = PPC.store.currentQuote();
    const quoteResult = PPC.calc.quote(quote);
    const results = quoteResult.lines;
    const money = PPC.format.money.bind(PPC.format);

    this.root.querySelector('#editor-total').textContent = money(quoteResult.total);

    // Banner: only shown when the frozen prices differ from the current ones.
    this.root.querySelector('#pricing-notice').hidden = !PPC.store.pricingDiffers(quote);
    this.root.querySelector('#pricing-date').textContent = PPC.format.date(quote.pricing.at);

    this.root.querySelectorAll('tr[data-line]').forEach((row, i) => {
      const line = quote.lines[i];
      const result = results[i];

      row.querySelector('.each').textContent = money(result.priceEach);
      row.querySelector('.total').textContent = money(result.total);

      const timeInvalid = PPC.calc.parseDuration(line.time) === null;
      row.querySelector('[data-field="time"]').classList.toggle('invalid', timeInvalid);
      row.querySelector('[data-field="filamentId"]').classList.toggle('invalid', !result.filament);
    });
  },
};
