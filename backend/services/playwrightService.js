import * as playwright from 'playwright';
import * as mappingService from './mappingService.js'; // Ensure .js extension is present

// User agent to make the automated browser look like a standard user
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';

// Map to hold active browser sessions, keyed by user email. This is managed by the controller.
export const activeBrowserSessions = {};

// --- Core Google Form Selectors ---
// These selectors are critical for reliably identifying elements in a Google Form.
const SELECTORS = {
    // Selects the container for all question items
    QUESTION_CONTAINER: 'div[role="listitem"]',
    
    // Selects the main text label for the question (usually a mandatory/non-input element)
    QUESTION_LABEL: '.doc1P', // A common class for the label text, simplified
    
    // Selectors for different input types (relative to the QUESTION_CONTAINER)
    TEXT_INPUT: 'input[type="text"], input[type="email"], input[type="tel"], textarea',
    NUMBER_INPUT: 'input[type="number"]',
    SUBMIT_BUTTON: 'div[role="button"]:has-text("Submit")'
};

/**
 * Executes the Playwright script to fill the Google Form.
 * @param {string} formUrl - The URL of the Google Form.
 * @param {object} userData - The user's profile data from MongoDB.
 * @returns {object} Session promises for controller management.
 */
export async function fillForm(formUrl, userData) {
    let browser, page;
    
    // 1. Setup Submission Promises (for pausing/resuming execution)
    let submitResolver;
    const submissionPromise = new Promise(resolve => { submitResolver = resolve; });
    
    let filledResolver;
    const formFilledPromise = new Promise(resolve => { filledResolver = resolve; });

    // Helper function to close the browser safely and remove session
    const cleanupSession = async (email) => {
        if (browser) {
            await browser.close().catch(e => console.error('Error closing browser:', e));
        }
        delete activeBrowserSessions[email];
    };
    
    const session = { 
        browser: null, 
        submissionPromise, 
        formFilledPromise, 
        submitResolver: async () => { 
            // Trigger the submission action in the browser
            await page.locator(SELECTORS.SUBMIT_BUTTON).click().catch(() => console.log('Submit button not found or already clicked.'));
            submitResolver(); 
            // Submission is complete, close the browser immediately
            await cleanupSession(userData.emailID);
        },
        // Function to close the browser if user cancels or error occurs
        cancel: async () => {
            console.log(`Cancelling session for ${userData.emailID}. Closing browser.`);
            await cleanupSession(userData.emailID);
            // Must resolve the outer promise to prevent hanging
            submitResolver(); 
        }
    };

    try {
        // 2. Launch Browser (using Chromium and showing UI for confirmation)
        browser = await playwright.chromium.launch({ 
            headless: false, 
            args: ['--start-maximized'] // Start maximized for better visibility
        });
        session.browser = browser; // Attach to session for external control

        page = await browser.newPage({ 
            userAgent: USER_AGENT,
            viewport: null // Inherit full screen size
        });

        console.log(`Navigating to form: ${formUrl}`);
        await page.goto(formUrl);

        // Optional: Wait for the main content to load
        await page.waitForSelector(SELECTORS.QUESTION_CONTAINER, { timeout: 15000 });

        // 3. Scrape, Map, and Fill
        const questionContainers = await page.locator(SELECTORS.QUESTION_CONTAINER).all();
        console.log(`Found ${questionContainers.length} potential questions.`);
        
        let fieldsFilled = 0;

        for (const container of questionContainers) {
            // Get the Question Label Text
            const labelElement = container.locator(SELECTORS.QUESTION_LABEL).first();
            const formLabel = await labelElement.textContent().catch(() => ''); 
            
            if (!formLabel) continue;

            // Use the mapping service to find the corresponding database field
            const dbField = mappingService.findMatch(formLabel);
            
            // Check if we found a match AND we have data for that field
            if (dbField && userData[dbField]) {
                const valueToFill = String(userData[dbField]);
                
                // --- Simple Logic for Text/Number/Email Fields ---
                
                // Playwright is smart enough to handle text, email, number in one locator
                const inputLocator = container.locator(SELECTORS.TEXT_INPUT).first();

                const isInputVisible = await inputLocator.isVisible().catch(() => false);
                
                if (isInputVisible) {
                    // Check if the input element is a file upload type (since we are using a generic text input selector)
                    const inputType = await inputLocator.getAttribute('type').catch(() => null);
                    
                    if (dbField === 'resume' || dbField === 'marksheets') { 
                        // --- FILE UPLOAD LOGIC (Task 4) ---
                        // NOTE: This assumes the valueToFill is a path accessible on the server.
                        
                        // We need a specific file input selector, Google Forms use buttons that trigger file inputs
                        // This selector is tricky, using a generic one for now.
                        const fileInput = container.locator('input[type="file"]').first();

                        if (await fileInput.isVisible().catch(() => false)) {
                            console.log(`📎 Uploading file for "${formLabel}" using path: "${valueToFill}"`);
                            // Playwright sets the file path, simulating a user selection
                            await fileInput.setInputFiles(valueToFill); 
                            fieldsFilled++;
                        } else {
                             console.log(`⚠️ File input found for "${formLabel}" but not visible or accessible.`);
                        }

                    } else if (inputType !== 'file') {
                        // --- TEXT FIELD LOGIC ---
                        console.log(`✅ Filling field: "${formLabel}" with value: "${valueToFill}"`);
                        await inputLocator.fill(valueToFill);
                        fieldsFilled++;
                    }
                } else {
                    console.log(`⚠️ Match found for "${formLabel}" (${dbField}) but input field not visible or found.`);
                }

                // TODO: Add complex logic for dropdowns, radio buttons, and checkboxes (Task 4)
                
            }
        }

        console.log(`Autofill complete. Total fields filled: ${fieldsFilled}. Waiting for user confirmation...`);

        // 4. Signal to the controller (and frontend) that filling is complete
        filledResolver(true);

        // 5. Wait for the submission signal from the controller/cleanup session if cancelled
        await submissionPromise;

        return { formFilledPromise, submitResolver: session.submitResolver, cancel: session.cancel };

    } catch (error) {
        console.error('Playwright Automation Error:', error);
        
        // Clean up session if an error occurred during launch/fill
        await cleanupSession(userData.emailID);
        
        // Reject the outer promise to notify the caller (controller)
        throw new Error(`Autofill failed: ${error.message}`);
    }
}

/**
 * Executes the final submission click and resolves the submission promise.
 * The heavy lifting (clicking submit, closing browser) is in the session.submitResolver.
 */
export async function submitForm(userEmail) {
    const session = activeBrowserSessions[userEmail];
    if (session && session.submitResolver) {
        // Call the submitResolver defined in fillForm to execute the final steps
        await session.submitResolver(); 
        // The cleanup is handled inside the submitResolver
        return true;
    }
    return false;
}
