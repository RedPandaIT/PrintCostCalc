// Entry point. Wires the modules together and decides what re-renders when.
//
//   update()           a value changed (typing): save + refresh what depends on it
//   filamentsChanged() filament list changed: also rebuild the editor dropdowns
//   renderAll()        another quote was opened: rebuild everything for it
var PPC = window.PPC || {};

PPC.app = {
  init() {
    PPC.store.load();

    PPC.history.init();
    PPC.editor.init();
    PPC.output.init();
    PPC.settings.init();
    PPC.theme.initToggle();

    document.getElementById('new-quote').addEventListener('click', () => this.newQuote());

    PPC.settings.render();
    this.renderAll();
  },

  renderAll() {
    PPC.history.render();
    PPC.editor.render();
    PPC.output.render();
  },

  update() {
    PPC.store.save();
    PPC.history.render();
    PPC.output.render();
    PPC.editor.refreshTotals();
  },

  filamentsChanged() {
    PPC.store.save();
    PPC.editor.render();
    this.update();
  },

  newQuote() {
    // Don't pile up empty quotes: reuse the open one if it is still blank.
    if (!PPC.store.isBlank(PPC.store.currentQuote())) {
      PPC.store.addQuote();
      PPC.store.save();
      this.renderAll();
    }
    document.querySelector('#editor input').focus();
  },

  openQuote(id) {
    PPC.store.setCurrent(id);
    PPC.store.save();
    this.renderAll();
  },

  deleteQuote(id) {
    PPC.store.deleteQuote(id);
    PPC.store.save();
    this.renderAll();
  },
};

document.addEventListener('DOMContentLoaded', () => PPC.app.init());
