// History sidebar: list of saved quotes, newest first. Click to open one,
// click × to delete it (no confirmation). Renders into #history.
var PPC = window.PPC || {};

PPC.history = {
  root: null,

  init() {
    this.root = document.getElementById('history');

    this.root.addEventListener('click', (e) => {
      const item = e.target.closest('li[data-id]');
      if (!item) return;
      if (e.target.dataset.action === 'delete-quote') PPC.app.deleteQuote(item.dataset.id);
      else PPC.app.openQuote(item.dataset.id);
    });
  },

  render() {
    const { quotes, currentQuoteId, settings, filaments } = PPC.store.state;
    const f = PPC.format;

    this.root.innerHTML = [...quotes]
      .reverse()
      .map((quote) => {
        const total = PPC.calc.quote(quote, settings, filaments).total;
        const active = quote.id === currentQuoteId ? ' active' : '';
        return `
        <li data-id="${quote.id}" class="history-item${active}">
          <button class="history-open">
            <span class="history-name">${f.esc(quote.name || 'Untitled quote')}</span>
            <small>${f.date(quote.createdAt)} · ${f.money(total)}</small>
          </button>
          <button class="icon" data-action="delete-quote" title="Delete quote">×</button>
        </li>`;
      })
      .join('');
  },
};
