(function (root) {
  function createSettingsHistory(initial) {
    let present = JSON.stringify(initial), past = [], future = [], group = null, groupFuture = null;
    function end() {
      if (group && past[past.length - 1] === present) { past.pop(); future = groupFuture; }
      group = null; groupFuture = null;
    }
    function record(settings, key = null) {
      const next = JSON.stringify(settings);
      if (next === present) return;
      if (!key || key !== group) {
        end(); past.push(present);
        if (past.length > 100) past.shift();
        group = key; groupFuture = key ? future.slice() : null;
      }
      present = next; future = [];
    }
    function undo() { end(); if (!past.length) return null; future.push(present); present = past.pop(); return JSON.parse(present); }
    function redo() { end(); if (!future.length) return null; past.push(present); present = future.pop(); return JSON.parse(present); }
    return { record, end, undo, redo, value: () => JSON.parse(present), canUndo: () => past.length > 0, canRedo: () => future.length > 0 };
  }
  if (typeof module !== 'undefined') module.exports = createSettingsHistory;
  else root.createSettingsHistory = createSettingsHistory;
}(this));
