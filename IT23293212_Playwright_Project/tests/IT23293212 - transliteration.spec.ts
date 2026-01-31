import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

type TestCase = {
  id: string;
  name: string;
  category?: string;
  input: string;
  expected: string;
  justification?: string;
  covered?: string;
  actual?: string;
  expectedTokens?: string[];
};

const SITE_URL = 'https://www.swifttranslator.com/';
const INPUT_SELECTOR = 'textarea[placeholder="Input Your Singlish Text Here."]';
const OUTPUT_SELECTOR = '.card:has(.panel-title:has-text("Sinhala")) .bg-slate-50';

const projectRoot = path.join(__dirname, '..');
const testcasesPath = process.env.TESTCASES_FILE || path.join(projectRoot, 'tests', 'testcases.sample.json');
const observedDir = path.join(projectRoot, 'observed');
const debugDir = path.join(projectRoot, 'debug');

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeObserved(id: string, text: string) {
  ensureDir(observedDir);
  const safeName = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
  fs.writeFileSync(path.join(observedDir, `${safeName}.txt`), text, 'utf-8');
}

function deriveTokens(expected: string) {
  const cleaned = String(expected || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[.,!?()\[\]{}:;"'“”]+/g, ' ')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.slice(0, 3);
}

async function gotoWithRetry(page: import('@playwright/test').Page, url: string, attempts = 3) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'load' });
      return;
    } catch (err) {
      lastError = err;
      const msg = String((err as Error)?.message ?? err);
      const retriable = /ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_NAME_NOT_RESOLVED|TIMED_OUT|Timeout/i.test(msg);
      if (!retriable || i === attempts - 1) break;
      await page.waitForTimeout(1500);
    }
  }
  throw lastError;
}

async function readOutputText(outputBox: import('@playwright/test').Locator): Promise<string> {
  try {
    const tag = await outputBox.evaluate((el) => (el as HTMLElement).tagName.toLowerCase());
    if (tag === 'textarea' || tag === 'input') {
      return (await outputBox.inputValue()).trim();
    }
  } catch {
    // ignore
  }

  try {
    return (await outputBox.innerText()).trim();
  } catch {
    // ignore
  }

  return ((await outputBox.textContent()) ?? '').trim();
}

async function typeChunkedAndCommit(page: import('@playwright/test').Page, text: string) {
  const inputArea = page.getByPlaceholder('Input Your Singlish Text Here.');
  await inputArea.click();
  await inputArea.fill(text);

  // Explicitly fire events some SPAs depend on.
  await page.evaluate(
    (sel) => {
      const el = document.querySelector(sel) as HTMLTextAreaElement | null;
      if (!el) return;
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, cancelable: true, data: el.value }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));
    },
    INPUT_SELECTOR,
  );
}

async function ensureWordAutocorrectEnabled(page: import('@playwright/test').Page) {
  const checkbox = page
    .locator('div')
    .filter({ has: page.getByText('Word Autocorrect', { exact: true }) })
    .locator('input[type="checkbox"]')
    .first();

  if ((await checkbox.count()) === 0) return;

  try {
    if (!(await checkbox.isChecked())) {
      await checkbox.check({ force: true });
    }
  } catch {
    // ignore
  }
}

function isUi(tc: TestCase) {
  return tc.id.startsWith('Pos_UI_') || tc.id.startsWith('Neg_UI_');
}

