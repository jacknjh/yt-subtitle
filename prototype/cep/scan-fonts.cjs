const fs = require('node:fs');
const path = require('node:path');

function readFontNames(data) {
  function bounds(at, length) { if (at < 0 || at + length > data.length) throw new Error('Invalid font table bounds.'); }
  function u16(at) { bounds(at, 2); return data.readUInt16BE(at); }
  function u32(at) { bounds(at, 4); return data.readUInt32BE(at); }
  bounds(0, 12);
  const offsets = data.toString('ascii', 0, 4) === 'ttcf'
    ? Array.from({ length: Math.min(u32(8), 4096) }, (_, i) => u32(12 + i * 4)) : [0];
  const faces = [];
  for (const base of offsets) {
    const count = u16(base + 4);
    bounds(base + 12, count * 16);
    for (let i = 0; i < count; i++) {
      const entry = base + 12 + i * 16;
      if (data.toString('ascii', entry, entry + 4) !== 'name') continue;
      const start = u32(entry + 8), length = u32(entry + 12);
      bounds(start, length);
      const names = {}, records = u16(start + 2), storage = u16(start + 4);
      if (6 + records * 12 > length || storage > length) throw new Error('Invalid font naming table.');
      for (let j = 0; j < records; j++) {
        const at = start + 6 + j * 12;
        const platform = u16(at), language = u16(at + 4), id = u16(at + 6), size = u16(at + 8), offset = storage + u16(at + 10);
        if (![1, 2, 4, 6, 16, 17].includes(id) || ![0, 1, 3].includes(platform)) continue;
        if (offset + size > length) throw new Error('Invalid font name bounds.');
        if (platform !== 1 && size % 2) continue;
        const text = platform === 1 ? data.toString('latin1', start + offset, start + offset + size) : new TextDecoder('utf-16be').decode(data.subarray(start + offset, start + offset + size));
        const score = (platform === 3 ? 2 : 0) + (language === 0x409 ? 4 : 0);
        if (text && (!names[id] || score > names[id].score)) names[id] = { text: text.replace(/\0/g, '').trim().slice(0, 256), score };
      }
      const get = id => names[id] && names[id].text;
      const postscript = get(6);
      if (postscript && /^[!-~]{1,63}$/.test(postscript) && !/[\[\](){}<>/%]/.test(postscript)) faces.push({ postscript, label: get(4) || postscript, family: get(16) || get(1) || postscript, style: get(17) || get(2) || 'Regular' });
    }
  }
  return faces;
}

function scanFolders(folders) {
  const faces = new Map();
  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder, { withFileTypes: true })) {
      if (!file.isFile() || !/\.(ttf|otf|ttc)$/i.test(file.name)) continue;
      try { for (const face of readFontNames(fs.readFileSync(path.join(folder, file.name)))) faces.set(face.postscript, face); }
      catch { /* A malformed or locked font must not prevent panel installation. */ }
    }
  }
  return Array.from(faces.values()).sort((a, b) => a.label.localeCompare(b.label));
}

if (require.main === module) {
  if (!process.argv[2]) throw new Error('Provide an output path for the font catalog.');
  // shortcut: standard Windows font files only; add private/variable font providers when needed.
  const folders = [path.join(process.env.WINDIR || 'C:/Windows', 'Fonts')];
  if (process.env.LOCALAPPDATA) folders.push(path.join(process.env.LOCALAPPDATA, 'Microsoft/Windows/Fonts'));
  const faces = scanFolders(folders);
  fs.writeFileSync(process.argv[2], 'window.SubtitleFonts = ' + JSON.stringify(faces) + ';\n', 'utf8');
  process.stdout.write('Indexed ' + faces.length + ' local font faces.\n');
}
module.exports = { readFontNames, scanFolders };
