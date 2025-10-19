// backend/services/playwrightService.js

const playwright = require('playwright');
const { createFillPlan } = require('./mappingService');

// In-memory store for active browser sessions.
// For a production app, you might use a more robust store like Redis.
const activeSessions = {};

/**
 * Launches a browser, fills the form, and then waits.
 * @param {string} formUrl - The URL of the Google Form.
 * @param {Object} userData - The user's data from MongoDB.
 * @param {string} sessionId - A unique ID for this automation task.
 * @returns {Promise<Array>} A promise that resolves with the list of actions performed.
 */
async function startAndFillForm(formUrl, userData, sessionId) {
    // Launch browser. `headless: false` is great for debugging as it opens a real browser window.
    const browser = await playwright.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(formUrl, { waitUntil: 'networkidle' });

    // --- This is the most crucial and potentially brittle part ---
    // Finding reliable selectors for Google Forms. Inspect a real form to fine-tune these.
    // This selector targets each question's container block.
    const questionLocator = page.locator('div[role="listitem"]');
    const questionsCount = await questionLocator.count();
    
    const scrapedQuestions = [];

    for (let i = 0; i < questionsCount; i++) {
        const questionBlock = questionLocator.nth(i);
        // The question text is often in a heading role inside the block.
        const labelElement = questionBlock.locator('div[role="heading"]');
        const labelText = await labelElement.textContent();

        if (labelText) {
            scrapedQuestions.push({
                label: labelText.trim(),
                // We pass the locator for the whole block to find the input within it later
                element: questionBlock 
            });
        }
    }
    
    // Use our mapping service to get the plan
    const fillPlan = createFillPlan(scrapedQuestions, userData);

    // Execute the fill plan
    for (const action of fillPlan) {
        // Find the specific input within the question block
        const textInput = action.element.locator('input[type="text"], textarea');
        const radioGroup = action.element.locator('div[role="radiogroup"]');
        
        // Handle simple text inputs/textareas
        if (await textInput.count() > 0) {
            await textInput.fill(String(action.value));
            console.log(`Filled "${action.label}" with value "${action.value}"`);
        }
        
        // TODO: Add logic for other input types
        // else if (await radioGroup.count() > 0) {
        //     // Handle radio buttons by finding the label that matches the value
        //     await radioGroup.locator(`div[data-value="${action.value}"]`).click();
        // }
        // ... add handlers for checkboxes, dropdowns, file uploads etc.
    }

    // Store the page and browser instance so we can access it later to submit
    activeSessions[sessionId] = { page, browser };

    return fillPlan; // Return the plan so the frontend can show what was filled
}

/**
 * Finds the submit button on the stored page and clicks it.
 * @param {string} sessionId - The ID of the session to submit.
 * @returns {Promise<Object>} A promise that resolves on successful submission.
 */
async function submitFilledForm(sessionId) {
    const session = activeSessions[sessionId];
    if (!session) {
        throw new Error('Session not found or has expired.');
    }

    const { page, browser } = session;

    // A reliable way to find the submit button
    const submitButton = page.locator('div[role="button"]').filter({ hasText: "Submit" });
    
    if (await submitButton.count() > 0) {
        await submitButton.click();
        console.log(`Form for session ${sessionId} submitted.`);
    } else {
        throw new Error('Submit button not found.');
    }
    
    // Wait for a moment to ensure submission completes, then clean up.
    await page.waitForTimeout(2000); 
    await browser.close();

    // Remove the session from our in-memory store
    delete activeSessions[sessionId];

    return { success: true, message: 'Form submitted successfully.' };
}

module.exports = { startAndFillForm, submitFilledForm };