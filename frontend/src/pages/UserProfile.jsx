// frontend/src/pages/UserProfile.jsx

import React, { useState } from 'react';
import { saveUserProfile } from '../services/api';

const UserProfile = () => {
  const [formData, setFormData] = useState({
    email: 'user@example.com', // Dummy email for initial testing
    firstName: '',
    lastName: '',
    cgpa: '',
    // Add more fields here to match your MongoDB schema
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Saving...');
    try {
      const response = await saveUserProfile(formData);
      setMessage('Profile saved successfully! 🎉');
      console.log('Saved data:', response.data);
    } catch (error) {
      setMessage('Error saving profile. See console.');
      console.error('Error:', error);
    }
  };

  return (
    <div style={styles.container}>
      <h2>My Placement Profile</h2>
      <p>Enter your details once. This data will be used to auto-fill all Google Forms.</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input style={styles.input} type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email (Unique ID)" required />
        <input style={styles.input} type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" required />
        <input style={styles.input} type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" required />
        <input style={styles.input} type="number" name="cgpa" value={formData.cgpa} onChange={handleChange} placeholder="CGPA (e.g., 8.5)" step="0.01" required />
        {/* Add more input fields for all your data (10th/12th marks, etc.) */}
        
        <button type="submit" style={styles.button}>Save Profile</button>
      </form>
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
};

const styles = {
    // Basic styling for a clean look
    container: { maxWidth: '600px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '10px', borderRadius: '4px', border: '1px solid #ddd' },
    button: { padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    message: { marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }
};

export default UserProfile;