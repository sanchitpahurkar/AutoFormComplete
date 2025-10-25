// backend/routes/autofillRoutes.js
import express from 'express';
import { start, continueAutofill, confirmSubmission, cleanup } from '../controllers/autofillController.js';

const router = express.Router();

router.post('/start', start);
router.post('/continue', continueAutofill); // user clicked Continue after manual Google sign-in
router.post('/submit', confirmSubmission);
router.post('/cleanup', cleanup);

export default router;
