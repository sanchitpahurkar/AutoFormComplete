import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
 import { Routes, Route, Navigate } from 'react-router-dom';
import Home from "./pages/Home"
import UserForm from "./pages/UserForm"
import AutoFill from "./pages/AutoFill";
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
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />

          <Route path="/auto-fill" element={
            <ProtectedRoute>
              <AutoFill />
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
