const fs = require('fs');
const path = require('path');

function pad4(n) {
  return String(n).padStart(4, '0');
}

function buildMapping(cases) {
  const mapping = new Map();

  // POS_FUN_0001..POS_FUN_9999 -> Pos_Fun_0001..Pos_Fun_9999
  for (let i = 1; i <= 9999; i++) {
    const oldId = `POS_FUN_${pad4(i)}`;
    const newId = `Pos_Fun_${pad4(i)}`;
    mapping.set(oldId, newId);
  }

  // NEG_FUN_0001..NEG_FUN_9999 -> Neg_Fun_0001..Neg_Fun_9999
  for (let i = 1; i <= 9999; i++) {
    const oldId = `NEG_FUN_${pad4(i)}`;
    const newId = `Neg_Fun_${pad4(i)}`;
    mapping.set(oldId, newId);
  }

  // UI_0001 -> Pos_UI_0001
  mapping.set('UI_0001', 'Pos_UI_0001');

  // Only keep mappings that actually exist in the file
  const existing = new Set(cases.map((tc) => String(tc.id)));
  for (const [k] of Array.from(mapping.entries())) {
    if (!existing.has(k)) mapping.delete(k);
  }

  return mapping;
}

function renameIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.renameSync(from, to);
  return true;
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const testcasesPath = process.env.TESTCASES_FILE
    ? path.resolve(process.env.TESTCASES_FILE)
    : path.join(projectRoot, 'tests', 'testcases.sample.json');

  const observedDir = path.join(projectRoot, 'observed');
  const debugDir = path.join(projectRoot, 'debug');

  const cases = JSON.parse(fs.readFileSync(testcasesPath, 'utf-8'));
  if (!Array.isArray(cases)) {
    console.error('Testcases JSON must be an array');
    process.exit(1);
  }

  const mapping = buildMapping(cases);
  if (mapping.size === 0) {
    console.log('No matching IDs found to rename.');
    return;
  }

  // Update JSON IDs
  for (const tc of cases) {
    const id = String(tc.id);
    if (mapping.has(id)) tc.id = mapping.get(id);
  }

  // Rename observed outputs
  let renamedObserved = 0;
  if (fs.existsSync(observedDir)) {
    for (const [oldId, newId] of mapping.entries()) {
      const from = path.join(observedDir, `${oldId}.txt`);
      const to = path.join(observedDir, `${newId}.txt`);
      if (renameIfExists(from, to)) renamedObserved += 1;
    }
  }

  // Rename debug HTML dumps (optional)
  let renamedDebug = 0;
  if (fs.existsSync(debugDir)) {
    for (const [oldId, newId] of mapping.entries()) {
      const from = path.join(debugDir, `${oldId}.html`);
      const to = path.join(debugDir, `${newId}.html`);
      if (renameIfExists(from, to)) renamedDebug += 1;
    }
  }

  fs.writeFileSync(testcasesPath, JSON.stringify(cases, null, 2) + '\n', 'utf-8');

  console.log(`Updated IDs in: ${testcasesPath}`);
  console.log(`Renamed observed files: ${renamedObserved}`);
  console.log(`Renamed debug files: ${renamedDebug}`);
  console.log('Done.');
}

main();
