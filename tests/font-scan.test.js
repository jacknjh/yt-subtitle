const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFontNames } = require('../prototype/cep/scan-fonts.cjs');

function font(postscript, fullName = 'Example Bold', family = 'Example', style = 'Bold') {
  const values = [[1, family], [2, style], [4, fullName], [6, postscript]];
  const strings = values.map(([, text]) => Buffer.from(text, 'utf16le').swap16());
  const table = Buffer.alloc(6 + values.length * 12 + strings.reduce((sum, value) => sum + value.length, 0));
  const storage = 6 + values.length * 12;
  table.writeUInt16BE(values.length, 2); table.writeUInt16BE(storage, 4);
  let offset = 0;
  values.forEach(([id], index) => {
    const at = 6 + index * 12;
    [3, 1, 0x409, id, strings[index].length, offset].forEach((value, i) => table.writeUInt16BE(value, at + i * 2));
    strings[index].copy(table, storage + offset); offset += strings[index].length;
  });
  const file = Buffer.alloc(28 + table.length);
  file.writeUInt32BE(0x10000); file.writeUInt16BE(1, 4); file.write('name', 12);
  file.writeUInt32BE(28, 20); file.writeUInt32BE(table.length, 24); table.copy(file, 28);
  return file;
}

test('reads display names separately from the PostScript identifier required by Premiere', () => {
  assert.deepEqual(readFontNames(font('Example-Bold')), [{ postscript: 'Example-Bold', label: 'Example Bold', family: 'Example', style: 'Bold' }]);
  assert.equal(readFontNames(font('ExampleJP', 'Example 日本語'))[0].label, 'Example 日本語');
});

test('reads multiple faces from a font collection using absolute table offsets', () => {
  const a = font('Example-Regular'), b = font('Example-Bold');
  const file = Buffer.alloc(20 + a.length + b.length);
  file.write('ttcf'); file.writeUInt32BE(0x10000, 4); file.writeUInt32BE(2, 8);
  file.writeUInt32BE(20, 12); file.writeUInt32BE(20 + a.length, 16);
  for (const [data, base] of [[a, 20], [b, 20 + a.length]]) { data.copy(file, base); file.writeUInt32BE(base + 28, base + 20); }
  assert.deepEqual(readFontNames(file).map(face => face.postscript), ['Example-Regular', 'Example-Bold']);
});

test('rejects truncated tables and invalid PostScript names', () => {
  assert.throws(() => readFontNames(font('Example-Bold').subarray(0, 30)), /font/i);
  assert.deepEqual(readFontNames(font('Bad/Name')), []);
});
