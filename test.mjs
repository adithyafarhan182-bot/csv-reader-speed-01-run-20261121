// Differential tests for solve.js against csv-reader 1.0.0 (the reference).
// The reference is the oracle: every case below is compared with what the
// kit's vendor/csv-reader returns for the same input. Run: node test.mjs
// (needs the kit at its usual path; the practice set is read from it too).
// This file is a dev-time check only; the graded entry is main.ts + solve.js.

import { readFileSync } from 'node:fs';
import { run } from './solve.js';
import { readCsv } from '/home/hatch/workspace/makefun/kits/csv-reader-speed-01-run-20261121-kit/csv-reader-speed-01-run-20261121-kit/baselines/csv-reader/vendor/csv-reader/index.js';

function equal(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
      return true;
    }
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!equal(a[k], b[k])) return false;
    return true;
  }
  return false;
}

let passed = 0;
let failed = 0;
const failures = [];

function check(name, input) {
  const mine = run(input);
  const ref = readCsv(input);
  if (equal(mine, ref)) {
    passed += 1;
  } else {
    failed += 1;
    failures.push({ name, input, mine, ref });
  }
}

// --- Hand-written edge cases: every corner of the specification. ---
const cases = [
  ['empty text, header true', { text: '', header: true }],
  ['empty text, header false', { text: '', header: false }],
  ['only BOM', { text: '\uFEFF', header: true }],
  ['only BOM, header false', { text: '\uFEFF', header: false }],
  ['BOM + simple', { text: '\uFEFFa,b\n1,2', header: true }],
  ['BOM mid-text is data', { text: 'a,\uFEFFb\n1,2', header: true }],
  ['single field', { text: 'abc', header: false }],
  ['single field + newline', { text: 'abc\n', header: false }],
  ['simple 2x2', { text: 'a,b\n1,2\n', header: true }],
  ['CRLF endings', { text: 'a,b\r\n1,2\r\n', header: true }],
  ['mixed LF and CRLF', { text: 'a,b\n1,2\r\n3,4\n', header: true }],
  ['blank lines skipped', { text: '\n\na,b\n\n1,2\n\n', header: true }],
  ['blank CRLF lines skipped', { text: '\r\n\r\na,b\r\n\r\n1,2\r\n', header: true }],
  ['blank line between records', { text: 'a,b\n\n1,2', header: true }],
  ['trailing comma', { text: 'a,b,\n1,2,\n', header: true }],
  ['trailing comma at EOF', { text: 'a,b,', header: false }],
  ['leading comma', { text: ',b\n,2\n', header: true }],
  ['empty fields', { text: ',,\n,,\n', header: true }],
  ['empty field middle', { text: 'a,,c\n1,,3\n', header: true }],
  ['spaces kept, no trim', { text: ' a , b \n 1 , 2 \n', header: true }],
  ['stray CR dropped', { text: 'a\rb\n1\r2\n', header: true }],
  ['stray CR at EOF', { text: 'a,b\r', header: false }],
  ['stray CRs only line is no record', { text: 'a,b\n\r\r\n1,2\n', header: true }],
  ['stray CRs only line at EOF', { text: 'a,b\n\r\r', header: true }],
  ['stray CR before comma', { text: 'a\rb,c\n1,2\n', header: true }],
  ['stray CR before LF', { text: 'a,b\r\n1,2\r\n', header: true }],
  ['CR then comma', { text: 'a\r,b\n1,2\n', header: true }],
  ['quoted simple', { text: '"a","b"\n"1","2"\n', header: true }],
  ['quoted empty', { text: '"",""\n"",""\n', header: true }],
  ['quoted with comma', { text: '"a,b",c\n"1,2",3\n', header: true }],
  ['quoted with LF inside', { text: '"a\nb",c\n1,2\n', header: true }],
  ['quoted with CRLF inside', { text: '"a\r\nb",c\n1,2\n', header: true }],
  ['quoted with lone CR inside', { text: '"a\rb",c\n1,2\n', header: true }],
  ['quoted with CRLF+CR inside', { text: '"a\r\nb\rc",d\n1,2\n', header: true }],
  ['doubled quotes', { text: '"a""b",c\n1,2\n', header: true }],
  ['doubled quotes at edges', { text: '"""a""",b\n1,2\n', header: true }],
  ['only doubled quotes', { text: '""""\n', header: false }],
  ['quote inside unquoted is literal', { text: 'a"b,c\n1,2\n', header: true }],
  ['quote at end of unquoted', { text: 'ab",c\n1,2\n', header: true }],
  ['quote_junk after close', { text: '"a"junk,b\n1,2\n', header: true }],
  ['quote_junk with spaces', { text: '"a" ,b\n1,2\n', header: true }],
  ['quote_junk at EOL', { text: '"a"x\n1,2\n', header: true }],
  ['quote_junk at EOF', { text: '"a"x', header: false }],
  ['quote_junk with quote inside', { text: '"a"b"c,d\n1,2\n', header: true }],
  ['quote_junk with stray CR', { text: '"a"\rb,c\n1,2\n', header: true }],
  ['quote_junk only stray CRs', { text: '"a"\r\r,b\n1,2\n', header: true }],
  ['unterminated quote at EOF', { text: '"abc', header: false }],
  ['unterminated quote then comma', { text: '"ab,c\n1,2\n', header: true }],
  ['unterminated quote then LF', { text: '"ab\ncd,ef\n', header: false }],
  ['unterminated quote with newline inside', { text: '"a\nb,c\n1,2\n', header: true }],
  ['unterminated quote, quote later', { text: '"ab"cd"ef\n', header: false }],
  ['unterminated quote mid-record', { text: 'x,"ab\n1,2\n', header: true }],
  ['unterminated quote + stray CR', { text: '"a\rb,c\n1,2\n', header: true }],
  ['unterminated empty quote pair', { text: '""', header: false }],
  ['short_row', { text: 'a,b,c\n1,2\n', header: true }],
  ['short_row header false', { text: 'a,b,c\n1,2\n3\n', header: false }],
  ['short_row empty record', { text: 'a,b\n\n', header: true }],
  ['short_row single field', { text: 'a,b,c\n1\n', header: true }],
  ['long_row', { text: 'a,b\n1,2,3\n', header: true }],
  ['long_row many extra', { text: 'a\n1,2,3,4\n', header: true }],
  ['long_row header false', { text: 'a,b\n1,2,3\n4,5\n', header: false }],
  ['short then long', { text: 'a,b,c\n1\n1,2,3,4\n', header: true }],
  ['header is short_row source', { text: 'a\n1,2\n', header: true }],
  ['header long, rows short', { text: 'a,b,c,d\n1,2\n', header: true }],
  ['width from first record, header false', { text: 'a\n1,2\n3\n', header: false }],
  ['header only, no rows', { text: 'a,b,c', header: true }],
  ['header only + newline', { text: 'a,b,c\n', header: true }],
  ['no records header false', { text: '\n\n', header: false }],
  ['line counting with quoted LF', { text: '"a\nb",c\n1\n2,3,4\n', header: true }],
  ['line counting with quoted CRLF', { text: '"a\r\nb",c\n1\n2,3,4\n', header: true }],
  ['line counting with stray CR before error', { text: 'a\rb,c\n1\n2,3,4\n', header: true }],
  ['line counting, error in header', { text: 'a\rb,c\n1,2\n', header: true }],
  ['row index null for header short', { text: 'a,b\n1\n', header: true }],
  ['multiple errors order', { text: '"a\rb",c\n1,2,3,4\n"x\n', header: true }],
  ['error order stray then short', { text: 'a,b,c\n1\r,2\n', header: true }],
  ['error order junk then long', { text: 'a,b\n"1"x,2,3\n', header: true }],
  ['quoted field at EOF no close', { text: 'a,b\n"x', header: true }],
  ['quoted field CRLF at EOF', { text: '"a"\r\n', header: false }],
  ['quoted field lone CR at EOF', { text: '"a"\r', header: false }],
  ['field is just a quote', { text: '"', header: false }],
  ['field is just two quotes', { text: '""', header: false }],
  ['field is quote comma', { text: '",', header: false }],
  ['unicode fields', { text: 'café,naïve\n東京,Москва\n', header: true }],
  ['unicode quoted', { text: '"café, x",y\n1,2\n', header: true }],
  ['emoji', { text: 'a,b\n😀,🎉\n', header: true }],
  ['header false with BOM + quoted', { text: '\uFEFF"a","b"\n"1","2"', header: false }],
  ['record after unterminated', { text: '"ab\ncd,ef\nx,y\n', header: true }],
  ['empty quoted then comma', { text: '"",a\n"",b\n', header: true }],
  ['CRLF inside quoted then junk', { text: '"a\r\nb"x,c\n1,2\n', header: true }],
  ['doubled quote then junk', { text: '"a""b"x,c\n1,2\n', header: true }],
  ['doubled quote then EOF', { text: '"a""b"', header: false }],
  ['three quotes', { text: '"""', header: false }],
  ['four quotes then comma', { text: '"""",a\n', header: false }],
  ['CR CR LF', { text: 'a,b\r\r\n1,2\n', header: true }],
  ['LF CR LF', { text: 'a,b\n\r\n1,2\n', header: true }],
  ['tab characters kept', { text: 'a\tb,c\n1,2\n', header: true }],
  ['numbers stay strings', { text: '1,2.5\n007,1e3\n', header: false }],
  ['null and true stay strings', { text: 'null,true\nfalse,0\n', header: false }],
  ['long unquoted field', { text: 'x'.repeat(5000) + ',y\n1,2\n', header: true }],
  ['long quoted field', { text: '"' + 'y'.repeat(5000) + '",z\n1,2\n', header: true }],
  ['many fields', { text: Array.from({ length: 200 }, (_, i) => 'f' + i).join(',') + '\n' + Array.from({ length: 200 }, (_, i) => String(i)).join(',') + '\n', header: true }],
  ['many short rows', { text: 'a,b,c\n' + '1\n'.repeat(50), header: true }],
];

