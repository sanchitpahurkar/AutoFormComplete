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
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });

  return { context, page, browser: context.browser(), userDir };
}

async function detectGoogleSignInRequired(page) {
  try {
    const googleLinks = await page.$$('a[href*="accounts.google.com"]');
    const signInText = await page.locator('text=Sign in').count();
    return googleLinks.length > 0 || signInText > 0;
  } catch (err) { return false; }
}

async function isFieldRequired(container) {
  try {
    const reqInput = await container.$('input[required], textarea[required], select[required]');
    if (reqInput) return true;
    const aria = await container.$('[aria-required="true"]');
    if (aria) return true;
    const requiredText = await container.locator('text=Required').count();
    if (requiredText > 0) return true;
    const labelEl = await container.$('label, div[role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle');
    if (labelEl) {
      const t = (await labelEl.innerText()).trim().toLowerCase();
      if (t.includes('*') || t.includes('required')) return true;
    }
    return false;
  } catch (e) { return false; }
}

async function extractInputAttributes(container) {
  try {
    const input = await container.$('input, textarea, select, [role="textbox"], [contenteditable="true"]');
    if (!input) return { name: '', id: '', placeholder: '', aria: '', type: '', element: null };
    const name = (await input.getAttribute('name')) || '';
    const id = (await input.getAttribute('id')) || '';
    const ph = (await input.getAttribute('placeholder')) || '';
    const aria = (await input.getAttribute('aria-label')) || '';
    const inputType = (await input.getAttribute('type')) || (await input.evaluate(el => el.tagName.toLowerCase()));
    return { name, id, placeholder: ph, aria, type: inputType, element: input };
  } catch (e) {
    return { name: '', id: '', placeholder: '', aria: '', type: '', element: null };
  }
}

async function buildCompositeLabel(container) {
  try {
    const labelSelectors = ['div[role="heading"]', '.freebirdFormviewerComponentsQuestionBaseTitle', '.doc1P', '.quantumWizFormtitleContent', 'label'];
    let label = '';
    for (const ls of labelSelectors) {
      try {
        const el = await container.$(ls);
        if (el) {
          const t = (await el.innerText()).trim();
          if (t) { label = t; break; }
        }
      } catch (e) {}
    }
    if (!label) {
      const txt = (await container.innerText()).trim();
      label = txt.split('\n')[0] || '';
    }

    const attrs = await extractInputAttributes(container);
    const attrText = [attrs.name, attrs.id, attrs.placeholder, attrs.aria, attrs.type].filter(Boolean).join(' ');
    return { composite: `${label} ${attrText}`.trim(), attrs };
  } catch (e) {
    return { composite: '', attrs: {} };
  }
}

function splitName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] };
}

function normalizeString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

