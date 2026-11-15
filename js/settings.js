// Settings panel: electricity price, printer power, margin, BTW, and the
// list of filaments. Renders into #settings.
var PPC = window.PPC || {};

PPC.settings = {
  root: null,

  // One row per setting: key in state.settings, label, unit shown after the
  // input, and an optional one-line hint under the label.
  FIELDS: [
    { key: 'pricePerKwh', label: 'Electricity price', unit: '€ / kWh' },
    { key: 'printerKw', label: 'Printer power', unit: 'kW' },
    {
      key: 'wastePercent',
      label: 'Waste & failed prints',
      unit: '% extra material',
      hint: 'Typical: 5% reliable, 10–15% with supports, 20%+ multicolour',
    },
    { key: 'margin', label: 'Margin', unit: '×', hint: '1.4 = 40% on top of cost' },
    { key: 'vatPercent', label: 'BTW', unit: '%' },
  ],

  init() {
    this.root = document.getElementById('settings');

    this.root.addEventListener('input', (e) => {
      const el = e.target;
      const state = PPC.store.state;

      if (el.dataset.setting) {
        state.settings[el.dataset.setting] = PPC.calc.num(el.value);
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
      if (action === 'add-filament') {
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

  render() {
    const { settings, filaments } = PPC.store.state;
    const esc = PPC.format.esc;

    const settingRows = this.FIELDS.map(
      (f) => `
        <tr>
          <td>
            <label for="setting-${f.key}">${f.label}</label>
            ${f.hint ? `<div class="hint">${f.hint}</div>` : ''}
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
  },
};
