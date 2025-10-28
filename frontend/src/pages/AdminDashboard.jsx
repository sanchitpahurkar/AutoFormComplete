import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    branch: "",
    cgpaMin: "",
    cgpaMax: "",
    sscMin: "",
    hscMin: "",
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // ✅ Fetch admin and student list
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = await getToken();
        const res = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.user.role === "admin") {
          setIsAdmin(true);
          const all = await axios.get("http://localhost:5000/api/users/all", {
            headers: { Authorization: `Bearer ${token}` },
          });

          // ✅ Exclude admin user (case-insensitive & safe)
          const onlyStudents = (all.data.users || []).filter(
            (u) => String(u.role).toLowerCase() !== "admin"
          );

          setStudents(onlyStudents);
          setFiltered(onlyStudents);

          // Extract unique branches (from students only)
          const uniqueBranches = [
            ...new Set(onlyStudents.map((s) => s.branch).filter(Boolean)),
          ];
          setBranches(uniqueBranches);
        } else {
          alert("You are not authorized to view this page.");
          navigate("/");
        }
      } catch (err) {
        console.error("Error verifying admin:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    verifyAdmin();
  }, []);

  // ✅ Apply filters
  useEffect(() => {
    let result = [...students];
    if (filters.branch)
      result = result.filter((s) => s.branch === filters.branch);
    if (filters.cgpaMin)
      result = result.filter(
        (s) => Number(s.cgpa || 0) >= Number(filters.cgpaMin)
      );
    if (filters.cgpaMax)
      result = result.filter(
        (s) => Number(s.cgpa || 0) <= Number(filters.cgpaMax)
      );
    if (filters.sscMin)
      result = result.filter(
        (s) => Number(s.sscPercentage || 0) >= Number(filters.sscMin)
      );
    if (filters.hscMin)
      result = result.filter(
        (s) => Number(s.hscPercentage || 0) >= Number(filters.hscMin)
      );
    setFiltered(result);
  }, [filters, students]);

  // ✅ Stats: total & top branches
  const stats = useMemo(() => {
    if (!students.length) return { total: 0, topBranches: [] };
    const total = students.length;
    const branchCount = {};
    students.forEach((s) => {
      if (s.branch) branchCount[s.branch] = (branchCount[s.branch] || 0) + 1;
    });
    const topBranches = Object.entries(branchCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([b, count]) => `${b} (${count})`);
    return { total, topBranches };
  }, [students]);

  // ✅ Generate PDF
  const generatePDF = () => {
    if (!filtered.length) {
      alert("No data to export!");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("AutoFormComplete — Student Report", 14, 15);
    doc.setFontSize(11);
    doc.text(`Total Students: ${filtered.length}`, 14, 22);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const tableColumn = [
      "Enrollment No",
      "Name",
      "Branch",
      "CGPA",
      "10th %",
      "12th %",
    ];
    const tableRows = filtered.map((s) => [
      s.enrollmentNumber || "-",
      `${s.firstName || ""} ${s.lastName || ""}`,
      s.branch || "-",
      s.cgpa || "-",
      s.sscPercentage || "-",
      s.hscPercentage || "-",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [73, 54, 40] }, // #493628
      styles: { halign: "center", fontSize: 10 },
      tableWidth: "auto",
    });

    doc.save("filtered_students.pdf");
  };

  if (loading) return <div className="p-10 text-center text-white">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-custom-grad py-10 px-6 md:px-12 text-[#493628] work-sans">
      <div className="bg-[#E4E0E1] shadow-lg rounded-2xl p-6 md:p-10">
        <h1 className="text-4xl font-bold mb-8 text-center text-[#493628]">
          Admin Dashboard
        </h1>

        {/* 🧾 Stats Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 text-center">
          <div className="bg-white rounded-xl p-4 shadow border">
            <h2 className="text-lg font-semibold">Total Students</h2>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow border">
            <h2 className="text-lg font-semibold">Top Branches</h2>
            <p className="mt-1 text-sm">
              {stats.topBranches.length ? stats.topBranches.join(", ") : "—"}
            </p>
          </div>
        </div>

        {/* 🎛 Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <select
            className="border border-[#493628] rounded-md px-3 py-2"
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Min CGPA"
            className="border border-[#493628] rounded-md px-3 py-2 w-24"
            value={filters.cgpaMin}
            onChange={(e) => setFilters({ ...filters, cgpaMin: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max CGPA"
            className="border border-[#493628] rounded-md px-3 py-2 w-24"
            value={filters.cgpaMax}
            onChange={(e) => setFilters({ ...filters, cgpaMax: e.target.value })}
          />
          <input
            type="number"
            placeholder="Min 10th %"
            className="border border-[#493628] rounded-md px-3 py-2 w-28"
            value={filters.sscMin}
            onChange={(e) => setFilters({ ...filters, sscMin: e.target.value })}
          />
          <input
            type="number"
            placeholder="Min 12th %"
            className="border border-[#493628] rounded-md px-3 py-2 w-28"
            value={filters.hscMin}
            onChange={(e) => setFilters({ ...filters, hscMin: e.target.value })}
          />

          <button
            onClick={() =>
              setFilters({
                branch: "",
                cgpaMin: "",
                cgpaMax: "",
                sscMin: "",
                hscMin: "",
              })
            }
            className="ml-auto bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-md"
          >
            Reset
          </button>

          <button
            onClick={generatePDF}
            className="bg-[#493628] text-white px-4 py-2 rounded-md hover:bg-[#36271c]"
          >
            Generate PDF
          </button>
        </div>

        {/* 🧑‍🎓 Student Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse rounded-xl overflow-hidden">
            <thead className="bg-[#493628] text-white">
              <tr>
                <th className="p-3 text-left">Enrollment No</th>
                <th className="p-3 text-left">Student Name</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">CGPA</th>
                <th className="p-3 text-left">10th %</th>
                <th className="p-3 text-left">12th %</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s._id}
                  className={`hover:bg-[#fffaf7] transition ${
                    i % 2 === 0 ? "bg-[#F7F5F4]" : "bg-[#ffffff]"
                  }`}
                >
                  <td className="p-3 border-b">{s.enrollmentNumber || "-"}</td>
                  <td className="p-3 border-b">{`${s.firstName || ""} ${
                    s.lastName || ""
                  }`}</td>
                  <td className="p-3 border-b">{s.branch || "-"}</td>
                  <td className="p-3 border-b">{s.cgpa || "-"}</td>
                  <td className="p-3 border-b">{s.sscPercentage || "-"}</td>
                  <td className="p-3 border-b">{s.hscPercentage || "-"}</td>
                  <td className="p-3 border-b text-center">
                    <button
                      onClick={() => navigate(`/admin/student/${s._id}`)}
                      className="bg-[#493628] text-white px-3 py-1 rounded-lg hover:bg-[#36271c]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-8 text-[#493628] opacity-70"
                  >
                    No matching records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
