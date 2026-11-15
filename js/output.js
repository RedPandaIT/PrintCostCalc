// Customer quote: the clean table you copy or screenshot. Renders into
// #quote-output. A checkbox switches between "prices only" and "full breakdown".
var PPC = window.PPC || {};

(function () {
  const f = PPC.format;

  // Which columns each view shows. `cell` gets (calcResult, quoteLine).
  const SIMPLE_COLUMNS = [
    { head: 'Model', cell: (r, l) => l.model || '(unnamed)' },
    { head: 'Amount', num: true, cell: (r) => r.amount },
    { head: 'Price each', num: true, cell: (r) => f.money(r.priceEach) },
    { head: 'Total', num: true, cell: (r) => f.money(r.total) },
  ];

  const FULL_COLUMNS = [
    { head: 'Model', cell: (r, l) => l.model || '(unnamed)' },
    { head: 'Amount', num: true, cell: (r) => r.amount },
    { head: 'Filament', cell: (r) => (r.filament ? r.filament.name : '') },
    { head: 'Time', num: true, cell: (r) => f.duration(r.minutes) },
    { head: 'Grams', num: true, cell: (r) => r.grams },
    { head: 'Material', num: true, cell: (r) => f.money(r.materialCost) },
    { head: 'Power', num: true, cell: (r) => f.money(r.powerCost) },
    { head: 'Price each', num: true, cell: (r) => f.money(r.priceEach) },
    { head: 'Total', num: true, cell: (r) => f.money(r.total) },
  ];

  PPC.output = {
    root: null,
    toggle: null,

    init() {
      this.root = document.getElementById('quote-output');
      this.toggle = document.getElementById('show-breakdown');
      const copyButton = document.getElementById('copy-quote');

      this.toggle.addEventListener('change', () => {
        PPC.store.currentQuote().showBreakdown = this.toggle.checked;
        PPC.app.update();
      });

      copyButton.addEventListener('click', async () => {
        const ok = await this.copy();
        copyButton.textContent = ok ? 'Copied!' : 'Copy failed';
        setTimeout(() => (copyButton.textContent = 'Copy quote'), 1500);
      });
    },

    render() {
      const quote = PPC.store.currentQuote();
      const { settings } = quote.pricing;
      const result = PPC.calc.quote(quote);

      this.toggle.checked = quote.showBreakdown;

      // Skip lines that are still completely empty.
      const rows = result.lines
        .map((r, i) => ({ r, line: quote.lines[i] }))
        .filter(({ r, line }) => line.model.trim() || r.grams || r.minutes);

      if (rows.length === 0) {
        this.root.innerHTML = '<p class="muted">Fill in a line to see the quote.</p>';
        return;
      }

      const columns = quote.showBreakdown ? FULL_COLUMNS : SIMPLE_COLUMNS;
      const head = columns
        .map((c) => `<th${c.num ? ' class="num"' : ''}>${c.head}</th>`)
        .join('');
      const body = rows
        .map(
          ({ r, line }) =>
            '<tr>' +
            columns
              .map((c) => `<td${c.num ? ' class="num"' : ''}>${f.esc(c.cell(r, line))}</td>`)
              .join('') +
            '</tr>'
        )
        .join('');

      // Footer rows: label spans all columns but the last.
      const span = columns.length - 1;
      const footRow = (label, value, cls) =>
        `<tr class="${cls || ''}"><td colspan="${span}" class="num">${label}</td><td class="num">${f.money(value)}</td></tr>`;

      const title = 'Quote' + (quote.name ? ' – ' + f.esc(quote.name) : '');
      this.root.innerHTML = `
        <h3 class="quote-title">${title}</h3>
        <p class="muted">${f.date(quote.createdAt)}</p>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
          <tfoot>
            ${footRow('Subtotal (excl. BTW)', result.subtotal)}
            ${footRow('BTW ' + settings.vatPercent + '%', result.vat)}
            ${footRow('Total incl. BTW', result.total, 'grand')}
          </tfoot>
        </table>`;
    },

    // Copy as rich HTML (pastes as a table in mail/docs) plus plain text.
    // Falls back to selecting the text and using the old copy command.
    async copy() {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([this.root.innerHTML], { type: 'text/html' }),
            'text/plain': new Blob([this.root.innerText], { type: 'text/plain' }),
          }),
        ]);
        return true;
      } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(this.root);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const ok = document.execCommand('copy');
        selection.removeAllRanges();
        return ok;
      }
    },
  };
})();