async function setInputValue(elHandle, value) {
  try {
    await elHandle.evaluate((el, v) => {
      if ('value' in el) el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      try { el.blur(); } catch (e) {}
    }, value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get label-like text for an option/radio element using multiple fallbacks:
 * - element.innerText
 * - closest <label> innerText
 * - aria-label attribute
 * - sibling text nodes
 */
async function getOptionLabelText(optionElement) {
  try {
    let t = (await optionElement.innerText())?.trim() || '';
    if (t) return t;
    const aria = (await optionElement.getAttribute('aria-label')) || '';
    if (aria) return aria.trim();

    // try to find a parent label or nearest label element
    const labelText = await optionElement.evaluate((el) => {
      // look for nearest label
      let node = el;
      while (node && node.parentElement) {
        const lbl = node.parentElement.querySelector('label');
        if (lbl && lbl.innerText && lbl.innerText.trim()) return lbl.innerText.trim();
        node = node.parentElement;
      }
      return '';
    });
    if (labelText) return labelText;

    // fallback: try textContent of parent
    const parentText = (await optionElement.evaluate(el => (el.parentElement?.innerText || '')?.trim())) || '';
    return parentText;
  } catch (e) {
    return '';
  }
}

/**
 * chooseRadioOrOptions improved:
 * - prefer exact whole-word match (word boundaries) so 'Male' won't match 'Other: Male'
 * - prefer exact label equality, then exact whole-word, then token fuzzy but skip 'other' options unless desired includes 'other'
 */
async function chooseRadioOrOptions(radios, desiredValue) {
  const desired = normalizeString(desiredValue).toLowerCase();
  const items = [];
  for (const r of radios) {
    const labelText = (await getOptionLabelText(r)) || '';
    items.push({ element: r, label: labelText.trim() });
  }

  // 1) exact equality
  let exact = items.find(it => it.label.toLowerCase() === desired);
  if (exact) {
    await exact.element.click().catch(()=>{});
    return { clickedLabel: exact.label, usedOtherInput: false };
  }

  // 2) exact whole-word match (word boundaries) - e.g., 'Male' inside 'Other: Male' will NOT match because of word boundary logic
  const wholeWord = items.find(it => {
    const low = it.label.toLowerCase();
    // regex for whole word; escape desired
    const escaped = desired.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    return re.test(low) && !/^\s*other\b/.test(low); // skip if label starts with 'other'
  });
  if (wholeWord) {
    await wholeWord.element.click().catch(()=>{});
    return { clickedLabel: wholeWord.label, usedOtherInput: false };
  }

  // 3) prefer token fuzzy but skip options that START with 'other' unless desired contains 'other'
  for (const it of items) {
    const low = it.label.toLowerCase();
    if (low.startsWith('other') && !desired.includes('other')) continue;
    if (mappingService.choiceMatches(it.label, desiredValue)) {
      await it.element.click().catch(()=>{});
      return { clickedLabel: it.label, usedOtherInput: false };
    }
  }

  // 4) if there is an 'Other' option and desired is not empty, click it and attempt to fill nearby text input
  const other = items.find(it => /^\s*other\b/i.test(it.label));
  if (other && desired) {
    await other.element.click().catch(()=>{});
    try {
      const parentHandle = await other.element.evaluateHandle(el => el.closest('div') || el.parentElement);
      if (parentHandle) {
        const otherInput = await parentHandle.asElement().$('input[type="text"], input[type="email"], textarea, [contenteditable="true"]');
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
    const text = (await opt.textContent())?.trim() || '';
    if (text.toLowerCase() === desired) {
      const valAttr = await opt.getAttribute('value');
      await selectEl.selectOption(valAttr || { label: text }).catch(()=>{});
      return { chosen: text, exact: true };
    }
  }
  for (const opt of options) {
    const text = (await opt.textContent())?.trim() || '';
    if (mappingService.choiceMatches(text, desiredValue)) {
      const valAttr = await opt.getAttribute('value');
      await selectEl.selectOption(valAttr || { label: text }).catch(()=>{});
      return { chosen: text, exact: false };
    }
  }
  await selectEl.selectOption({ label: desiredValue }).catch(()=>{});
  return null;
}

/**
 * Attempt to fill a date field inside a container.
 * Tries:
 *  - input[type="date"] with ISO yyyy-mm-dd
 *  - input[type="text"] or placeholder that looks like dd/mm/yyyy or dd-mm-yyyy: set dd-mm-yyyy
 *  - direct evaluate to set value + dispatch events
 */
async function fillDateInContainer(container, rawValue) {
  const val = normalizeString(rawValue);
  if (!val) return false;

  // helper to attempt formats
  function toISO(d) {
    // accept yyyy-mm-dd or dd-mm-yyyy input
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    // try Date.parse fallback
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
    // prefer input[type="date"]
    const dateInput = await container.$('input[type="date"]');
    if (dateInput) {
      const iso = toISO(val);
      if (iso) {
        await setInputValue(dateInput, iso);
        return true;
      }
    }

    // find any visible text input or input with placeholder like dd-mm-yyyy
    const textLike = await container.$('input[type="text"], input[type="tel"], input[type="email"], input:not([type])');
    if (textLike) {
      // try dd-mm-yyyy visible format first if placeholder suggests, else ISO
      const ph = (await textLike.getAttribute('placeholder')) || '';
      const isoCandidate = toISO(val);
      const ddmm = isoCandidate ? isoCandidate.split('-').slice().reverse().join('-') : null; // yyyy-mm-dd -> dd-mm-yyyy
      // decide which to set
      let toSet = isoCandidate;
      if (ph && /dd|mm|yyyy/.test(ph.toLowerCase()) && ddmm) {
        // placeholder expects dd-mm-yyyy visible; set dd-mm-yyyy
        toSet = ddmm;
      }
      if (toSet) {
        await setInputValue(textLike, toSet);
        return true;
      }
    }

    // as a final fallback, try any input inside the container and set a dd-mm-yyyy or iso form
    const anyInput = await container.$('input, textarea, [contenteditable="true"]');
    if (anyInput) {
      const isoCandidate = toISO(val);
      const ddmm = isoCandidate ? isoCandidate.split('-').slice().reverse().join('-') : val;
      const tryOrder = [isoCandidate, ddmm, val].filter(Boolean);
      for (const candidate of tryOrder) {
        try {
          await setInputValue(anyInput, candidate);
          return true;
        } catch (e) {}
      }
    }

    // no date control found
    return false;
  } catch (e) {
    return false;
  }
}

async function performFilling(page, userProfile, sessionId) {
  const fillResults = [];
  const unmatchedMandatoryFields = [];
  const unmatchedOptionalFields = [];

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
    containers = await page.$$(':scope div:has(input, textarea, select, [role="textbox"])');
  }

  for (const c of containers) {
    const { composite, attrs } = await buildCompositeLabel(c);
    if (!composite) continue;

    const required = await isFieldRequired(c);

    // elements in container
    const textInput = await c.$('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"], textarea').catch(()=>null);
    const contentable = await c.$('[role="textbox"], [contenteditable="true"]').catch(()=>null);
    const selectEl = await c.$('select').catch(()=>null);
    const fileInput = await c.$('input[type="file"]').catch(()=>null);
    const radios = await c.$$('[role="radio"], .quantumWizTogglePaperRadioContainer, .freebirdFormviewerComponentsQuestionRadioChoice').catch(()=>[]);
    const checks = await c.$$('[role="checkbox"], .quantumWizTogglePapercheckboxInnerBox, .freebirdFormviewerComponentsQuestionCheckboxChoice').catch(()=>[]);

    // try direct mapping via input name/id/placeholder/aria
    const nameTokens = [attrs.name, attrs.id, attrs.placeholder, attrs.aria].filter(Boolean).map(s => String(s).toLowerCase());
    let mapped = null;
    for (const t of nameTokens) {
      const nt = t.replace(/[^a-z0-9]/g, '');
      const byAlias = mappingService.FIELD_ALIASES?.[nt] || null;
      if (byAlias) { mapped = byAlias; break; }
      for (const k of Object.keys(mappingService.KEYWORD_MAP)) {
        if (k.toLowerCase() === nt) { mapped = k; break; }
      }
      if (mapped) break;
    }

    if (!mapped) mapped = mappingService.findMatch(composite);

    if (mapped === 'phone' && /alternate|alt|secondary|other/i.test(composite)) {
      mapped = 'alternatePhone';
    }

    console.log(`[autofill:${sessionId}] composite="${composite}" -> mapped="${mapped}" required=${required} attrs=${JSON.stringify(attrs)}`);

    if (!mapped) {
      const entry = { label: composite, reason: 'no mapping' };
      if (required) unmatchedMandatoryFields.push(entry); else unmatchedOptionalFields.push(entry);
      continue;
    }

    // enforce strict rules for rknecID and alternatePhone (no fallback)
    if (mapped === 'rknecID' && (!userProfile.rknecID || String(userProfile.rknecID).trim() === '')) {
      const entry = { label: composite, mapped, reason: 'rknec email not present in DB' };
      if (required) unmatchedMandatoryFields.push(entry); else unmatchedOptionalFields.push(entry);
      continue;
    }
    if (mapped === 'alternatePhone' && (!userProfile.alternatePhone || String(userProfile.alternatePhone).trim() === '')) {
      const entry = { label: composite, mapped, reason: 'alternate phone not present in DB' };
      if (required) unmatchedMandatoryFields.push(entry); else unmatchedOptionalFields.push(entry);
      continue;
    }

    // get user value
    let userValue = userProfile[mapped];
    if (!userValue && mapped === 'rknecID') userValue = userProfile.rknecID;
    if (!userValue && (mapped === 'firstName' || mapped === 'middleName' || mapped === 'lastName')) {
      const full = userProfile.fullName || `${userProfile.firstName || ''} ${userProfile.middleName || ''} ${userProfile.lastName || ''}`;
      const parts = splitName(full);
      userValue = parts[mapped] || null;
    }

    if (userValue === undefined || userValue === null || String(userValue).trim() === '') {
      const entry = { label: composite, mapped, reason: 'no user data' };
      if (required) unmatchedMandatoryFields.push(entry); else unmatchedOptionalFields.push(entry);
      continue;
    }

    const valueStr = Array.isArray(userValue) ? userValue.join(', ') : String(userValue);

    let didFill = false;
    try {
      // Special handling for DOB
      if (mapped === 'dob') {
        const ok = await fillDateInContainer(c, valueStr);
        if (ok) {
          didFill = true;
          fillResults.push({ label: composite, mapped, method: 'date', value: valueStr });
        } else {
          // if not filled by date logic, continue to generic handlers below
        }
      }

      // TEXT inputs
      if (!didFill && textInput) {
        const typeAttr = (await textInput.getAttribute('type')) || '';
        const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(valueStr);
        // general set
        const ok = await setInputValue(textInput, valueStr);
        if (ok) {
          didFill = true;
          fillResults.push({ label: composite, mapped, method: 'text', value: valueStr });
        } else {
          await textInput.fill(valueStr).catch(async () => { await textInput.type(valueStr); });
          didFill = true;
          fillResults.push({ label: composite, mapped, method: 'text-fallback', value: valueStr });
        }
      }

      // contenteditable
      if (!didFill && contentable) {
        await setInputValue(contentable, valueStr);
        didFill = true;
        fillResults.push({ label: composite, mapped, method: 'contenteditable', value: valueStr });
      }

      // select
      if (!didFill && selectEl) {
        const selRes = await chooseSelectOption(selectEl, valueStr);
        if (selRes) {
          didFill = true;
          fillResults.push({ label: composite, mapped, method: 'select', chosen: selRes.chosen, exact: !!selRes.exact });
        }
      }

      // radios
      if (!didFill && radios && radios.length) {
        const chosen = await chooseRadioOrOptions(radios, valueStr);
        if (chosen) {
          didFill = true;
          fillResults.push({ label: composite, mapped, method: 'radio', chosen: chosen.clickedLabel, usedOtherInput: chosen.usedOtherInput });
        }
      }

      // checkboxes
      if (!didFill && checks && checks.length) {
        for (const cb of checks) {
          const cText = (await cb.innerText()).trim() || (await cb.getAttribute('aria-label') || '').trim();
          if (mappingService.choiceMatches(cText, valueStr)) {
            await cb.click().catch(()=>{});
            didFill = true;
            fillResults.push({ label: composite, mapped, method: 'checkbox', matched: cText });
            break;
          }
        }
      }

      if (!didFill) {
        const entry = { label: composite, mapped, reason: 'no input matched' };
        if (required) unmatchedMandatoryFields.push(entry); else unmatchedOptionalFields.push(entry);
      }
    } catch (err) {
      console.warn(`[autofill:${sessionId}] error filling "${composite}":`, err?.message || err);
      const entry = { label: composite, mapped, reason: `fill-error:${err?.message || err}` };
      if (required) unmatchedMandatoryFields.push(entry); else unmatchedOptionalFields.push(entry);
    }
  }

  return { fieldsFilled: fillResults, unmatchedMandatoryFields, unmatchedOptionalFields };
}

export async function startAutofill({ userKey, formUrl, userProfile, headless = false } = {}) {
  if (!userKey) throw new Error('userKey required');
  if (!formUrl) throw new Error('formUrl required');
  if (!userProfile) throw new Error('userProfile required');

  const sessionId = crypto.randomUUID();
  const { context, page, userDir } = await getPersistentContext(userKey, { headless });

  let isClosed = false;
  page.on('close', () => { isClosed = true; });

  activeSessions.set(sessionId, { userKey, context, page, createdAt: Date.now(), isClosed, userDir });

  await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);

  const needsLogin = await detectGoogleSignInRequired(page);
  if (needsLogin) {
    console.log(`[autofill:${sessionId}] Google login required for userKey=${userKey}.`);
    return {
      sessionId,
      needsGoogleLogin: true,
      message: 'Please sign in to Google in the opened browser and then click Continue.'
    };
  }

  const overallResults = {
    fieldsFilled: [],
    unmatchedMandatoryFields: [],
    unmatchedOptionalFields: [],
    screenshots: [],
  };

  let pageIndex = 1;

  while (true) {
    console.log(`[autofill:${sessionId}] Filling section ${pageIndex}...`);
    const result = await performFilling(page, userProfile, sessionId);

    overallResults.fieldsFilled.push(...result.fieldsFilled);
    overallResults.unmatchedMandatoryFields.push(...result.unmatchedMandatoryFields);
    overallResults.unmatchedOptionalFields.push(...result.unmatchedOptionalFields);

    const screenshotBase64 = isClosed ? null : await safeScreenshot(page);
    if (screenshotBase64) overallResults.screenshots.push({ page: pageIndex, data: screenshotBase64 });

    // --- 1️⃣ Detect Submit button ---
    const submitBtn = await page.$('text=/\\bSubmit\\b/i');
    if (submitBtn) {
      console.log(`[autofill:${sessionId}] Found Submit button — last page reached.`);
      break;
    }

    // --- 2️⃣ Detect Next/Continue button robustly ---
    let nextBtn = await page.$('text=/\\b(Next|Continue)\\b/i');

    // Fallback: find button manually if above fails
    if (!nextBtn) {
      const nextSelector = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('div[role="button"], button, span'))
          .filter(el => el.innerText && /(next|continue)/i.test(el.innerText))
          .filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        return buttons[0] || null;
      });
      if (nextSelector) nextBtn = nextSelector.asElement();
    }

    if (!nextBtn) {
      console.log(`[autofill:${sessionId}] ❌ No Next or Submit button found — stopping.`);
      break;
    }

    console.log(`[autofill:${sessionId}] Clicking Next → moving to page ${pageIndex + 1}`);
    await nextBtn.click({ delay: 100 }).catch(() => {});
    
    // --- 3️⃣ Wait for new page content to load ---
    await page.waitForFunction(
      () => {
        const spinners = document.querySelectorAll('[aria-busy="true"], [data-loading="true"]');
        return spinners.length === 0;
      },
      { timeout: 8000 }
    ).catch(() => {});

    // Give some breathing room for next fields
    await page.waitForTimeout(1200);

    pageIndex++;
  }

  const finalScreenshot = isClosed ? null : await safeScreenshot(page);

  return {
    sessionId,
    screenshotBase64: finalScreenshot,
    ...overallResults
  };
}



