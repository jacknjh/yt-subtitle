(function (root) {
  function guid(value) { return String(value || '').replace(/[{}]/g, '').toLowerCase(); }
  function path(value) {
    var text = String(value || '').replace(/\\/g, '/');
    if (/^\/\/\?\/UNC\//i.test(text)) text = '//' + text.slice(8);
    else text = text.replace(/^\/\/\?\//, '');
    var windows = /^[a-z]:\//i.test(text) || text.indexOf('//') === 0;
    text = text.replace(/\/+/g, '/');
    return windows ? text.toLowerCase() : text;
  }
  function key(context) {
    if (!context || !context.projectId || !context.sequenceId) throw new Error('Project and sequence identity are required.');
    return guid(context.projectId) + '|' + path(context.projectPath) + '|' + guid(context.sequenceId);
  }
  function same(a, b) { return !!a && !!b && key(a) === key(b); }
  var api = { guid: guid, path: path, key: key, same: same };
  if (typeof module !== 'undefined') module.exports = api; else root.SubtitleIdentity = api;
}(typeof $ !== 'undefined' && $.global ? $.global : this));
