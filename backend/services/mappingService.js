// backend/services/mappingService.js

const Fuse = require('fuse.js');

/**
 * A dictionary that maps your database field names to an array of
 * possible keywords or phrases that might appear in a form.
 */
const keywordMap = {
    firstName: ['first name', 'given name', 'forename'],
    lastName: ['last name', 'surname', 'family name'],
    email: ['email', 'email address', 'e-mail'],
    phoneNumber: ['phone', 'mobile number', 'contact number'],
    cgpa: ['cgpa', 'c.g.p.a.', 'cumulative grade point average', 'current gpa'],
    percentage10th: ['10th percentage', 'ssc percentage', 'matriculation percentage'],
    percentage12th: ['12th percentage', 'hsc percentage', 'intermediate percentage'],
    resumeUrl: ['resume', 'cv', 'upload resume', 'attach cv'],
    // ... add mappings for every field in your User model
};

/**
 * This is the core mapping function.
 * It takes the questions scraped from the form and the user's data,
 * and returns a "fill plan" detailing which form element gets which value.
 * * @param {Array<Object>} scrapedQuestions - Array of objects like [{ label: 'First Name', element: PlaywrightLocator }]
 * @param {Object} userData - The user's data object from MongoDB.
 * @returns {Array<Object>} An array of actions to perform, e.g., [{ element: PlaywrightLocator, value: 'John' }]
 */
const createFillPlan = (scrapedQuestions, userData) => {
    const fillPlan = [];

    // Create a searchable list from our keywordMap keys
    const dbFields = Object.keys(keywordMap);
    
    const fuse = new Fuse(dbFields, {
        includeScore: true,
        // Don't match too loosely. A lower threshold is stricter.
        threshold: 0.5 
    });

    for (const question of scrapedQuestions) {
        // Normalize the question label for better matching
        const normalizedLabel = question.label.toLowerCase().trim();

        // Search for the best matching database field for the current question label
        const results = fuse.search(normalizedLabel);

        if (results.length > 0) {
            const bestMatch = results[0];
            const dbKey = bestMatch.item; // e.g., 'firstName'
            const confidence = bestMatch.score; // Lower score is better

            console.log(`Mapping form label "${question.label}" to database field "${dbKey}" with score: ${confidence}`);

            // If we have a reasonably confident match and the user has data for that field
            if (confidence < 0.5 && userData[dbKey]) {
                fillPlan.push({
                    element: question.element, // The Playwright locator for the input field
                    value: userData[dbKey],
                    label: question.label
                });
            }
        }
    }

    return fillPlan;
};

module.exports = { createFillPlan };