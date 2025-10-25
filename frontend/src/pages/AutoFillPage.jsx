// frontend/src/pages/AutofillPage.jsx
import React, { useState, useEffect } from 'react';
import useApi from '../services/api';
import { useUser } from '@clerk/clerk-react';

const statusText = {
  ready: 'Ready',
  filling: 'Opening browser / filling',
  needsGoogleLogin: 'Waiting for Google sign-in',
  filled: 'Form filled (review)',
  submitting: 'Submitting form',
  error: 'Error'
};

const AutofillPage = () => {
  const api = useApi();
  const { user, isSignedIn, isLoaded } = useUser();

  const [formLink, setFormLink] = useState('');
  const [status, setStatus] = useState('ready'); // ready | filling | needsGoogleLogin | filled | submitting | error
  const [sessionId, setSessionId] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [screenshot, setScreenshot] = useState(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      try {
        const resp = await api.getUserProfile();
        setUserProfile(resp.data.user);
      } catch (err) {
        console.log('No saved profile found yet');
      }
    })();
  }, [isLoaded, isSignedIn]);

  const resetUI = () => {
    setFormLink('');
    setSessionId(null);
    setDiagnostics(null);
    setScreenshot(null);
    setStatus('ready');
  };

  const handleStartAutofill = async (e) => {
    e && e.preventDefault();
    if (!formLink) return alert('Paste Google Form link first.');
    if (!userProfile || !userProfile._id) return alert('Save your profile first.');

    setStatus('filling');
    try {
      const resp = await api.startAutofill({ formUrl: formLink, userId: userProfile._id });
      const data = resp.data;
      if (data.needsGoogleLogin) {
        setSessionId(data.sessionId);
        setStatus('needsGoogleLogin');
        alert('A browser window has opened. Please sign into Google in that window and then click Continue below.');
        return;
      }

      setDiagnostics({
        filled: data.fieldsFilled || [],
        unmatchedMandatoryFields: data.unmatchedMandatoryFields || [],
        unmatchedOptionalFields: data.unmatchedOptionalFields || []
      });
      if (data.screenshotBase64) setScreenshot(data.screenshotBase64);
      setSessionId(data.sessionId);
      setStatus('filled');

      // prompt submit
      const ok = window.confirm('Form filled. Submit now?');
      if (ok) await doSubmit(data.sessionId);
      else setStatus('ready');

    } catch (err) {
      console.error('Autofill error', err);
      setStatus('error');
      alert('Autofill failed: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleContinueAfterSignIn = async () => {
    if (!sessionId) return alert('No session to continue.');
    if (!userProfile || !userProfile._id) return alert('Profile required.');

    setStatus('filling');
    try {
      const resp = await api.continueAutofill(sessionId, userProfile._id);
      const data = resp.data;
      setDiagnostics({
        filled: data.fieldsFilled || [],
        unmatchedMandatoryFields: data.unmatchedMandatoryFields || [],
        unmatchedOptionalFields: data.unmatchedOptionalFields || []
      });
      if (data.screenshotBase64) setScreenshot(data.screenshotBase64);
      setStatus('filled');

      if ((data.unmatchedMandatoryFields || []).length > 0) {
        alert('Some required fields were not found in your profile. Please review the list on the page.');
      }

      const ok = window.confirm('Form filled after sign-in. Submit now?');
      if (ok) await doSubmit(data.sessionId);
      else setStatus('ready');
    } catch (err) {
      console.error('Continue autofill error', err);
      setStatus('error');
      const msg = err?.response?.data?.error || err.message;
      if (/Session not found/i.test(msg) || err.response?.status === 404) {
        alert('Session not found or expired. Please start a new autofill session.');
        resetUI();
        return;
      }
      alert('Continue failed: ' + msg);
    }
  };

  const doSubmit = async (sid) => {
    try {
      setStatus('submitting');
      await api.confirmSubmission({ sessionId: sid });
      alert('Submitted successfully!');
      resetUI();
    } catch (err) {
      console.error('Submit error', err);
      alert('Submit failed: ' + (err?.response?.data?.error || err.message));
      setStatus('error');
    }
  };

  const handleCancelSession = async () => {
    if (!sessionId) return;
    try {
      await api.cleanupSession({ sessionId });
      resetUI();
      alert('Session closed.');
    } catch (err) {
      console.error('Cancel session error', err);
      alert('Failed to cancel session.');
    }
  };

  // small helper to render unmatched lists
  const renderUnmatched = (list = [], title = 'Unmatched') => {
    if (!list || list.length === 0) return null;
    return (
      <div style={{ marginTop: 10 }}>
        <h5>{title} ({list.length})</h5>
        <ul style={{ maxHeight: 180, overflow: 'auto', padding: 8, background: '#fff8f0', borderRadius: 6 }}>
          {list.map((u, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>
              <strong>{u.mapped ? `${u.mapped}` : '??'}</strong> — <em>{u.label || 'question label'}</em>
              <div style={{ fontSize: 12, color: '#333' }}>{u.reason}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: 920,
      margin: '28px auto',
      padding: 20,
      background: '#ffffff',
      borderRadius: 12,
      boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>AutoFill — Campus Forms</h2>
          <div style={{ color: '#666', marginTop: 6 }}>
            {user?.primaryEmailAddress?.emailAddress ? `Signed in as ${user.primaryEmailAddress.emailAddress}` : 'Signed in'}
          </div>
        </div>
        <div>
          <div style={{ textAlign: 'right', color: '#555' }}>
            <div style={{ fontSize: 12, color: '#888' }}>Status</div>
            <div style={{ fontWeight: 600 }}>{statusText[status]}</div>
          </div>
        </div>
      </header>

      <form onSubmit={handleStartAutofill} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <input
          type="url"
          placeholder="Paste Google Form link (https://...)"
          value={formLink}
          onChange={e => setFormLink(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e6e6e6'
          }}
          required
        />
        <button
          type="submit"
          disabled={status === 'filling' || status === 'submitting'}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: '#0f62fe',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Start Autofill
        </button>
      </form>

      {status === 'needsGoogleLogin' && (
        <div style={{ padding: 14, background: '#fff7e6', border: '1px solid #ffecb5', borderRadius: 8, marginBottom: 12 }}>
          <p style={{ margin: 0 }}>
            <strong>Action required:</strong> A browser window has opened. Please sign in to Google in that window.
            After signing in, come back and click <strong>Continue</strong> below.
          </p>
          <div style={{ marginTop: 10 }}>
            <button onClick={handleContinueAfterSignIn} style={{ marginRight: 8 }}>Continue</button>
            <button onClick={handleCancelSession} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </div>
      )}

      {status === 'filled' && diagnostics && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12 }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Autofill diagnostics</h4>

            <div style={{ marginBottom: 10 }}>
              <strong>Filled fields ({diagnostics.filled?.length || 0})</strong>
              <div style={{ marginTop: 8, background: '#f7f9fc', padding: 10, borderRadius: 8 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(diagnostics.filled || [], null, 2)}</pre>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <strong style={{ color: diagnostics.unmatchedMandatoryFields?.length ? '#c0392b' : '#333' }}>
                Required fields not found ({diagnostics.unmatchedMandatoryFields?.length || 0})
              </strong>
              {renderUnmatched(diagnostics.unmatchedMandatoryFields, 'Required (please update your profile or skip)')}
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Optional fields not filled ({diagnostics.unmatchedOptionalFields?.length || 0})</strong>
              {renderUnmatched(diagnostics.unmatchedOptionalFields, 'Optional (skipped)')}
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => { if (window.confirm('Submit the form now?')) doSubmit(sessionId); }}
                style={{ padding: '8px 12px', background: '#1a8cff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Submit Form
              </button>
              <button onClick={handleCancelSession} style={{ marginLeft: 10 }}>Close Session</button>
            </div>
          </div>

          <aside style={{ borderRadius: 8, border: '1px solid #eee', padding: 12 }}>
            <h4 style={{ marginTop: 0 }}>Preview</h4>
            {screenshot ? (
              <img
                src={`data:image/png;base64,${screenshot}`}
                alt="screenshot"
                style={{ width: '100%', borderRadius: 6, border: '1px solid #ddd' }}
              />
            ) : <div style={{ padding: 12, color: '#777' }}>No screenshot available</div>}
            <div style={{ marginTop: 10 }}>
              <strong>Session:</strong> <code style={{ fontSize: 12 }}>{sessionId}</code>
            </div>
          </aside>
        </div>
      )}

      <div style={{ marginTop: 18, color: '#666', fontSize: 13 }}>
        Tip: keep the opened browser window visible while signing in and while autofill runs. If required fields are missing from your profile, edit your profile to add them or fill them manually on the form.
      </div>
    </div>
  );
};

export default AutofillPage;
