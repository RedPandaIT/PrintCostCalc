// Settings panel: electricity price, printer power, margin, BTW, and the
// list of filaments. Renders into #settings.
var PPC = window.PPC || {};

PPC.settings = {
  root: null,

  // One entry per setting: key in state.settings, label shown to the user.
  FIELDS: [
    { key: 'pricePerKwh', label: 'Electricity price (€ / kWh)' },
    { key: 'printerKw', label: 'Printer power (kW)' },
    { key: 'wastePercent', label: 'Waste & failed prints (% extra material)' },
    { key: 'margin', label: 'Margin (1.4 = +40%)' },
    { key: 'vatPercent', label: 'BTW (%)' },
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

    const fields = this.FIELDS.map(
      (f) => `
        <label class="field">${f.label}
          <input data-setting="${f.key}" inputmode="decimal" value="${esc(settings[f.key])}">
        </label>`
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
      <div class="settings-grid">${fields}</div>
      <p class="muted">Waste buffer: extra material added to every print for failed prints, purge
        and supports. Rule of thumb: about 5% for a reliable single-colour printer, 10–15% with
        lots of supports, 20% or more for multicolour. Set 0 to turn it off.</p>
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
