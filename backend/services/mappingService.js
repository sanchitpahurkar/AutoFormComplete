/**
 * Core mapping logic to match Google Form question labels 
 * to known user profile fields (from MongoDB).
 * * This service uses a defined keyword map and text normalization
 * * to perform robust, flexible matching.
 */

export const KEYWORD_MAP = {
    // Basic Personal Info
    firstName: ['first name', 'given name', 'candidate name', 'your name', 'forename'],
    lastName: ['last name', 'surname', 'family name'],
    emailID: ['email', 'email address', 'e-mail id', 'personal email'], // Changed from 'email' to 'emailID' to match friend's schema
    phone: ['phone number', 'mobile number', 'contact number', 'whatsapp number', 'tel number'], // Changed from 'phoneNumber' to 'phone'
    gender: ['gender', 'sex'],
    dob: ['date of birth', 'dob'],
    rknecID: ['rknec id', 'college id', 'student id'], // Added based on friend's schema
    alternatePhone: ['alternate phone', 'secondary contact'], // Added based on friend's schema
    currentAddress: ['current address', 'local address'], // Added based on friend's schema
    permanentAddress: ['permanent address', 'home address'], // Added based on friend's schema

    // Academic/Score Info
    cgpa: ['cgpa', 'c.g.p.a.', 'cumulative grade point average', 'current cgpa'],
    activeBacklogs: ['active backlogs', 'pending backlogs', 'current backlogs'], // Added based on friend's schema
    deadBacklogs: ['dead backlogs', 'cleared backlogs', 'total backlogs'], // Added based on friend's schema
    yearOfGraduation: ['graduation year', 'year of passing', 'expected graduation'], // Renamed from passingYear
    branch: ['branch', 'department', 'discipline', 'major'],
    enrollmentNumber: ['enrollment number', 'roll number'], // Added based on friend's schema
    
    // HSC (12th) Details
    hscSchoolName: ['hsc school name', '12th school name'],
    hscBoard: ['hsc board', '12th board'],
    hscYearOfPassing: ['hsc year of passing', '12th year of passing'],
    hscPercentage: ['hsc percentage', '12th marks', 'intermediate marks'],

    // SSC (10th) Details
    sscSchoolName: ['ssc school name', '10th school name'],
    sscBoard: ['ssc board', '10th board'],
    sscYearOfPassing: ['ssc year of passing', '10th year of passing'],
    sscPercentage: ['ssc percentage', '10th marks', 'high school marks'],

    // Document/File Uploads
    resume: ['resume', 'cv upload', 'upload your resume', 'upload cv', 'resume file'],
    // Note: If friend has marksheets field, add it here too
};

/**
 * Normalizes a string by converting to lowercase, trimming whitespace, and removing punctuation.
 * This makes matching robust against casing, extra spaces, and special characters.
 * @param {string} text - The input string (e.g., a form label).
 * @returns {string} The normalized string.
 */
export function normalizeText(text) {
    if (!text) return '';
    // Remove punctuation and special characters, replace multiple spaces with single space, then trim and lowercase
    return text.toLowerCase()
               .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
               .replace(/\s{2,}/g, ' ')
               .trim();
}

/**
 * Finds the best matching DB field for a given form question label.
 * @param {string} formLabel - The text label scraped from the Google Form.
 * @returns {string | null} The matching DB field name (e.g., 'firstName') or null.
 */
export function findMatch(formLabel) {
    const normalizedLabel = normalizeText(formLabel);

    for (const [dbField, keywords] of Object.entries(KEYWORD_MAP)) {
        for (const keyword of keywords) {
            const normalizedKeyword = normalizeText(keyword);
            
            // Check if the normalized form label contains the normalized keyword
            if (normalizedLabel.includes(normalizedKeyword)) {
                return dbField;
            }
        }
    }
    return null; // No match found
}
