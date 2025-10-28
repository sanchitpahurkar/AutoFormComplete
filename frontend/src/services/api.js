// frontend/src/services/api.js
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

const API_URL = 'http://localhost:5000/api';

export function useApi() {
  const { getToken } = useAuth();

  const apiCall = async (method, url, data = null) => {
    const token = await getToken();
    return axios({
      method,
      url: `${API_URL}${url}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined
      },
      timeout: 60000
    });
  };

  return {
    // user profile
    getUserProfile: () => apiCall('get', '/users/me'),
    saveUserProfile: (data) => apiCall('post', '/users', data),
    updateUserProfile: (data) => apiCall('put', '/users/me', data),

    // autofill
    startAutofill: ({ formUrl, userId, headless = false }) => apiCall('post', '/autofill/start', { formUrl, userId, headless }),
    continueAutofill: (sessionId, userId) => apiCall('post', '/autofill/continue', { sessionId, userId }),
    confirmSubmission: (sessionId) => apiCall('post', '/autofill/submit', { sessionId }),
    cleanupSession: (sessionId) => apiCall('post', '/autofill/cleanup', { sessionId })
  };
}

export default useApi;
