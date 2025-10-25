// frontend/src/pages/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import useApi from '../services/api';
import { useUser } from '@clerk/clerk-react';

const UserProfile = () => {
  const api = useApi();
  const { isLoaded, isSignedIn } = useUser();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    emailID: '',
    phone: '',
    cgpa: '',
  });
  const [message, setMessage] = useState('');
  const [isExisting, setIsExisting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      try {
        const { data } = await api.getUserProfile();
        if (data.user) {
          setFormData(data.user);
          setIsExisting(true);
        }
      } catch (err) {
        console.log('No existing profile found.');
      }
    })();
  }, [isLoaded, isSignedIn]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Saving...');
    try {
      if (isExisting) {
        await api.updateUserProfile(formData);
        setMessage('Profile updated successfully!');
      } else {
        await api.saveUserProfile(formData);
        setMessage('Profile saved successfully!');
        setIsExisting(true);
      }
    } catch (err) {
      console.error(err);
      setMessage('Error saving profile.');
    }
  };

  return (
    <div style={{ maxWidth: 700, margin:'30px auto', padding:20, background:'#fff', borderRadius:8 }}>
      <h2>My Placement Profile</h2>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} required />
        <input name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} required />
        <input name="emailID" placeholder="Email" type="email" value={formData.emailID} onChange={handleChange} required />
        <input name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} />
        <input name="cgpa" placeholder="CGPA" type="number" step="0.01" value={formData.cgpa} onChange={handleChange} />
        <button type="submit">{isExisting ? 'Update Profile' : 'Save Profile'}</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UserProfile;
