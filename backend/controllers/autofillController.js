// backend/controllers/autofillController.js

const User = require('../models/User');
const { startAndFillForm, submitFilledForm } = require('../services/playwrightService');
const crypto = require('crypto'); // Built-in Node.js module

// This function starts the process
exports.initiateAutofill = async (req, res) => {
    try {
        const { formUrl, userEmail } = req.body;

        // 1. Fetch user data from MongoDB
        const userData = await User.findOne({ email: userEmail }).lean();
        if (!userData) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 2. Generate a unique session ID for this request
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        // 3. Start the Playwright service (this will run in the background)
        const filledData = await startAndFillForm(formUrl, userData, sessionId);

        // 4. Respond to the frontend immediately with the session ID
        res.status(200).json({ 
            message: 'Form has been filled! Please review and confirm submission.',
            sessionId: sessionId,
            filledFields: filledData.map(f => f.label) // Send back what was filled
        });

    } catch (error) {
        console.error('Error during autofill initiation:', error);
        res.status(500).json({ message: 'Failed to autofill form.', error: error.message });
    }
};

// This function completes the process
exports.confirmAndSubmit = async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required.' });
        }

        const result = await submitFilledForm(sessionId);
        res.status(200).json(result);

    } catch (error) {
        console.error('Error during form submission:', error);
        res.status(500).json({ message: 'Failed to submit form.', error: error.message });
    }
};