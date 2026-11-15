// Backup / restore: download all data as a JSON file, or load such a file back.
// Wires up the buttons in the sidebar (#backup-download, #backup-restore).
//
// File format:
//   { format: "print-price-calculator-backup", version: 1, exportedAt: "...",
//     data: <PPC.store.state> }
var PPC = window.PPC || {};

PPC.backup = {
  FORMAT: 'print-price-calculator-backup',
  VERSION: 1,

  // ---- export ----

  toJson() {
    return JSON.stringify(
      {
        format: this.FORMAT,
        version: this.VERSION,
        exportedAt: new Date().toISOString(),
        data: PPC.store.state,
      },
      null,
      2
    );
  },

  download() {
    const blob = new Blob([this.toJson()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'print-price-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // ---- import ----

  // Checks the text of a backup file. Returns { error } or { state }.
  parse(text) {
    let file;
    try {
      file = JSON.parse(text);
    } catch (e) {
      return { error: "That file isn't valid JSON." };
    }

    if (!file || file.format !== this.FORMAT) {
      return { error: "That doesn't look like a Print Price Calculator backup." };
    }
    if (file.version > this.VERSION) {
      return { error: 'That backup was made by a newer version of the app.' };
    }

    const data = file.data;
    const valid =
      data &&
      typeof data.settings === 'object' &&
      Array.isArray(data.filaments) &&
      Array.isArray(data.quotes) &&
      data.filaments.every((f) => f && f.id) &&
      data.quotes.every((q) => q && q.id && Array.isArray(q.lines));
    if (!valid) return { error: 'The backup file is incomplete or damaged.' };

    return { state: PPC.store.normalize(data) };
  },

  // Replaces ALL current data with the given state and redraws everything.
  restore(state) {
    PPC.store.state = state;
    PPC.store.ensureCurrentQuote();
    PPC.store.refreshUnsent();
    PPC.store.save();
    PPC.settings.render();
    PPC.app.renderAll();
  },

  // ---- buttons ----

  showStatus(message, isError) {
    const el = document.getElementById('backup-status');
    el.textContent = message;
    el.classList.toggle('error', !!isError);
  },

  init() {
    const fileInput = document.getElementById('backup-file');

    document.getElementById('backup-download').addEventListener('click', () => {
      this.download();
      this.showStatus('Backup downloaded.');
    });

    document.getElementById('backup-restore').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      fileInput.value = ''; // so choosing the same file again still triggers "change"
      if (!file) return;

      const result = this.parse(await file.text());
      if (result.error) {
        this.showStatus(result.error, true);
        return;
      }

      const { quotes, filaments } = result.state;
      const ok = confirm(
        'Restore this backup?\n\n' +
          'It contains ' + quotes.length + ' quote(s) and ' + filaments.length + ' filament(s).\n' +
          'ALL data currently in this browser will be replaced.'
      );
      if (!ok) return;

      this.restore(result.state);
      this.showStatus('Backup restored.');
    });
  },
};
