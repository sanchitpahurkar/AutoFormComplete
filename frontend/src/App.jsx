import NavBar from "./components/Navbar"
import UserForm from "./pages/UserForm"
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import AutofillPage from './pages/AutoFillPage';
import UserProfile from './pages/UserProfile';

function App() {

  return (

    // sanchit's code
    // <>
    //   <NavBar />
    //   <UserForm />;
    // </>

     <Router>
      <NavBar /> 
      <main>
        <Routes>
          {/* Main page for pasting the Google Form link */}
          <Route path="/" element={<AutofillPage />} />
          
          {/* Page for setting up the user's profile data */}
          <Route path="/profile" element={<UserForm />} /> {/* Using the friend's component name */}
        </Routes>
      </main>
    </Router>
  )
}

export default App