export async function continueAutofill(sessionId, userProfile) {
  const s = activeSessions.get(sessionId);
  if (!s) throw new Error('Session not found or expired');
  const { page } = s;
  if (!page) throw new Error('Page not available');

  const result = await performFilling(page, userProfile, sessionId);
  const screenshotBase64 = await safeScreenshot(page);
  return { sessionId, screenshotBase64, ...result };
}

export async function submitAutofill(sessionId) {
  const s = activeSessions.get(sessionId);
  if (!s) throw new Error('Session not found or expired');
  const { page, context } = s;
  if (!page || page.isClosed?.()) { activeSessions.delete(sessionId); return { success: false, reason: 'page already closed' }; }
  try {
    const xpathList = [
      "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit')]",
      "//div[@role='button' and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit')]"
    ];
    let clicked = false;
    for (const xp of xpathList) {
      const els = await page.$x(xp);
      if (els && els[0]) { await els[0].click().catch(()=>{}); clicked = true; break; }
    }
    if (!clicked) {
      const btn = await page.$('button[type="submit"], button');
      if (btn) { await btn.click().catch(()=>{}); clicked = true; }
    }
    await page.waitForTimeout(900).catch(()=>{});
    const after = await safeScreenshot(page);
    try { await context.close(); } catch (_) {}
    activeSessions.delete(sessionId);
    return { success: true, clicked, afterScreenshotBase64: after };
  } catch (err) {
    try { await context.close(); } catch (_) {}
    activeSessions.delete(sessionId);
    throw err;
  }
}

export async function cancelSession(sessionId) {
  const s = activeSessions.get(sessionId);
  if (!s) return { cancelled: false };
  const { context } = s;
  try { await context.close(); } catch (_) {}
  activeSessions.delete(sessionId);
  return { cancelled: true };
}

export { startAutofill as launchAndFillForm };
