// frontend/src/pages/AutofillPage.jsx

import React, { useState } from 'react';
import { startAutofill, confirmSubmission } from '../services/api';

const AutofillPage = () => {
  const [formLink, setFormLink] = useState('');
  // IMPORTANT: For a real app, 'user@example.com' would come from an authentication system.
  const [userEmail, setUserEmail] = useState('user@example.com'); 
  const [status, setStatus] = useState('ready'); // ready | filling | filled | submitting | error

  const handleStartAutofill = async (e) => {
    e.preventDefault();
    if (!formLink || !userEmail) {
      alert('Please enter a Google Form link and your registered email.');
      return;
    }
    
    setStatus('filling');
    try {
      // 1. Send link and email to the backend
      // In a real app, you might want to show a small, non-obtrusive message like "Launching browser..."
      await startAutofill(formLink, userEmail);
      
      // 2. The backend has filled the form and is now paused (Playwright browser is open)
      setStatus('filled');
      
      // 3. Confirmation Pop-up
      const confirmation = window.confirm(
        "The Google Form has been filled! Please review it in the opened browser window. Do you want to submit the form now?"
      );

      if (confirmation) {
        setStatus('submitting');
        // 4. Send submission command to backend
        await confirmSubmission(userEmail);
        setStatus('ready');
        setFormLink(''); // Clear the link after submission
        alert('Form submitted successfully! ✅');
      } else {
        // User cancels, Playwright can close the browser or wait for a resubmit command
        setStatus('ready');
        alert('Submission cancelled. The filled form is still open in the browser for manual inspection or closure.');
      }
      
    } catch (error) {
      console.error('Autofill Error:', error);
      setStatus('error');
      alert(`An error occurred during autofill: ${error.message || 'Unknown error'}. Check console for details.`);
    }
  };

  const getStatusMessage = () => {
    switch(status) {
      case 'ready': return 'Paste a Google Form link and click "Start Autofilling" to begin.';
      case 'filling': return 'Processing... The form is being auto-filled in a separate browser window. Please wait! �';
      case 'filled': return 'Form is ready for submission confirmation. Review the opened browser window.';
      case 'submitting': return 'Submitting the form... Please do not close the browser window. ✨';
      case 'error': return 'An error occurred. Please check your link or profile data and try again.';
      default: return '';
    }
  }

  // --- IMPROVED STYLES ---
  const styles = {
    container: { 
      maxWidth: '550px', 
      margin: '80px auto', 
      padding: '35px', 
      backgroundColor: '#fff',
      borderRadius: '12px', 
      boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      color: '#333'
    },
    title: { 
      fontSize: '2.2em', 
      fontWeight: '700', 
      marginBottom: '15px', 
      color: '#2c3e50',
      textAlign: 'center'
    },
    subText: {
      fontSize: '1em',
      color: '#555',
      marginBottom: '10px',
      textAlign: 'center'
    },
    emailInput: { 
      padding: '12px 15px', 
      borderRadius: '8px', 
      border: '1px solid #e0e0e0', 
      backgroundColor: '#f9f9f9',
      fontSize: '1em',
      width: 'calc(100% - 30px)', // Account for padding
      marginBottom: '25px',
      boxSizing: 'border-box',
      color: '#555',
      fontWeight: '600'
    },
    form: { 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '18px', 
      marginTop: '25px' 
    },
    textInput: { 
      padding: '14px 15px', 
      borderRadius: '8px', 
      border: '1px solid #a0a0a0', 
      fontSize: '1.05em',
      width: 'calc(100% - 30px)', // Account for padding
      boxSizing: 'border-box',
      transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      '&:focus': {
        borderColor: '#4CAF50',
        boxShadow: '0 0 0 3px rgba(76, 175, 80, 0.2)'
      }
    },
    button: { 
      padding: '14px 25px', 
      backgroundColor: '#4CAF50', // A nice vibrant green
      color: 'white', 
      border: 'none', 
      borderRadius: '8px', 
      cursor: 'pointer', 
      fontSize: '1.15em',
      fontWeight: 'bold',
      transition: 'background-color 0.3s ease-in-out, transform 0.1s ease-in-out',
      '&:hover': {
        backgroundColor: '#43A047', // Slightly darker green on hover
        transform: 'translateY(-1px)'
      },
      '&:disabled': {
        backgroundColor: '#cccccc',
        cursor: 'not-allowed',
        transform: 'none'
      }
    },
    statusMessage: { 
      marginTop: '30px', 
      textAlign: 'center', 
      fontWeight: '600',
      fontSize: '1.05em',
      padding: '10px 15px',
      borderRadius: '8px',
      backgroundColor: '#e6ffe6', // Light green background
      border: '1px solid #a8e8a8',
      color: '#2e7d32' // Darker green text
    },
    errorMessage: {
      backgroundColor: '#ffe6e6',
      border: '1px solid #e8a8a8',
      color: '#d32f2f',
    },
    infoMessage: {
      backgroundColor: '#e6f7ff',
      border: '1px solid #a8d9ed',
      color: '#1976d2',
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>AutoFill Campus Drive Forms</h2>
      <p style={styles.subText}>Your unique ID for this session (from your profile):</p>
      <input 
        style={styles.emailInput} 
        type="email" 
        value={userEmail} 
        readOnly 
      />

      <form onSubmit={handleStartAutofill} style={styles.form}>
        <input 
          style={styles.textInput}
          type="url"
          value={formLink}
          onChange={(e) => setFormLink(e.target.value)}
          placeholder="Paste Google Form Link Here"
          required
        />
        
        <button 
          type="submit" 
          style={styles.button}
          disabled={status === 'filling' || status === 'submitting'}
        >
          {status === 'filling' ? 'Autofilling...' : 
           status === 'submitting' ? 'Submitting...' : 'Start Autofilling ⚡'}
        </button>
      </form>
      
      <p 
        style={{
          ...styles.statusMessage, 
          ...(status === 'error' ? styles.errorMessage : {}),
          ...(status === 'filling' || status === 'submitting' ? styles.infoMessage : {})
        }}
      >
          {getStatusMessage()}
      </p>
    </div>
  );
};

export default AutofillPage;
