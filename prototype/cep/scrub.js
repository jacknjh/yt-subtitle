(function (root) {
  function attachSubtitleScrub(input, update) {
    const document = input.ownerDocument;
    let drag = null;
    function finish(cancel) {
      if (!drag) return;
      const previous = drag; drag = null;
      document.body.classList.remove('scrubbing');
      if (cancel && previous.moved) { input.value = previous.original; update(); }
      try { input.releasePointerCapture(previous.id); } catch {}
      if (!cancel && !previous.moved) { input.focus(); input.select(); }
    }
    input.addEventListener('pointerdown', event => {
      if (input.disabled || document.activeElement === input || event.button !== 0 || event.isPrimary === false || input.value.trim() === '' || !Number.isFinite(Number(input.value))) return;
      input.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, original: input.value, value: Number(input.value), start: event.clientX, last: event.clientX, moved: false };
      event.preventDefault();
    });
    input.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      if (input.disabled) { finish(true); return; }
      if (!drag.moved && Math.abs(event.clientX - drag.start) < 3) return;
      drag.moved = true;
      document.body.classList.add('scrubbing');
      drag.value = Math.max(Number(input.min), Math.min(Number(input.max), drag.value + (event.clientX - drag.last) * (event.shiftKey ? 0.025 : 0.25)));
      drag.last = event.clientX;
      const value = String(Math.round(drag.value * 10) / 10);
      if (input.value !== value) { input.value = value; update(); }
      event.preventDefault();
    });
    input.addEventListener('pointerup', event => { if (drag && event.pointerId === drag.id) finish(false); });
    ['pointercancel', 'lostpointercapture'].forEach(name => input.addEventListener(name, event => { if (drag && event.pointerId === drag.id) finish(true); }));
    input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && drag) { event.preventDefault(); finish(true); } });
    if (document.defaultView) document.defaultView.addEventListener('blur', () => finish(true));
  }
  if (typeof module !== 'undefined') module.exports = attachSubtitleScrub;
  else root.attachSubtitleScrub = attachSubtitleScrub;
}(this));
