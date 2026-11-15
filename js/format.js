// Formatting helpers: money, dates, durations, HTML escaping.
// Everything lives on the global PPC object (see README for the file overview).
var PPC = window.PPC || {};

PPC.format = {
  _money: new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }),

  money(amount) {
    return this._money.format(amount);
  },

  date(isoString) {
    return new Date(isoString).toLocaleDateString('nl-BE');
  },

  // 325 -> "5h 25m"
  duration(minutes) {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h ? h + 'h ' + m + 'm' : m + 'm';
  },

  // Escape text before putting it into an innerHTML template.
  esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};