for (const [name, input] of cases) check(name, input);

// --- Practice set: the kit's own 6 drawn cases vs its expected answers. ---
const KIT = '/home/hatch/workspace/makefun/kits/csv-reader-speed-01-run-20261121-kit/csv-reader-speed-01-run-20261121-kit';
const practice = JSON.parse(readFileSync(KIT + '/practice/input/cases.json', 'utf8'));
const expected = JSON.parse(readFileSync(KIT + '/practice/reference/expected.json', 'utf8')).cases.map((c) => c.output);
for (let i = 0; i < practice.length; i++) {
  const mine = run(practice[i].input);
  if (equal(mine, expected[i])) {
    passed += 1;
  } else {
    failed += 1;
    failures.push({ name: 'practice ' + practice[i].id, input: { text_len: practice[i].input.text.length, header: practice[i].input.header }, mine, ref: expected[i] });
  }
}

// --- Fuzz: random broken CSVs from the spec's alphabet. ---
const alphabet = ['a', 'b', ',', '"', '\n', '\r', ' ', 'x', '1', '\uFEFF'];
let seed = 20261121;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function fuzzText(n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const r = rnd();
    if (r < 0.12) s += 'ab';
    else if (r < 0.2) s += '""';
    else if (r < 0.28) s += '\r\n';
    else s += alphabet[Math.floor(rnd() * alphabet.length)];
  }
  return s;
}
for (let i = 0; i < 3000; i++) {
  const n = Math.floor(rnd() * 60);
  check('fuzz-' + i, { text: fuzzText(n), header: rnd() < 0.5 });
}

console.log(`passed: ${passed}, failed: ${failed}`);
if (failed > 0) {
  for (const f of failures.slice(0, 5)) {
    console.log('FAIL:', f.name);
    console.log('  input:', JSON.stringify(f.input).slice(0, 300));
    console.log('  mine:', JSON.stringify(f.mine).slice(0, 500));
    console.log('  ref :', String(JSON.stringify(f.ref)).slice(0, 500));
  }
  process.exit(1);
}
