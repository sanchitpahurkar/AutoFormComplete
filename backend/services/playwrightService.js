// backend/services/playwrightService.js
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import * as mappingService from './mappingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const activeSessions = new Map();

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

async function safeScreenshot(page) {
  try {
    const buf = await page.screenshot({ fullPage: true });
    return buf.toString('base64');
  } catch (err) {
    console.warn('safeScreenshot failed (page may be closed):', err?.message || err);
    return null;
  }
}

function getProfileDirForUser(userKey) {
  const profilesRoot = path.join(process.cwd(), 'playwright_profiles');
  return path.join(profilesRoot, String(userKey));
}

async function getPersistentContext(userKey, { headless = false } = {}) {
  const userDir = getProfileDirForUser(userKey);
  await fs.mkdir(userDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDir, {
    headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
    viewport: null,
    userAgent: USER_AGENT
  });

  const pages = context.pages();
  const page = pages.length ? pages[0] : await context.newPage();

  // try to mask automation flag
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    } catch (e) { /* ignore */ }
  });

  return { context, page, browser: context.browser(), userDir };
}

/** Detect whether Google sign-in is likely required on the current page */
async function detectGoogleSignInRequired(page) {
  try {
    const hasGoogleLink = (await page.$$('a[href*="accounts.google.com"]')).length > 0;
    const signinTextCount = await page.locator('text=/sign in to save/i').count().catch(() => 0);
    const signBtnCount = await page.locator('text=/\\bSign in\\b/i').count().catch(() => 0);
    return hasGoogleLink || signinTextCount > 0 || signBtnCount > 0;
  } catch (err) {
    return false;
  }
}

/** Normalizers and small helpers */
function normalizeString(v) { if (v === undefined || v === null) return ''; return String(v).trim(); }

