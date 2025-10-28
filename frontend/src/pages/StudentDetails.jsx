import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const StudentDetails = () => {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [student, setStudent] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await getToken();
        const me = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (me.data.user.role !== 'admin') {
          alert('You are not authorized to view this page.');
          navigate('/');
          return;
        }
        setIsAdmin(true);

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudent(res.data.user);
      } catch (err) {
        console.error(err);
        navigate('/');
      }
    };
    loadData();
  }, [id]);

  if (!isAdmin) return null;
  if (!student)
    return <div className="p-10 text-center text-white">Loading student...</div>;

  return (
    <div className="min-h-screen bg-custom-grad py-10 px-6 md:px-12 work-sans">
      <div className="bg-[#E4E0E1] shadow-lg rounded-2xl p-8 md:p-10 text-[#493628]">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-[#493628] underline hover:text-[#7b3306]"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-6 text-center">
          Student Full Details
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(student).map(([key, val]) => (
            <div
              key={key}
              className="bg-white rounded-xl p-4 shadow-sm border border-[#d5cfcf]"
            >
              <p className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</p>
              <p className="mt-1">{String(val) || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
