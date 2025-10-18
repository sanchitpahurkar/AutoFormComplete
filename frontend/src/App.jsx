import NavBar from "./components/Navbar"
 import { Routes, Route } from 'react-router-dom';
import Home from "./pages/Home"
import UserForm from "./pages/UserForm"
import AutoFill from "./pages/AutoFill";

function App() {

  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auto-fill" element={<AutoFill />} />
        <Route path="/parent-form" element={<UserForm />} />
      </Routes>
  )
}

export default App
