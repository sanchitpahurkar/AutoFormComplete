import User from '../models/userSchema.js'; // <-- CORRECTED PATH & FILENAME
import * as playwrightService from '../services/playwrightService.js';
// We import the active sessions map exported by the service to manage browser instances
const activeBrowserSessions = playwrightService.activeBrowserSessions;

/**
 * Initiates the autofill process: fetches user data, starts Playwright, and holds the session.
 */
export const startAutofill = async (req, res) => {
    const { formLink, userEmail } = req.body;

    if (!formLink || !userEmail) {
        return res.status(400).json({ message: 'Missing form link or user email.' });
    }

    try {
        // 1. Fetch user data from MongoDB using the email as the key
        const userData = await User.findOne({ emailID: userEmail }); // <-- Using emailID field as key
        
        if (!userData) {
            return res.status(404).json({ message: 'User profile not found. Please fill out your profile first.' });
        }

        // 2. Check for existing active session for this user and cancel it if found
        if (activeBrowserSessions[userEmail]) {
            console.log(`Closing existing session for ${userEmail}.`);
            await activeBrowserSessions[userEmail].cancel(); 
            delete activeBrowserSessions[userEmail];
        }

        // 3. Start Playwright automation (non-blocking)
        const sessionPromises = await playwrightService.fillForm(formLink, userData.toObject(), userEmail);

        // 4. Store session resolvers/cleaners
        activeBrowserSessions[userEmail] = {
            submitResolver: sessionPromises.submitResolver,
            cancel: sessionPromises.cancel
        };

        // 5. Wait for the form to be filled (Playwright script completes all filling actions)
        await sessionPromises.formFilledPromise;
        
        // 6. Respond to the frontend: The form is filled and awaiting submission confirmation
        res.status(200).json({ message: 'Form filled successfully. Awaiting user confirmation.' });

    } catch (error) {
        console.error('Error starting autofill process:', error.message);
        
        // Clean up session if an error occurred during launch/fill
        if (activeBrowserSessions[userEmail]) {
            await activeBrowserSessions[userEmail].cancel();
            delete activeBrowserSessions[userEmail];
        }
        res.status(500).json({ message: 'Autofill failed due to a server error.', error: error.message });
    }
};

/**
 * Receives confirmation from the frontend and triggers the final submission action in Playwright.
 */
export const confirmSubmission = async (req, res) => {
    const { userEmail } = req.body;

    const session = activeBrowserSessions[userEmail];

    if (!session) {
        return res.status(404).json({ message: 'No active form session found for this user.' });
    }

    try {
        // 1. Trigger the final action (submission click and browser close)
        console.log(`User ${userEmail} confirmed submission.`);
        
        // This function calls the submitResolver and cleans up the session map internally.
        const success = await playwrightService.submitForm(userEmail); 
        
        if (success) {
            // 2. Clean up the local reference after successful submission
            delete activeBrowserSessions[userEmail];
            res.status(200).json({ message: 'Form submission completed.' });
        } else {
            res.status(500).json({ message: 'Submission failed or session was already closed.' });
        }

    } catch (error) {
        console.error('Error during form submission:', error.message);
        
        // Ensure cleanup on submission error
        if (activeBrowserSessions[userEmail]) {
            await activeBrowserSessions[userEmail].cancel();
            delete activeBrowserSessions[userEmail];
        }
        res.status(500).json({ message: 'Submission failed.', error: error.message });
    }
};
