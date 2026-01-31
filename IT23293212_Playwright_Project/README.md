# IT23293212 – IT3040 Assignment 1 (Option 1: Singlish → Sinhala)

This folder is a starter Playwright project for testing Singlish → Sinhala conversion on:
- https://www.swifttranslator.com/

## Install
```bash
npm install
npx playwright install
```

## Add your test cases
Fill your cases in [tests/testcases.sample.json](tests/testcases.sample.json).

Minimums from the assignment PDF:
- 24 scenarios where the system converts correctly (Pass)
- 10 scenarios where it fails/behaves incorrectly (Fail)
- At least 1 UI-related scenario

## Run tests
```bash
npx playwright test
```

Discovery mode (captures current site outputs into `observed/*.txt` for evidence):
```powershell
$env:DISCOVERY = "1"
npx playwright test
```

Copy observed outputs into `Actual output` for Excel (optional helper):
```bash
npm run apply-observed
```

Optional helpers:
- Set `Expected` from your current `observed/*.txt` (useful if you want your “expected” baseline to match the live site):
	```bash
	node scripts/apply_observed.js
	```
- If you have older Appendix-2 IDs like `POS_FUN_0001`, convert them to `Pos_Fun_0001` and rename any matching `observed/*.txt` + `debug/*.html`:
	```bash
	node scripts/rename_ids_to_appendix2.js
	```

## Generate Excel (Appendix 2 template)
```bash
npm run excel
```

Notes:
- The generator calculates **Input length type** automatically (S/M/L).
- If `observed/*.txt` exists, it auto-fills **Actual output** and computes **Status** for non-UI cases.
- Fill/verify **Accuracy justification** and **What is covered by the test** columns to match Appendix 2 rules.

## Package submission folder + zip
Creates `Downloads\IT23293212\IT23293212\...` and `Downloads\IT23293212.zip`:
```powershell
npm run package
```

## GitHub link
Put your public repository link in `IT23293212_GitHub_Link.txt`.
