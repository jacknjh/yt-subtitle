function runHost(expression) {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => { button.disabled = true; });
  document.getElementById('result').textContent = '';
  document.getElementById('status').textContent = 'Running the graphics test…';
  window.__adobe_cep__.evalScript(expression, result => {
    try {
      const report = JSON.parse(result);
      document.getElementById('result').textContent = JSON.stringify(report, null, 2);
      document.getElementById('status').textContent = report.ok ? (report.note || 'Inspection complete.') : report.error;
    } catch (error) {
      document.getElementById('status').textContent = 'Premiere did not return a diagnostic report: ' + result;
    } finally { buttons.forEach(button => { button.disabled = false; }); }
  });
}

document.getElementById('inspect').addEventListener('click', () => runHost('YTSubtitle.inspect()'));
document.getElementById('create').addEventListener('click', () => {
  if (!window.proofConfig) {
    document.getElementById('status').textContent = 'Run install-dev.ps1 to configure the local test template and sequence preset.';
    return;
  }
  const options = JSON.stringify(window.proofConfig).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  runHost('YTSubtitle.createProof(' + options + ')');
});
