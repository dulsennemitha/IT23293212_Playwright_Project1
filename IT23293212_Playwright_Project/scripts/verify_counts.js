const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const inputFile = process.env.TESTCASES_FILE || path.join(projectRoot, 'tests', 'testcases.sample.json');
const observedDir = path.join(projectRoot, 'observed');

function safeName(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function readObserved(id) {
  try {
    return fs.readFileSync(path.join(observedDir, `${safeName(id)}.txt`), 'utf8').trim();
  } catch {
    return '';
  }
}

function tokenMatch(expected, actual) {
  const exp = String(expected ?? '').trim();
  const act = String(actual ?? '').trim();
  const tokens = exp
    .replace(/[\r\n]+/g, ' ')
    .replace(/[.,!?()\[\]{}:;"'“”]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  if (tokens.length === 0) return act.includes(exp);
  return tokens.every((t) => act.includes(t));
}

function computeStatus(expected, actual, category) {
  const exp = String(expected ?? '').trim();
  const act = String(actual ?? '').trim();
  const cat = String(category ?? '').toLowerCase();

  if (cat.includes('ui')) return '';
  if (exp === '') return act === '' ? 'Pass' : 'Fail';
  if (cat.includes('negative')) return act.includes(exp) ? 'Pass' : 'Fail';
  return tokenMatch(exp, act) ? 'Pass' : 'Fail';
}

const cases = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const counts = {
  Pos_Fun: { total: 0, pass: 0, fail: 0 },
  Neg_Fun: { total: 0, pass: 0, fail: 0 },
  Pos_UI: { total: 0 },
  Neg_UI: { total: 0 },
};

for (const tc of cases) {
  const id = String(tc.id || '');
  const actual = readObserved(id);
  const status = computeStatus(tc.expected, actual, tc.category);

  if (id.startsWith('Pos_Fun_')) {
    counts.Pos_Fun.total++;
    status === 'Pass' ? counts.Pos_Fun.pass++ : counts.Pos_Fun.fail++;
  } else if (id.startsWith('Neg_Fun_')) {
    counts.Neg_Fun.total++;
    status === 'Pass' ? counts.Neg_Fun.pass++ : counts.Neg_Fun.fail++;
  } else if (id.startsWith('Pos_UI_')) {
    counts.Pos_UI.total++;
  } else if (id.startsWith('Neg_UI_')) {
    counts.Neg_UI.total++;
  }
}

console.log(counts);
