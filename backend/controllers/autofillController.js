// backend/controllers/autofillController.js
import User from '../models/User.js';
import * as playwrightService from '../services/playwrightService.js';

export async function start(req, res) {
  try {
    const { formUrl, userId, headless = false } = req.body;
    if (!formUrl || !userId) return res.status(400).json({ error: 'formUrl and userId required' });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userKey = user.clerkId || user._id;
    const result = await playwrightService.startAutofill({ userKey, formUrl, userProfile: user, headless });
    return res.json(result);
  } catch (err) {
    console.error('autofill start error', err);
    return res.status(500).json({ error: err.message, stack: err.stack ? String(err.stack) : undefined });
  }
}

export async function continueAutofill(req, res) {
  try {
    const { sessionId, userId } = req.body;
    if (!sessionId || !userId) return res.status(400).json({ error: 'sessionId and userId required' });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await playwrightService.continueAutofill(sessionId, user);
    return res.json(result);
  } catch (err) {
    console.error('autofill continue error', err);
    return res.status(500).json({ error: err.message, stack: err.stack ? String(err.stack) : undefined });
  }
}

export async function confirmSubmission(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const result = await playwrightService.submitAutofill(sessionId);
    return res.json(result);
  } catch (err) {
    console.error('autofill submit error', err);
    return res.status(500).json({ error: err.message, stack: err.stack ? String(err.stack) : undefined });
  }
}

/**
 * cleanup - cancel/close the browser session associated with sessionId
 * exported because routes/autofillRoutes.js imports it
 */
export async function cleanup(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const result = await playwrightService.cancelSession(sessionId);
    return res.json(result);
  } catch (err) {
    console.error('autofill cleanup error', err);
    return res.status(500).json({ error: err.message, stack: err.stack ? String(err.stack) : undefined });
  }
}