function loadTestCases(): TestCase[] {
  const raw = fs.readFileSync(testcasesPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Testcases file must be an array: ${testcasesPath}`);
  return parsed;
}

test.describe('Sinhala Transliteration - Test Cases (SwiftTranslator only)', () => {
  const testCases: TestCase[] = loadTestCases();

  for (const tc of testCases) {
    test(`${tc.id} - ${tc.name}`, async ({ page }) => {
      await gotoWithRetry(page, SITE_URL, 3);

      const inputArea = page.getByPlaceholder('Input Your Singlish Text Here.');
      const outputBox = page.locator(OUTPUT_SELECTOR).first();
      await expect(outputBox).toBeVisible({ timeout: 15000 });

      await ensureWordAutocorrectEnabled(page);

      const discovery = String(process.env.DISCOVERY || '').trim() === '1';

      // UI case (single required UI scenario): verify real-time output updates while typing.
      if (tc.id === 'Pos_UI_0001') {
        await page.fill(INPUT_SELECTOR, '');
        await inputArea.click();

        await inputArea.type('mama', { delay: 80 });

        await page.evaluate(
          (sel) => {
            const el = document.querySelector(sel) as HTMLTextAreaElement | null;
            if (!el) return;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          },
          INPUT_SELECTOR,
        );

        // If the site is slow to react, nudge one extra input event.
        if (((await readOutputText(outputBox)) || '').length === 0) {
          await inputArea.type(' ', { delay: 30 });
          await inputArea.press('Backspace');
        }

        await expect
          .poll(async () => (await readOutputText(outputBox)).length, { timeout: 30000 })
          .toBeGreaterThan(0);

        await inputArea.type(' gedhara yanavaa', { delay: 50 });

        await page.evaluate(
          (sel) => {
            const el = document.querySelector(sel) as HTMLTextAreaElement | null;
            if (!el) return;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          },
          INPUT_SELECTOR,
        );
        await expect
          .poll(async () => await readOutputText(outputBox), { timeout: 30000 })
          .toContain('ගෙදර');
        await expect
          .poll(async () => await readOutputText(outputBox), { timeout: 30000 })
          .toContain('යනවා');

        const observedUi = await readOutputText(outputBox);
        writeObserved(tc.id, observedUi);
        ensureDir(debugDir);
        fs.writeFileSync(path.join(debugDir, `${tc.id}.snapshot.txt`), await page.content(), 'utf-8');
        return;
      }

      // Functional cases: type input and capture output.
      const before = await readOutputText(outputBox);
      await typeChunkedAndCommit(page, tc.input);

      const category = String(tc.category || '').toLowerCase();
      const isPositiveFunctional = category.includes('positive') && !category.includes('ui');
      const maxWaitMs = isPositiveFunctional ? 20000 : 8000;

      // Wait for the output to stabilize (it may legitimately remain empty for some inputs).
      const inputIsEmpty = String(tc.input || '').trim().length === 0;
      let observed = '';
      let last = '__INIT__';
      let stableMs = 0;
      const started = Date.now();
      while (Date.now() - started < maxWaitMs) {
        const current = await readOutputText(outputBox);
        observed = current;
        if (current === last) {
          stableMs += 250;
        } else {
          stableMs = 0;
          last = current;
        }

        // If input is empty we expect empty output; otherwise wait for any meaningful update.
        if (inputIsEmpty) {
          if (current.length === 0 && stableMs >= 750) break;
        } else {
          const changed = current !== before;
          if (changed && stableMs >= 750) break;
        }
        await page.waitForTimeout(250);
      }

      writeObserved(tc.id, observed);
      ensureDir(debugDir);
      fs.writeFileSync(path.join(debugDir, `${tc.id}.snapshot.txt`), await page.content(), 'utf-8');

      // DISCOVERY mode is now equivalent to normal mode (it always captures outputs).
      // We keep the env var to preserve backward compatibility with your README.
      if (discovery) return;

      // Validate only positive functional cases. Negative functional cases are meant to
      // capture system limitations (status will be computed in the Excel output).
      if (!isPositiveFunctional) return;

      // Positive functional cases are defined as scenarios where conversion works.
      // If output is empty, fail so the case can be redefined.
      expect(observed.length).toBeGreaterThan(0);

      const tokens = tc.expectedTokens && tc.expectedTokens.length ? tc.expectedTokens : deriveTokens(tc.expected);
      if (tokens.length === 0) {
        await expect(outputBox).toContainText(tc.expected, { timeout: 15000 });
      } else {
        for (const token of tokens) {
          expect(observed).toContain(token);
        }
      }
    });
  }
});