async function setInputValue(elHandle, value) {
  try {
    await elHandle.evaluate((el, v) => {
      if ('value' in el) el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    return true;
  } catch (e) {
    try {
      await elHandle.fill(value);
      return true;
    } catch (_) { return false; }
  }
}

/** Extract composite label and input attributes for mapping */
async function extractCompositeAndAttrs(container) {
  try {
    const labelSelectors = ['div[role="heading"]', '.freebirdFormviewerComponentsQuestionBaseTitle', '.doc1P', 'label', '.quantumWizFormtitleContent'];
    let label = '';
    for (const s of labelSelectors) {
      const el = await container.$(s);
      if (el) {
        const t = (await el.innerText()).trim();
        if (t) { label = t; break; }
      }
    }
    if (!label) {
      const txt = (await container.innerText()).trim();
      label = txt.split('\n')[0] || '';
    }

    const input = await container.$('input, textarea, select, [role="textbox"], [contenteditable="true"]');
    const name = input ? (await input.getAttribute('name')) || '' : '';
    const id = input ? (await input.getAttribute('id')) || '' : '';
    const placeholder = input ? (await input.getAttribute('placeholder')) || '' : '';
    const aria = input ? (await input.getAttribute('aria-label')) || '' : '';
    const typeAttr = input ? (await input.getAttribute('type')) || (await input.evaluate(e => e.tagName.toLowerCase())) : '';

    const attrs = { name, id, placeholder, aria, type: typeAttr, element: input };
    const composite = `${label} ${name} ${id} ${placeholder} ${aria} ${typeAttr}`.trim();

    return { composite, attrs };
  } catch (err) {
    return { composite: '', attrs: {} };
  }
}

/** Field detection: is required? */
async function isFieldRequired(container) {
  try {
    const req = await container.$('input[required], textarea[required], select[required]');
    if (req) return true;
    const ariaReq = await container.$('[aria-required="true"]');
    if (ariaReq) return true;
    const textCount = await container.locator('text=/required/i').count().catch(() => 0);
    return textCount > 0;
  } catch (e) { return false; }
}

/** Helpers to choose radio/checkbox/select options */
async function getOptionLabelText(optionElement) {
  try {
    const text = (await optionElement.innerText())?.trim();
    if (text) return text;
    const aria = (await optionElement.getAttribute('aria-label')) || '';
    if (aria) return aria.trim();
    const parentText = (await optionElement.evaluate(el => (el.parentElement?.innerText || '').trim())) || '';
    return parentText;
  } catch (e) { return ''; }
}

async function chooseRadioOrOptions(radios, desiredValue) {
  const desired = normalizeString(desiredValue).toLowerCase();
  const items = [];
  for (const r of radios) {
    const labelText = (await getOptionLabelText(r)) || '';
    items.push({ element: r, label: labelText.trim() });
  }
  // exact match
  let exact = items.find(it => it.label.toLowerCase() === desired);
  if (exact) { await exact.element.click().catch(()=>{}); return { clickedLabel: exact.label, usedOtherInput: false }; }
  // whole-word boundary match
  const whole = items.find(it => {
    const low = it.label.toLowerCase();
    const escaped = desired.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    return re.test(low) && !/^\s*other\b/.test(low);
  });
  if (whole) { await whole.element.click().catch(()=>{}); return { clickedLabel: whole.label, usedOtherInput: false }; }
  // fuzzy token match
  for (const it of items) {
    if (/^\s*other\b/i.test(it.label) && !desired.includes('other')) continue;
    if (mappingService.choiceMatches(it.label, desiredValue)) { await it.element.click().catch(()=>{}); return { clickedLabel: it.label, usedOtherInput: false }; }
  }
  // try Other option: click and fill nearby input
  const other = items.find(it => /^\s*other\b/i.test(it.label));
  if (other && desired) {
    await other.element.click().catch(()=>{});
    try {
      const parentHandle = await other.element.evaluateHandle(el => el.closest('div') || el.parentElement);
      if (parentHandle) {
        const otherInput = await parentHandle.asElement().$('input[type="text"], textarea, [contenteditable="true"]');
        if (otherInput) {
          await setInputValue(otherInput, desiredValue);
          return { clickedLabel: other.label, usedOtherInput: true };
        }
      }
    } catch (e) {}
    return { clickedLabel: other.label, usedOtherInput: false };
  }
  return null;
}

async function chooseSelectOption(selectEl, desiredValue) {
  const options = await selectEl.$$('option');
  const desired = normalizeString(desiredValue).toLowerCase();
  for (const opt of options) {
    const txt = (await opt.textContent()).trim();
    if (txt.toLowerCase() === desired) {
      const val = await opt.getAttribute('value');
      await selectEl.selectOption(val || { label: txt }).catch(()=>{});
      return { chosen: txt, exact: true };
    }
  }
  for (const opt of options) {
    const txt = (await opt.textContent()).trim();
    if (mappingService.choiceMatches(txt, desiredValue)) {
      const val = await opt.getAttribute('value');
      await selectEl.selectOption(val || { label: txt }).catch(()=>{});
      return { chosen: txt, exact: false };
    }
  }
  await selectEl.selectOption({ label: desiredValue }).catch(()=>{});
  return null;
}

/** Fill date heuristics */
async function fillDateInContainer(container, rawValue) {
  const val = normalizeString(rawValue);
  if (!val) return false;
  function toISO(d) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('-'); return `${yyyy}-${mm}-${dd}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('/'); return `${yyyy}-${mm}-${dd}`;
    }
    const parsed = new Date(d);
    if (!isNaN(parsed)) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }
  try {
    const dateInput = await container.$('input[type="date"]');
    if (dateInput) {
      const iso = toISO(val);
      if (iso) { await setInputValue(dateInput, iso); return true; }
    }
    const anyText = await container.$('input[type="text"], input[type="tel"], textarea, input:not([type])');
    if (anyText) {
      const iso = toISO(val);
      const ph = (await anyText.getAttribute('placeholder')) || '';
      const ddmm = iso ? iso.split('-').slice().reverse().join('-') : val;
      const toSet = (ph && /dd|mm|yyyy/i.test(ph) && ddmm) ? ddmm : (iso || val);
      await setInputValue(anyText, toSet);
      return true;
    }
    return false;
  } catch (e) { return false; }
}

/** Core filler which returns which fields were filled and unmatched lists */
async function performFilling(page, userProfile, sessionId) {
  const filled = [];
  const unmatchedMandatory = [];
  const unmatchedOptional = [];

  await page.waitForTimeout(400);

  const containerSelectors = [
    'div[role="listitem"]',
    '.freebirdFormviewerViewItemsItemItem',
    '.quantumWizFormcdQuestionListItem',
    '.freebirdFormviewerViewItemsItem'
  ];
  let containers = [];
  for (const s of containerSelectors) {
    containers = await page.$$(s);
    if (containers.length) break;
  }
  if (!containers || containers.length === 0) {
    // fallback selector that finds parent divs with form inputs
    containers = await page.$$(':scope div:has(input, textarea, select, [role="textbox"])');
  }

  for (const c of containers) {
    const { composite, attrs } = await extractCompositeAndAttrs(c);
    if (!composite) continue;
    const required = await isFieldRequired(c);

    const textInput = await c.$('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"], textarea').catch(()=>null);
    const contentable = await c.$('[role="textbox"], [contenteditable="true"]').catch(()=>null);
    const selectEl = await c.$('select').catch(()=>null);
    const fileInput = await c.$('input[type="file"]').catch(()=>null);
    const radios = await c.$$('[role="radio"], .quantumWizTogglePaperRadioContainer, .freebirdFormviewerComponentsQuestionRadioChoice').catch(()=>[]);
    const checks = await c.$$('[role="checkbox"], .quantumWizTogglePapercheckboxInnerBox, .freebirdFormviewerComponentsQuestionCheckboxChoice').catch(()=>[]);

    // Attempt mapping using attributes first then composite label
    const tokens = [attrs.name, attrs.id, attrs.placeholder, attrs.aria].filter(Boolean).map(t => String(t).toLowerCase());
    let mapped = null;
    for (const t of tokens) {
      const cleaned = t.replace(/[^a-z0-9]/g, '');
      if (mappingService.KEYWORD_MAP && mappingService.KEYWORD_MAP[cleaned]) { mapped = cleaned; break; }
    }
    if (!mapped) mapped = mappingService.findMatch(composite);

    // small heuristics
    if (!mapped && /\bname\b/i.test(composite)) mapped = 'firstName';
    if (!mapped && /\bcgpa\b/i.test(composite)) mapped = 'cgpa';

    if (!mapped) {
      const entry = { label: composite, reason: 'no mapping' };
      (required ? unmatchedMandatory : unmatchedOptional).push(entry);
      continue;
    }

    // derive user value
    let userValue = userProfile[mapped];
    // fallback for full name + parts
    if (!userValue && (mapped === 'firstName' || mapped === 'lastName' || mapped === 'middleName')) {
      const full = userProfile.fullName || `${userProfile.firstName || ''} ${userProfile.middleName || ''} ${userProfile.lastName || ''}`.trim();
      const parts = full.split(/\s+/).filter(Boolean);
      if (mapped === 'firstName') userValue = parts[0] || '';
      if (mapped === 'lastName') userValue = parts.slice(-1)[0] || '';
      if (mapped === 'middleName') userValue = parts.slice(1, -1).join(' ') || '';
    }

    if (userValue === undefined || userValue === null || String(userValue).trim() === '') {
      const entry = { label: composite, mapped, reason: 'no user data' };
      (required ? unmatchedMandatory : unmatchedOptional).push(entry);
      continue;
    }

    const valueStr = Array.isArray(userValue) ? userValue.join(', ') : String(userValue);

    let didFill = false;
    try {
      // DOB
      if (mapped === 'dob') {
        const ok = await fillDateInContainer(c, valueStr);
        if (ok) { didFill = true; filled.push({ label: composite, mapped, method: 'date', value: valueStr }); }
      }

      // text inputs
      if (!didFill && textInput) {
        const ok = await setInputValue(textInput, valueStr);
        if (ok) { didFill = true; filled.push({ label: composite, mapped, method: 'text', value: valueStr }); }
      }

      // contenteditable
      if (!didFill && contentable) {
        await setInputValue(contentable, valueStr);
        didFill = true;
        filled.push({ label: composite, mapped, method: 'contenteditable', value: valueStr });
      }

      // select
      if (!didFill && selectEl) {
        const sel = await chooseSelectOption(selectEl, valueStr);
        if (sel) { didFill = true; filled.push({ label: composite, mapped, method: 'select', chosen: sel.chosen, exact: !!sel.exact }); }
      }

      // radios
      if (!didFill && radios && radios.length) {
        const chosen = await chooseRadioOrOptions(radios, valueStr);
        if (chosen) { didFill = true; filled.push({ label: composite, mapped, method: 'radio', chosen: chosen.clickedLabel, usedOtherInput: chosen.usedOtherInput }); }
      }

      // checkboxes
      if (!didFill && checks && checks.length) {
        for (const cb of checks) {
          const txt = (await cb.innerText()).trim() || (await cb.getAttribute('aria-label') || '').trim();
          if (mappingService.choiceMatches(txt, valueStr)) {
            await cb.click().catch(()=>{});
            didFill = true;
            filled.push({ label: composite, mapped, method: 'checkbox', matched: txt });
            break;
          }
        }
      }

      if (!didFill) {
        const entry = { label: composite, mapped, reason: 'no input matched' };
        (required ? unmatchedMandatory : unmatchedOptional).push(entry);
      }
    } catch (err) {
      const entry = { label: composite, mapped, reason: `fill-error:${err?.message || err}` };
      (required ? unmatchedMandatory : unmatchedOptional).push(entry);
    }
  } // end container loop

  return { fieldsFilled: filled, unmatchedMandatoryFields: unmatchedMandatory, unmatchedOptionalFields: unmatchedOptional };
}

/**
 * Helper: get a small fingerprint for the current page's first question label (used to detect page change)
 */
async function getPageFingerprint(page) {
  try {
    const questionElements = await page.$$(
      'div[role="listitem"], .freebirdFormviewerViewItemsItemItem, .freebirdFormviewerViewItemsItem, .quantumWizFormcdQuestionListItem'
    );
    if (!questionElements || questionElements.length === 0) return '';

    const texts = [];
    for (const el of questionElements) {
      const t = await el.innerText().catch(() => '');
      if (t) texts.push(t.trim().split('\n')[0]);
    }

    // Combine first few question texts for reliable section fingerprint
    return texts.slice(0, 3).join('|');
  } catch (e) {
    console.warn('Fingerprint error:', e);
    return '';
  }
}
/**
 * Improved multi-page filler: reliably detects new sections and clicks Next/Continue.
 */
async function fillAllPages(page, userProfile, sessionId, opts = {}) {
  const maxPages = opts.maxPages || 15;
  const aggregated = {
    fieldsFilled: [],
    unmatchedMandatoryFields: [],
    unmatchedOptionalFields: [],
    screenshots: []
  };

  let currentPage = 0;
  let prevFingerprint = await getPageFingerprint(page);

  for (; currentPage < maxPages; currentPage++) {
    console.log(`[autofill:${sessionId}] Filling page ${currentPage + 1} (fingerprint: "${prevFingerprint}")`);

    const result = await performFilling(page, userProfile, sessionId);
    aggregated.fieldsFilled.push(...(result.fieldsFilled || []));
    aggregated.unmatchedMandatoryFields.push(...(result.unmatchedMandatoryFields || []));
    aggregated.unmatchedOptionalFields.push(...(result.unmatchedOptionalFields || []));

    const ss = await safeScreenshot(page);
    if (ss) aggregated.screenshots.push({ page: currentPage + 1, data: ss });

    // Check for visible Submit
    const submitBtn = page.locator(
      'div[role="button"]:has(span:has-text("Submit")), div[role="button"]:has-text("Submit")'
    ).first();
    if (await submitBtn.isVisible().catch(() => false)) {
      console.log(`[autofill:${sessionId}] Submit button visible, stopping at page ${currentPage + 1}.`);
      break;
    }

    // Locate visible Next / Continue
    const nextBtn = page.locator(
      'div[role="button"]:has(span:has-text("Next")),' +
      'div[role="button"]:has(span:has-text("Continue")),' +
      'div[role="button"]:has-text("Next"),' +
      'div[role="button"]:has-text("Continue")'
    ).filter({ hasNot: page.locator('[disabled]') }).first();

    if (!(await nextBtn.isVisible().catch(() => false))) {
      console.log(`[autofill:${sessionId}] No visible Next/Continue button on page ${currentPage + 1}.`);
      break;
    }

    // Record pre-transition state
    const oldFingerprint = prevFingerprint;
    const oldCount = await page.locator('div[role="listitem"], .freebirdFormviewerViewItemsItemItem').count();

    // Click Next
    try {
      await nextBtn.scrollIntoViewIfNeeded();
      await nextBtn.click({ delay: 60 });
    } catch (err) {
      console.warn(`[autofill:${sessionId}] Failed normal click (${err.message}), retrying JS click`);
      await page.evaluate(el => el.click(), nextBtn).catch(() => {});
    }

    // Wait for section change (detect fingerprint or count change)
    let changed = false;
    for (let attempt = 0; attempt < 15 && !changed; attempt++) {
      await page.waitForTimeout(600);
      const newFp = await getPageFingerprint(page);
      const newCount = await page.locator('div[role="listitem"], .freebirdFormviewerViewItemsItemItem').count();
      if ((newFp && newFp !== oldFingerprint) || newCount !== oldCount) changed = true;
    }

    if (!changed) {
      console.warn(`[autofill:${sessionId}] Page change not detected — waiting extra 2s`);
      await page.waitForTimeout(2000);
    }

    prevFingerprint = await getPageFingerprint(page);
    await page.waitForTimeout(800);
  }

  return aggregated;
}
/**
 * startAutofill:
 * - opens persistent context for userKey
 * - navigates to the formUrl
 * - if Google sign-in required => returns needsGoogleLogin: true (keeps session alive)
 * - if signed-in, performs filling across all pages and returns diagnostics (keeps session alive so user can submit manually)
 */
export async function startAutofill({ userKey, formUrl, userProfile, headless = false } = {}) {
  if (!userKey) throw new Error('userKey required');
  if (!formUrl) throw new Error('formUrl required');
  if (!userProfile) throw new Error('userProfile required');

  const sessionId = crypto.randomUUID();
  const { context, page, userDir } = await getPersistentContext(userKey, { headless });

  let pageClosed = false;
  page.on('close', () => { pageClosed = true; });

  activeSessions.set(sessionId, { userKey, context, page, createdAt: Date.now(), pageClosed, userDir });

  try {
    await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(700);

    // Detect if Google sign-in is required
    const needsLogin = await detectGoogleSignInRequired(page);
    if (needsLogin) {
      console.log(`[autofill:${sessionId}] Google sign-in required. Session kept open at ${page.url()}`);
      return { sessionId, needsGoogleLogin: true, message: 'Please sign in to Google in the opened browser window and then click Continue.' };
    }

    // Fill all pages
    const agg = await fillAllPages(page, userProfile, sessionId, { maxPages: 20 });

    const finalScreenshot = pageClosed ? null : await safeScreenshot(page);

    return { sessionId, screenshotBase64: finalScreenshot, ...agg };
  } catch (err) {
    console.error(`[autofill:${sessionId}] startAutofill error:`, err);
    const ss = (activeSessions.get(sessionId)?.page && !pageClosed) ? await safeScreenshot(activeSessions.get(sessionId).page) : null;
    // include limited info but keep session alive for debugging
    throw new Error(`Autofill start failed: ${err.message || err}. screenshotIncluded=${!!ss}`);
  }
}

/** continueAutofill(sessionId, userProfile) - called after manual Google sign-in */
export async function continueAutofill(sessionId, userProfile) {
  const s = activeSessions.get(sessionId);
  if (!s) throw new Error('Session not found or expired');
  const { page } = s;
  if (!page) throw new Error('Page not available (it may have been closed)');

  try {
    // Ensure page has loaded the form (wait for presence of question containers)
    await page.waitForSelector('div[role="listitem"], .freebirdFormviewerViewItemsItemItem, form', { timeout: 20000 }).catch(()=>{});
    const agg = await fillAllPages(page, userProfile, sessionId, { maxPages: 20 });
    const screenshotBase64 = await safeScreenshot(page);
    return { sessionId, screenshotBase64, ...agg };
  } catch (err) {
    console.error(`[autofill:${sessionId}] continueAutofill error`, err);
    throw new Error(`Continue autofill failed: ${err.message || err}`);
  }
}

/**
 * submitAutofill(sessionId)
 * - Attempt to find a Submit button and click it, then close the context and delete the session.
 */
export async function submitAutofill(sessionId) {
  const s = activeSessions.get(sessionId);
  if (!s) throw new Error('Session not found or expired');
  const { page, context } = s;
  if (!page || page.isClosed?.()) { activeSessions.delete(sessionId); return { success: false, reason: 'page already closed' }; }

  try {
    // find Submit via text or button role
    const submitSelectors = [
      'text=/\\bSubmit\\b/i',
      'button[type="submit"]',
      'div[role="button"]:has-text("Submit")',
      'button:has-text("Submit")'
    ];
    let clicked = false;
    for (const sel of submitSelectors) {
      const el = await page.$(sel);
      if (el) { await el.click().catch(()=>{}); clicked = true; break; }
    }

    // XPath heuristics
    if (!clicked) {
      const xpaths = [
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit')]",
        "//div[@role='button' and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit')]"
      ];
      for (const xp of xpaths) {
        const els = await page.$x(xp);
        if (els && els[0]) { await els[0].click().catch(()=>{}); clicked = true; break; }
      }
    }

    await page.waitForTimeout(1200).catch(()=>{});
    try { await page.waitForFunction(() => /formResponse/i.test(window.location.href), { timeout: 3000 }).catch(()=>{}); } catch (e) {}

    const after = await safeScreenshot(page);
    try { await context.close(); } catch (_) {}
    activeSessions.delete(sessionId);
    return { success: true, clicked, afterScreenshotBase64: after };
  } catch (err) {
    try { await context.close(); } catch (_) {}
    activeSessions.delete(sessionId);
    console.error(`[autofill:${sessionId}] submitAutofill error:`, err);
    throw new Error(`Submit failed: ${err.message || err}`);
  }
}

/** Close + cleanup session */
export async function cancelSession(sessionId) {
  const s = activeSessions.get(sessionId);
  if (!s) return { cancelled: false };
  const { context } = s;
  try { await context.close(); } catch (e) {}
  activeSessions.delete(sessionId);
  return { cancelled: true };
}

/** Backwards-compat alias if some code expects launchAndFillForm */
export { startAutofill as launchAndFillForm };
