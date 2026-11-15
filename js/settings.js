var PPC = window.PPC || {};

PPC.settings = {
  root: null,

  FIELDS: [
    { key: 'pricePerKwh', label: 'Electricity price', unit: '€ / kWh' },
    { key: 'printerKw', label: 'Printer power', unit: 'kW' },
    { key: 'wearPerHour', label: 'Machine wear', unit: '€ / print hour', suggest: true },
    { key: 'printerCost', label: 'Printer price', unit: '€', helper: true },
    { key: 'payoffHours', label: 'Pay-off time', unit: 'print hours', helper: true },
    {
      key: 'wastePercent',
      label: 'Waste & failed prints',
      unit: '% extra material',
    },
    { key: 'markupPercent', label: 'Markup', unit: '% on top of cost' },
    { key: 'vatPercent', label: 'VAT', unit: '%' },
  ],

  init() {
    this.root = document.getElementById('settings');

    this.root.addEventListener('input', (e) => {
      const el = e.target;
      const state = PPC.store.state;

      if (el.dataset.setting) {
        state.settings[el.dataset.setting] = PPC.calc.num(el.value);
        this.showSuggestion();
        PPC.app.update();
      } else if (el.dataset.filamentField) {
        const filament = state.filaments.find((f) => f.id === el.closest('tr').dataset.id);
        const field = el.dataset.filamentField;
        filament[field] = field === 'pricePerKg' ? PPC.calc.num(el.value) : el.value;
        PPC.app.filamentsChanged();
      }
    });

    this.root.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'use-wear-suggestion') {
        const value = this.suggestedWear();
        PPC.store.state.settings.wearPerHour = value;
        document.getElementById('setting-wearPerHour').value = value;
        this.showSuggestion();
        PPC.app.update();
      } else if (action === 'add-filament') {
        PPC.store.addFilament();
        PPC.app.filamentsChanged();
        this.render();
        this.root.querySelector('tr:last-child input').focus();
      } else if (action === 'delete-filament') {
        PPC.store.deleteFilament(e.target.closest('tr').dataset.id);
        PPC.app.filamentsChanged();
        this.render();
      }
    });
  },

  // Printer price / hours it should pay itself off in = wear per print hour.
  // 0 when either is missing. Rounded to cents.
  suggestedWear() {
    const { printerCost, payoffHours } = PPC.store.state.settings;
    if (!(printerCost > 0 && payoffHours > 0)) return 0;
    return Math.round((printerCost / payoffHours) * 100) / 100;
  },

  // Hint under "Machine wear": a suggestion with a button to use it.
  showSuggestion() {
    const el = document.getElementById('wear-suggestion');
    const value = this.suggestedWear();
    const current = PPC.store.state.settings.wearPerHour;
    if (!value) {
      el.innerHTML = 'Fill in printer price and pay-off time to get a suggestion.';
    } else if (value === current) {
      el.textContent = 'Matches the suggestion (printer price / pay-off time).';
    } else {
      el.innerHTML = 'Suggestion: ' + PPC.format.money(value) + ' / hour <button data-action="use-wear-suggestion">Use</button>';
    }
  },

  render() {
    const { settings, filaments } = PPC.store.state;
    const esc = PPC.format.esc;

    const settingRows = this.FIELDS.map(
      (f) => `
        <tr${f.helper ? ' class="helper"' : ''}>
          <td>
            <label for="setting-${f.key}">${f.label}</label>
            ${f.suggest ? '<div class="hint" id="wear-suggestion"></div>' : ''}
          </td>
          <td><input id="setting-${f.key}" data-setting="${f.key}" inputmode="decimal" value="${esc(settings[f.key])}"></td>
          <td class="unit">${f.unit}</td>
        </tr>`
    ).join('');

    const rows = filaments
      .map(
        (f) => `
        <tr data-id="${f.id}">
          <td><input data-filament-field="name" value="${esc(f.name)}" placeholder="e.g. PETG black"></td>
          <td><input data-filament-field="pricePerKg" inputmode="decimal" value="${esc(f.pricePerKg)}"></td>
          <td><button class="icon" data-action="delete-filament" title="Delete filament">×</button></td>
        </tr>`
      )
      .join('');

    this.root.innerHTML = `
      <table class="settings-table"><tbody>${settingRows}</tbody></table>
      <p class="muted">Changes apply to new quotes. An existing quote keeps the prices it was
        made with until you click "Recalculate" in that quote.</p>
      <h3>Filaments</h3>
      <table class="filaments">
        <thead><tr><th>Name</th><th>Price (€ / kg)</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <button data-action="add-filament">+ Add filament</button>`;
    this.showSuggestion();
  },
};
