import express from 'express';
import { startAutofill, confirmSubmission } from '../controllers/autofillController.js';

const router = express.Router();

// POST /api/autofill - Starts the Playwright process and fills the form
router.post('/autofill', startAutofill);

// POST /api/autofill/submit - Receives confirmation from the user to click the submit button
router.post('/autofill/submit', confirmSubmission);

export default router;