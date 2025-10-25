// backend/services/mappingService.js
import Fuse from 'fuse.js';

export const KEYWORD_MAP = {
  // Personal
  firstName: ['first name', 'given name', 'fname', 'forename'],
  middleName: ['middle name', 'mid name', 'mname'],
  lastName: ['last name', 'surname', 'family name', 'lname'],
  fullName: ['full name', 'name'],
  emailID: ['email', 'email address', 'e-mail', 'personal email', 'mail'],
  phone: ['phone', 'phone number', 'mobile number', 'contact number', 'whatsapp', 'mobile'],
  alternatePhone: ['alternate phone', 'secondary contact', 'alt phone', 'other phone', 'alternate mobile', 'alternate number'],
  gender: ['gender', 'sex'],
  dob: ['date of birth', 'dob', 'birth date'],

  // College-specific
  rknecID: ['rknec', 'rknec id', 'college email', 'college mail', 'college email id', 'college id', 'rknecemail'],

  // Addresses
  currentAddress: ['current address', 'present address', 'address (current)', 'current residence', 'address now'],
  permanentAddress: ['permanent address', 'home address', 'permanent residence'],

  // Academic
  cgpa: ['cgpa', 'gpa', 'cumulative grade point average'],
  activeBacklogs: ['active backlogs', 'current backlogs', 'pending backlogs'],
  deadBacklogs: ['dead backlogs', 'cleared backlogs'],
  yearOfGraduation: ['graduation year', 'year of passing', 'expected graduation'],
  branch: ['branch', 'department', 'discipline', 'major'],
  enrollmentNumber: ['enrollment number', 'roll number'],

  // HSC / SSC
  hscPercentage: ['hsc percentage', '12th percentage', 'intermediate percentage'],
  sscPercentage: ['ssc percentage', '10th percentage', 'matric percentage'],

  // Documents
  resume: ['resume', 'cv', 'upload resume', 'attach resume', 'upload cv'],
  marksheetPaths: ['marksheets', 'marksheet', 'upload marksheets', 'transcripts', 'academic documents'],
};

const FIELD_ALIASES = {
  // common input name -> userProfile key
  rknecemail: 'rknecID',
  rknecid: 'rknecID',
  personalemail: 'emailID',
  email: 'emailID',
  phone: 'phone',
  alternatephone: 'alternatePhone',
  middlename: 'middleName',
  firstname: 'firstName',
  lastname: 'lastName',
  currentaddress: 'currentAddress',
  permanentaddress: 'permanentAddress',
  dob: 'dob',
  gender: 'gender'
};

function normalize(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const entries = Object.entries(KEYWORD_MAP).map(([key, phrases]) => ({
  key,
  combined: (Array.isArray(phrases) ? phrases : [phrases]).map(normalize).join(' ')
}));

const fuse = new Fuse(entries, {
  keys: ['combined'],
  threshold: 0.48,
  includeScore: true
});

/**
 * If the normalized token (from name/id/placeholder) directly matches a known alias
 * or directly matches a user-facing key in KEYWORD_MAP, return that key immediately.
 */
function matchByFieldName(normalizedLabel) {
  if (!normalizedLabel) return null;
  // direct alias
  if (FIELD_ALIASES[normalizedLabel]) return FIELD_ALIASES[normalizedLabel];
  // direct key match (e.g., input name is "alternatePhone")
  for (const key of Object.keys(KEYWORD_MAP)) {
    if (key.toLowerCase() === normalizedLabel) return key;
  }
  return null;
}

export function findMatch(label) {
  if (!label) return null;
  const n = normalize(label);

  // If label contains multiple tokens, check each token for exact alias/key match.
  const tokens = n.split(' ').filter(Boolean);
  for (const t of tokens) {
    const byName = matchByFieldName(t);
    if (byName) return byName;
  }

  // Also check whole normalized label
  const byWhole = matchByFieldName(n);
  if (byWhole) return byWhole;

  // Quick substring / exact phrase checks
  for (const [k, phrases] of Object.entries(KEYWORD_MAP)) {
    for (const p of (Array.isArray(phrases) ? phrases : [phrases])) {
      const np = normalize(p);
      if (!np) continue;
      if (n.includes(np) || np.includes(n)) return k;
    }
  }

  // Fuzzy search with fuse
  const results = fuse.search(n);
  if (results.length > 0 && typeof results[0].score === 'number' && results[0].score <= 0.48) {
    return results[0].item.key;
  }

  // Token overlap fallback
  if (results.length > 0) {
    const candidate = results[0].item.combined || '';
    const candTokens = new Set(candidate.split(' ').filter(Boolean));
    let common = 0;
    for (const t of tokens) if (candTokens.has(t)) common++;
    if (common >= 1) return results[0].item.key;
  }

  return null;
}

export function choiceMatches(optionLabel = '', desiredValue = '') {
  const a = normalize(optionLabel);
  const b = normalize(desiredValue);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const at = new Set(a.split(' ').filter(Boolean));
  const bt = new Set(b.split(' ').filter(Boolean));
  let common = 0;
  for (const t of at) if (bt.has(t)) common++;
  return common >= 1;
}

export default {
  findMatch,
  choiceMatches,
  KEYWORD_MAP,
  FIELD_ALIASES
};
