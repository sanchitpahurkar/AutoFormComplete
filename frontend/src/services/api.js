// frontend/src/services/api.js

import axios from 'axios';

// The URL for your backend Express server
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to save or update the user profile data
export const saveUserProfile = (userData) => {
  return api.post('/user/save', userData);
};

// Function to initiate the autofill process
export const startAutofill = (formLink, userEmail) => {
  return api.post('/autofill', { formLink, userEmail });
};

// Function to send confirmation to submit the filled form
export const confirmSubmission = (userEmail) => {
  return api.post('/autofill/submit', { userEmail });
};

export default api;