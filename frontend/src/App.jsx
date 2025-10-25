import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from "./pages/Home"
import UserForm from "./pages/UserForm"
import React from 'react';
import {BrowserRouter} from 'react-router-dom';
import Header from './components/Header';
import AutoFillPage from './pages/AutoFillPage';
import UserProfile from './pages/UserProfile';
import { Toaster } from "react-hot-toast";

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/login" />;

  return children;
}


function App() {

  return (
      <>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
          {/* auth routes */}
          <Route path='/login' element={<div className='flex justify-center items-center min-h-screen bg-custom-grad'>
            <SignIn 
              routing="path" 
              path="/login" 
              signUpUrl="/signup"
            />
          </div>} 
          />
          <Route path='/signup' element={<div className='flex justify-center items-center min-h-screen bg-custom-grad'>
            <SignUp 
              routing="path"
              path="/signup" 
              signInUrl="/login"
            />
          </div>} 
          />

          <Route path='/' element={<Home />}/>

          {/* protected routes */}
          <Route path="/auto-fill" element={
            <ProtectedRoute>
              <AutoFillPage />
            </ProtectedRoute>
          } />

          <Route path="/parent-form" element={
            <ProtectedRoute>
              <UserForm />
            </ProtectedRoute>
          } />

        </Routes>
      </>
  )
}

export default App
