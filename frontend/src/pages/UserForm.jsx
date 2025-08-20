// ...existing code...
import { useState, useEffect } from "react";
import axios from "axios";

export default function UserForm() {
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    gender: "",
    phone: "",
    rknecEmail: "",
    personalEmail: "",
    alternatePhone: "",
    currentAddress: "",
    permanentAddress: "",
    sameAsCurrent: false,
    currentDegree: {
      year: "",
      branch: "",
      enrollmentNo: "",
      cgpa: "",
      activeBacklogs: "",
      deadBacklogs: "",
      graduationYear: "", // added year of graduation
    },
    twelfth: {
      schoolName: "",
      board: "",
      passingYear: "",
      percentage: "",
    },
    tenth: {
      schoolName: "",
      board: "",
      passingYear: "",
      percentage: "",
    },
    resumeFile: null,
  });
  const [errors, setErrors] = useState({ rknecEmail: "", personalEmail: "" });
  const [submitting, setSubmitting] = useState(false);

  // generate year options (descending) for year-only pickers
  const START_YEAR = 1980;
  const END_YEAR = new Date().getFullYear() + 5;
  const yearOptions = [];
  for (let y = END_YEAR; y >= START_YEAR; y--) yearOptions.push(String(y));

  useEffect(() => {
    if (form.sameAsCurrent) {
      setForm((f) => ({ ...f, permanentAddress: f.currentAddress }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sameAsCurrent, form.currentAddress]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleNestedChange = (section) => (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [section]: { ...f[section], [name]: value } }));
  };

  const handleCheckbox = (e) => {
    const checked = e.target.checked;
    setForm((f) => ({ ...f, sameAsCurrent: checked, permanentAddress: checked ? f.currentAddress : f.permanentAddress }));
  };

  const handleFileChange = (e) => {
    setForm((f) => ({ ...f, resumeFile: e.target.files[0] || null }));
  };

  const handleEmailBlur = (field) => {
    const val = form[field];
    setErrors((prev) => ({ ...prev, [field]: val && !isValidEmail(val) ? "Invalid email format" : "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rknecErr = form.rknecEmail && !isValidEmail(form.rknecEmail) ? "Invalid email format" : "";
    const personalErr = form.personalEmail && !isValidEmail(form.personalEmail) ? "Invalid email format" : "";
    setErrors({ rknecEmail: rknecErr, personalEmail: personalErr });

    if (rknecErr || personalErr) {
      alert("Please correct the highlighted email fields.");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      const payload = { ...form, resumeFile: undefined };
      data.append("data", JSON.stringify(payload));
      if (form.resumeFile) data.append("resume", form.resumeFile);

      await axios.post("http://localhost:5000/api/users", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("User saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save user.");
    } finally {
      setSubmitting(false);
    }
  };

  // requested color palette
  const PAGE_BG = "#493628";
  const FORM_BG = "#E4E0E1";
  const PRIMARY = "#493628";

  return (
    <div style={{ backgroundColor: PAGE_BG }} className="min-h-screen flex items-start justify-center py-10 px-4">
      <style>{`
        :root{
          --page-bg: ${PAGE_BG};
          --form-bg: ${FORM_BG};
          --primary: ${PRIMARY};
          --muted: rgba(73,54,40,0.25);
        }
        .form-wrap { background: var(--form-bg); color: var(--primary); border-radius: 14px; width:100%; max-width:980px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
        .section { padding: 18px 22px; }
        .section-title { font-weight:600; color: var(--primary); margin-bottom:10px; letter-spacing:0.2px; }
        .divider { height:1px; background: var(--muted); margin: 6px 0 18px; border-radius:2px; }
        .underline-input, .underline-select, .underline-textarea {
          background: transparent;
          border: none;
          border-bottom: 1.5px solid rgba(73,54,40,0.18);
          color: var(--primary);
          padding: 10px 6px;
          width:100%;
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .underline-input::placeholder, .underline-textarea::placeholder { color: rgba(73,54,40,0.45); }
        .underline-input:focus, .underline-select:focus, .underline-textarea:focus {
          border-bottom: 2px solid var(--primary);
          box-shadow: 0 6px 18px rgba(73,54,40,0.06);
        }
        .row { display:flex; gap:16px; align-items:stretch; }
        .col-1 { flex:1; min-width:0; }
        .col-2 { flex:1; min-width:0; }
        .col-3 { flex:1; min-width:0; }
        .small-note { font-size:12px; color: rgba(73,54,40,0.7); margin-top:6px; }
        .btn-primary {
          background: var(--primary);
          color: #fff;
          padding:10px 16px;
          border-radius:4px;
          border: none;
          cursor:pointer;
          box-shadow: 0 6px 18px rgba(73,54,40,0.12);
        }
        .btn-primary:disabled { opacity:0.5; cursor:default; }
        @media (min-width:768px){
          .grid-3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; }
          .grid-4 { display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; }
        }
      `}</style>

      <form onSubmit={handleSubmit} className="form-wrap" style={{ overflow: "hidden" }}>
        <div className="section" style={{ paddingTop: 20 }}>
          <div className="flex flex-col md:flex-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 className="section-title" style={{ fontSize: 20 }}>Student Details</h2>
            <div style={{ fontSize: 13, color: "rgba(73,54,40,0.7)" }}>Please fill student information</div>
          </div>

          <div className="grid-3" style={{ gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, marginBottom: 6, display: "block" }}>First Name</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required placeholder="First name" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, marginBottom: 6, display: "block" }}>Middle Name</label>
              <input name="middleName" value={form.middleName} onChange={handleChange} placeholder="Middle name" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, marginBottom: 6, display: "block" }}>Last Name</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required placeholder="Last name" className="underline-input" />
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="section">
          <div className="grid-4">
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>DOB</label>
              <input type="date" name="dob" value={form.dob} onChange={handleChange} className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="underline-select" style={{ appearance: "none" }}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Phone Number</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91xxxxxxxxxx" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>RKNEC Email</label>
              <input
                name="rknecEmail"
                value={form.rknecEmail}
                onChange={handleChange}
                onBlur={() => handleEmailBlur("rknecEmail")}
                type="email"
                placeholder="student@rknec.edu"
                className="underline-input"
                style={errors.rknecEmail ? { borderBottomColor: "rgba(255,77,79,0.9)" } : undefined}
              />
              {errors.rknecEmail && <div className="small-note" style={{ color: "#ff4d4f" }}>{errors.rknecEmail}</div>}
            </div>
          </div>

          <div style={{ height: 8 }} />

          <div className="row" style={{ gap: 18 }}>
            <div className="col-2">
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Personal Email</label>
              <input
                name="personalEmail"
                value={form.personalEmail}
                onChange={handleChange}
                onBlur={() => handleEmailBlur("personalEmail")}
                type="email"
                placeholder="you@example.com"
                className="underline-input"
                style={errors.personalEmail ? { borderBottomColor: "rgba(255,77,79,0.9)" } : undefined}
              />
              {errors.personalEmail && <div className="small-note" style={{ color: "#ff4d4f" }}>{errors.personalEmail}</div>}
            </div>
            <div className="col-2">
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Phone / Alternate</label>
              <input name="alternatePhone" value={form.alternatePhone} onChange={handleChange} placeholder="Optional" className="underline-input" />
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="section">
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Current Address</label>
              <textarea name="currentAddress" value={form.currentAddress} onChange={handleChange} rows="3" placeholder="Current address" className="underline-textarea" style={{ resize: "vertical" }} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Permanent Address</label>
                <label style={{ fontSize: 13, color: PRIMARY, display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={form.sameAsCurrent} onChange={handleCheckbox} />
                  Same as current
                </label>
              </div>
              <textarea name="permanentAddress" value={form.permanentAddress} onChange={handleChange} rows="3" placeholder="Permanent address" className="underline-textarea" style={{ resize: "vertical" }} />
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="section">
          <h3 className="section-title" style={{ fontSize: 16 }}>Current Degree Details</h3>
          <div className="grid-3">
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Year</label>
              <input name="year" value={form.currentDegree.year} onChange={handleNestedChange("currentDegree")} placeholder="Eg: I, II, III, IV" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Branch</label>
              <select name="branch" value={form.currentDegree.branch} onChange={handleNestedChange("currentDegree")} className="underline-select" style={{ appearance: "none" }}>
                <option value="">Select Branch</option>
                <option value="CSE">CSE</option>
                <option value="CSE-AIML">CSE-AIML</option>
                <option value="CSE-DS">CSE-DS</option>
                <option value="IT">IT</option>
                <option value="CSE-Cyber">CSE-Cyber</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Enrollment No</label>
              <input name="enrollmentNo" value={form.currentDegree.enrollmentNo} onChange={handleNestedChange("currentDegree")} placeholder="Enrollment No" className="underline-input" />
            </div>

            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>CGPA</label>
              <input name="cgpa" value={form.currentDegree.cgpa} onChange={handleNestedChange("currentDegree")} placeholder="CGPA" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Active Backlogs</label>
              <input name="activeBacklogs" value={form.currentDegree.activeBacklogs} onChange={handleNestedChange("currentDegree")} placeholder="Active Backlogs" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Dead Backlogs</label>
              <input name="deadBacklogs" value={form.currentDegree.deadBacklogs} onChange={handleNestedChange("currentDegree")} placeholder="Dead Backlogs" className="underline-input" />
            </div>

            {/* Year of Graduation picker (year-only) */}
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Year of Graduation</label>
              <select name="graduationYear" value={form.currentDegree.graduationYear} onChange={handleNestedChange("currentDegree")} className="underline-select" style={{ appearance: "none" }}>
                <option value="">Select Year</option>
                {yearOptions.map((y) => (
                  <option key={`grad-${y}`} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="section">
          <h3 className="section-title" style={{ fontSize: 16 }}>12th / Diploma Details</h3>
          <div className="grid-3">
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>School / College</label>
              <input name="schoolName" value={form.twelfth.schoolName} onChange={handleNestedChange("twelfth")} placeholder="School / College Name" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Board</label>
              <select name="board" value={form.twelfth.board} onChange={handleNestedChange("twelfth")} className="underline-select" style={{ appearance: "none" }}>
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State board">State board</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Passing Year / %</label>
              <div style={{ display: "flex", gap: 10 }}>
                <select name="passingYear" value={form.twelfth.passingYear} onChange={handleNestedChange("twelfth")} className="underline-select" style={{ appearance: "none" }}>
                  <option value="">Year</option>
                  {yearOptions.map((y) => <option key={`12-${y}`} value={y}>{y}</option>)}
                </select>
                <input name="percentage" value={form.twelfth.percentage} onChange={handleNestedChange("twelfth")} placeholder="Percentage" className="underline-input" />
              </div>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="section">
          <h3 className="section-title" style={{ fontSize: 16 }}>10th Details</h3>
          <div className="grid-3">
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>School</label>
              <input name="schoolName" value={form.tenth.schoolName} onChange={handleNestedChange("tenth")} placeholder="School Name" className="underline-input" />
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Board</label>
              <select name="board" value={form.tenth.board} onChange={handleNestedChange("tenth")} className="underline-select" style={{ appearance: "none" }}>
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State board">State board</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Passing Year / %</label>
              <div style={{ display: "flex", gap: 10 }}>
                <select name="passingYear" value={form.tenth.passingYear} onChange={handleNestedChange("tenth")} className="underline-select" style={{ appearance: "none" }}>
                  <option value="">Year</option>
                  {yearOptions.map((y) => <option key={`10-${y}`} value={y}>{y}</option>)}
                </select>
                <input name="percentage" value={form.tenth.percentage} onChange={handleNestedChange("tenth")} placeholder="Percentage" className="underline-input" />
              </div>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Resume / CV</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="underline-input" style={{ borderBottomStyle: "dashed" }} />
            <div className="small-note">Recommended: PDF, DOCX. Max 5MB.</div>
          </div>
          <div style={{ width: 220, textAlign: "right" }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Preview</div>
            <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)", color: PRIMARY, border: "1px solid rgba(73,54,40,0.08)" }}>
              {form.resumeFile ? form.resumeFile.name : "No file selected"}
            </div>
          </div>
        </div>

        <div style={{ padding: 18, display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(73,54,40,0.06)" }}>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Saving..." : "Save Student"}
          </button>
        </div>
      </form>
    </div>
  );
}