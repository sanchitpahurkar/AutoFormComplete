import React, { useState } from "react";

export default function NavBar() {
  const BG = "#D6C0B3";
  const TEXT = "#493628";

  const [open, setOpen] = useState(false);

  return (
    <nav style={{ background: BG, color: TEXT }} className="navbar">
      <style>{`
        .navbar{ display:flex; align-items:center; justify-content:space-between; padding:12px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); position:sticky; top:0; z-index:40; }
        .brand{ display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; }
        .brand-text{ font-weight:700; font-size:18px; letter-spacing:0.2px; }
        .nav-links{ display:flex; align-items:center; gap:18px; }
        .nav-link{ color:inherit; text-decoration:none; font-weight:500; padding:8px 10px; border-radius:4px; transition:background .12s; }
        .nav-link:hover{ background: rgba(73,54,40,0.06); }
        .actions{ display:flex; gap:12px; align-items:center; }
        .btn-login{ background:transparent; color: ${TEXT}; border: 1.2px solid ${TEXT}; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:600; }
        .btn-login:hover{ background: ${TEXT}; color:#fff; }
        .hamburger{ display:none; background:transparent; border:none; cursor:pointer; padding:8px; border-radius:4px; }
        @media (max-width:880px){
          .nav-links{ display: ${open ? "flex" : "none"}; position:absolute; right:12px; top:64px; flex-direction:column; background: ${BG}; padding:12px; gap:8px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.08); }
          .hamburger{ display:inline-flex; }
        }
      `}</style>

      <a href="/" className="brand" aria-label="AutoFormComplete home">
        <div className="" aria-hidden>
          {/* simple svg monogram */}
          <img className="h-12" src="/logo.png" alt="" />
        </div>
      </a>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="hamburger"
          onClick={() => setOpen((s) => !s)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          style={{ color: TEXT }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="nav-links bg-[#E4E0E1] sm:bg-[#D6C0B3]" role="navigation" aria-label="Main navigation">
          <a className="nav-link" href="/">Home</a>
          <a className="nav-link" href="/auto-fill">Form-fill</a>
          <div className="actions flex-col md:flex-row">
            <a className="nav-link" href="/login">Login</a>
            <a className="btn-login" href="/signup">Sign up</a>
          </div>
        </div>
      </div>
    </nav>
  );
}