const fs = require('fs');
const path = require('path');

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const testcasesPath = process.env.TESTCASES_FILE
    ? path.resolve(process.env.TESTCASES_FILE)
    : path.join(projectRoot, 'tests', 'testcases.sample.json');

  const observedDir = path.join(projectRoot, 'observed');
  if (!fs.existsSync(observedDir)) {
    console.error(`observed/ not found at: ${observedDir}`);
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(testcasesPath, 'utf-8'));
  if (!Array.isArray(cases)) {
    console.error('Testcases JSON must be an array');
    process.exit(1);
  }

  let updated = 0;
  let missing = 0;

  for (const tc of cases) {
    const safeName = String(tc.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const observedPath = path.join(observedDir, `${safeName}.txt`);
    const observed = readTextIfExists(observedPath);
    if (observed == null) {
      missing += 1;
      continue;
    }

    tc.actual = String(observed).trim();
    updated += 1;
  }

  fs.writeFileSync(testcasesPath, JSON.stringify(cases, null, 2) + '\n', 'utf-8');

  console.log(`Updated actual for ${updated} testcases.`);
  if (missing) console.log(`Missing observed files for ${missing} testcases.`);
  console.log(`Wrote: ${testcasesPath}`);
}

main();
