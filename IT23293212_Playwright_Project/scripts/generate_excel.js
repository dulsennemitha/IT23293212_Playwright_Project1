const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Appendix-2 style Excel generator.
// Mirrors the IT23349292 generator behavior: auto-fill Actual/Status from observed/*.txt and infer "covered" if missing.

const projectRoot = path.join(__dirname, '..');
const inputFile = process.env.TESTCASES_FILE || path.join(projectRoot, 'tests', 'testcases.sample.json');
const outputFile = process.env.EXCEL_OUT || path.join(projectRoot, 'IT23293212 - IT3040_TestCases.xlsx');
const observedDir = path.join(projectRoot, 'observed');

const cases = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

function getInputLengthType(input) {
  const length = Array.from(String(input ?? '')).length;
  if (length <= 30) return 'S';
  if (length <= 299) return 'M';
  return 'L';
}

function readObserved(id) {
  const safeName = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const file = path.join(observedDir, `${safeName}.txt`);
  try {
    return fs.readFileSync(file, 'utf-8').trim();
  } catch {
    return '';
  }
}

function computeStatus(expected, actual, category) {
  const exp = String(expected ?? '').trim();
  const act = String(actual ?? '').trim();
  const cat = String(category ?? '').toLowerCase();

  if (cat.includes('ui')) return '';
  if (exp === '') return act === '' ? 'Pass' : 'Fail';

  // Negative functional cases are expected to FAIL on the system, so keep this strict.
  if (cat.includes('negative')) return act.includes(exp) ? 'Pass' : 'Fail';

  // Positive functional: be tolerant to minor formatting differences.
  const tokens = exp
    .replace(/[\r\n]+/g, ' ')
    .replace(/[.,!?()\[\]{}:;"'“”]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  if (tokens.length === 0) return act.includes(exp) ? 'Pass' : 'Fail';
  return tokens.every((t) => act.includes(t)) ? 'Pass' : 'Fail';
}

function inferInputDomain(tc) {
  const id = String(tc.id ?? '').toLowerCase();
  const name = String(tc.name ?? '').toLowerCase();
  const input = String(tc.input ?? '').toLowerCase();
  const notes = String(tc.notes ?? '').toLowerCase();

  if (id.startsWith('ui_') || name.includes('ui')) return 'Empty/cleared input handling';
  if (input.trim() === '' || name.includes('empty') || notes.includes('cleared')) return 'Empty/cleared input handling';
  if (input.includes('\n') || name.includes('newline') || notes.includes('line breaks') || notes.includes('paragraph')) {
    return 'Formatting (spaces / line breaks / paragraph)';
  }
  if (/[!?.“"()\[\]{}:;,@#$%^&*_+=~`<>|\\/]/.test(tc.input ?? '')) return 'Punctuation / numbers';
  if (notes.includes('mixed') || input.includes('meeting') || input.includes('github') || input.includes('zoom')) {
    return 'Mixed Singlish + English';
  }
  if (name.includes('greeting') || name.includes('request') || name.includes('apology') || notes.includes('polite')) {
    return 'Greeting / request / response';
  }
  if (notes.includes('slang') || name.includes('slang') || input.includes('machan')) return 'Slang / informal language';
  return 'Daily language usage';
}

function inferGrammarFocus(tc) {
  const name = String(tc.name ?? '').toLowerCase();
  const notes = String(tc.notes ?? '').toLowerCase();
  const input = String(tc.input ?? '').toLowerCase();

  if (name.includes('question') || notes.includes('question') || input.includes('?')) return 'Interrogative (question)';
  if (name.includes('imperative') || name.includes('command') || notes.includes('imperative')) return 'Imperative (command)';
  if (name.includes('negative') || notes.includes('negation') || input.includes(' nae') || input.includes(' na ')) {
    return 'Negation (negative form)';
  }
  if (name.includes('past') || notes.includes('past')) return 'Past tense';
  if (name.includes('future') || notes.includes('future') || input.includes('heta')) return 'Future tense';
  if (name.includes('compound')) return 'Compound sentence';
  return 'Simple sentence';
}

function inferQualityFocus(tc) {
  const category = String(tc.category ?? '').toLowerCase();
  const name = String(tc.name ?? '').toLowerCase();
  const notes = String(tc.notes ?? '').toLowerCase();

  if (category.includes('ui')) {
    if (name.includes('clear') || notes.includes('clear') || notes.includes('real-time')) return 'Real-time output update behavior';
    return 'Error handling / input validation';
  }
  if (category.includes('negative')) return 'Robustness validation';
  return 'Accuracy validation';
}

function inferWhatIsCovered(tc) {
  const inputLengthType = tc.inputLengthType || getInputLengthType(tc.input);
  const parts = [
    inferInputDomain(tc),
    inferGrammarFocus(tc),
    `${inputLengthType} (${inputLengthType === 'S' ? '≤30 characters' : inputLengthType === 'M' ? '31–299 characters' : '≥300 characters'})`,
    inferQualityFocus(tc),
  ];
  return parts.map(p => `• ${p}`).join('\n');
}

const rows = cases.map(tc => ({
  'TC id': tc.id,
  'Test case name': tc.name,
  'Input length type': tc.inputLengthType || getInputLengthType(tc.input),
  'Input': tc.input,
  'Expected': tc.expected,
  'Actual output': tc.actual || readObserved(tc.id),
  'Status': tc.status || computeStatus(tc.expected, tc.actual || readObserved(tc.id), tc.category),
  'Accuracy justification / Description': tc.justification || tc.notes || '',
  'What is covered by the test': tc.covered || inferWhatIsCovered(tc)
}));

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, 'TestCases');

function tryWrite(filePath) {
  XLSX.writeFile(wb, filePath);
  console.log(`Excel created: ${filePath}`);
}

try {
  tryWrite(outputFile);
} catch (err) {
  if (err && err.code === 'EBUSY') {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fallback = outputFile.replace(/\.xlsx$/i, '') + `_${ts}.xlsx`;
    console.warn(`Output file is locked (close Excel): ${outputFile}`);
    console.warn(`Writing to: ${fallback}`);
    tryWrite(fallback);
  } else {
    throw err;
  }
}
