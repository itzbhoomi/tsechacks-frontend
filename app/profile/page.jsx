"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

// ── MOCK / STATIC DATA ──
const analyticsData = [
  { month: "Jan", views: 1200, contributions: 180 },
  { month: "Feb", views: 1600, contributions: 260 },
  { month: "Mar", views: 1400, contributions: 220 },
  { month: "Apr", views: 2000, contributions: 340 },
  { month: "May", views: 2400, contributions: 420 },
];

const COLORS = ["#7FAAF5", "#9DBAF7", "#B7CCF8", "#D6E2FF"];
const budgetLabels = ["Production", "Marketing", "Logistics", "Platform Fees"];

const projectStepsTemplate = [
  { id: 1, title: "Idea & Research", status: "completed" },
  { id: 2, title: "Prototype Development", status: "completed" },
  { id: 3, title: "Funding Phase", status: "active" },
  { id: 4, title: "Production & Launch", status: "pending" },
];

// ───────────────────────────────────────────────
//  DONATION MODAL
// ───────────────────────────────────────────────
function DonationModal({ project, open, onClose }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handlePreset = (val) => setAmount(val.toString());

  const handleConfirmPayment = async () => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      // 1. CALL THE INTENT API
      const response = await fetch("https://api.fmm.finternetlab.io/api/v1/payment-intents", {
        method: "POST",
        headers: {
          "X-API-Key": "sk_hackathon_bea2ab2910e59eb4522d62cfa9f60438",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount.toFixed(2),
          currency: "USD",
          type: "DELIVERY_VS_PAYMENT",
          settlementMethod: "OFF_RAMP_TO_RTP",
          settlementDestination: "9876543210",
          metadata: {
            releaseType: "MILESTONE_LOCKED",
            projectId: project.id,
          },
        }),
      });

      const result = await response.json();

      if (result && result.data && result.data.paymentUrl) {
        // 2. STORE TRANSACTION IN DB
        await addDoc(collection(db, "transactions"), {
          projectId: project.id,
          projectTitle: project.title,
          amount: numericAmount,
          currency: "USD",
          intentId: result.data.id || result.id,
          status: "INITIATED",
          paymentUrl: result.data.paymentUrl,
          createdAt: serverTimestamp(),
        });

        // 3. INCREMENT GLOBAL POOL
        const poolRef = doc(db, "pool", "main");
        await setDoc(
          poolRef,
          { total: increment(numericAmount), lastUpdated: serverTimestamp() },
          { merge: true }
        );

        // 4. REDIRECT
        window.location.href = result.data.paymentUrl;
      } else {
        alert("Failed to initiate payment. API response error.");
      }
    } catch (err) {
      console.error("Payment initiation failed:", err);
      alert("Failed to start payment process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-serif text-xl">Support {project.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center justify-center rounded-2xl bg-[#F7FAFF] py-8 border border-[#E1EAF8]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7FAAF5]">
            Enter Amount
          </p>
          <div className="flex items-baseline text-[#1E2A3B]">
            <span className="text-3xl font-bold">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-32 bg-transparent text-center text-5xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3">
          {[10, 50, 100].map((val) => (
            <button
              key={val}
              onClick={() => handlePreset(val)}
              className={`rounded-xl border py-2 text-sm font-medium transition ${
                amount === val.toString() ? "bg-[#7FAAF5] text-white" : "bg-white text-[#5C6B82]"
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="w-full rounded-xl bg-[#1E2A3B] py-4 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Processing..." : `Donate $${amount || "0"}`}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
//  PROJECT DETAIL MODAL
// ───────────────────────────────────────────────
function ProjectModal({ project, open, onClose, userRole }) {
  const [budgetData, setBudgetData] = useState([]);
  const [projectSteps, setProjectSteps] = useState(projectStepsTemplate);
  const [currentStep, setCurrentStep] = useState(3);
  const [isReimburseFormOpen, setIsReimburseFormOpen] = useState(false);
  const [billFile, setBillFile] = useState(null);
  const [showDonation, setShowDonation] = useState(false);

  useEffect(() => {
    if (!open || !project) return;

    // Budget
    if (project.budget?.length === 4) {
      setBudgetData(budgetLabels.map((label, i) => ({ name: label, value: project.budget[i] })));
    }

    // Timeline steps
    if (project.timeline?.length === 4) {
      const steps = projectStepsTemplate.map((step, idx) => ({
        ...step,
        details: project.timeline[idx] || "",
      }));
      const activeIdx = steps.findIndex((s) => s.status === "active");
      if (activeIdx !== -1) setCurrentStep(steps[activeIdx].id);
      setProjectSteps(steps);
    }
  }, [open, project]);

  const handleReimburseSubmit = (e) => {
    e.preventDefault();
    if (!billFile) return alert("Please upload a bill image first!");
    alert(`Bill "${billFile.name}" submitted for reimbursement! (mock)`);
    setIsReimburseFormOpen(false);
    setBillFile(null);
  };

  const handleInviteEmail = () => {
    const email = prompt("Enter email to invite:");
    if (email) alert(`Invitation sent to ${email}! (mock)`);
  };

  if (!open || !project) return null;

  const activeStep = projectSteps.find((s) => s.id === currentStep) || projectSteps[0];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[#E1EAF8] bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#E1EAF8] px-8 py-6">
            <div>
              <h2 className="font-serif text-2xl">{project.title}</h2>
              <p className="mt-1 text-sm text-[#5C6B82]">{project.category}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-[#DCE6F7] px-3 py-1 text-sm hover:bg-[#F4F7FD]"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 gap-10 px-8 py-6 md:grid-cols-[60%_40%]">
            {/* Left column */}
            <div className="space-y-8">
              <p className="text-sm text-[#5C6B82]">{project.overview}</p>

              {/* Funding progress */}
              <div>
                <div className="mb-2 flex justify-between text-xs text-[#7A8CA5]">
                  <span>Funding progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E1EAF8]">
                  <div
                    className="h-2 rounded-full bg-[#7FAAF5]"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div>
                <p className="mb-4 text-sm font-medium">Project Timeline</p>
                <div className="flex items-center justify-between">
                  {projectSteps.map((step, idx) => {
                    const isActive = step.id === currentStep;
                    const isComplete = step.id < currentStep;
                    return (
                      <div key={step.id} className="flex flex-1 items-center">
                        <button
                          onClick={() => setCurrentStep(step.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium ${
                            isComplete
                              ? "bg-[#7FAAF5] text-white border-[#7FAAF5]"
                              : isActive
                              ? "border-[#7FAAF5] text-[#7FAAF5]"
                              : "border-[#DCE6F7] text-[#7A8CA5]"
                          }`}
                        >
                          {step.id}
                        </button>
                        {idx < projectSteps.length - 1 && (
                          <div
                            className={`mx-2 h-[2px] flex-1 ${
                              isComplete ? "bg-[#7FAAF5]" : "bg-[#E1EAF8]"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-[#E1EAF8] bg-[#F9FBFF] p-4">
                  <p className="text-sm font-medium">{activeStep.title}</p>
                  <p className="mt-1 text-xs text-[#5C6B82]">{activeStep.details}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {project.contributions?.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-[#DCE6F7] px-3 py-1 text-xs"
                  >
                    {c}
                  </span>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="flex gap-3 pt-4">
                {userRole === "creator" ? (
                  <>
                    <button
                      className="rounded-xl bg-green-600 px-6 py-3 text-sm text-white hover:bg-green-700"
                      onClick={handleInviteEmail}
                    >
                      Invite via Email
                    </button>
                    <button
                      className="rounded-xl border border-gray-300 px-6 py-3 text-sm hover:bg-gray-50"
                      onClick={() => setIsReimburseFormOpen(true)}
                    >
                      Reimburse from Pool
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white hover:bg-[#6a9ce6]"
                      onClick={() => setShowDonation(true)}
                    >
                      Support Project
                    </button>
                    <button className="rounded-xl border border-gray-300 px-6 py-3 text-sm hover:bg-gray-50">
                      Collaborate
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right column – Budget Pie */}
            <div className="rounded-2xl bg-[#F7FAFF] p-5">
              <p className="mb-4 text-sm font-medium">Budget Allocation</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {budgetData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                {budgetData.map((b, i) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between text-xs text-[#5C6B82]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      {b.name}
                    </div>
                    <span>${b.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reimbursement modal */}
      {isReimburseFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsReimburseFormOpen(false)} />
          <form
            onSubmit={handleReimburseSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="mb-5 text-lg font-medium">Upload Bill for Reimbursement</h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
              className="mb-6 w-full rounded border p-2"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50"
                onClick={() => setIsReimburseFormOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm text-white hover:bg-green-700"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Donation modal */}
      <DonationModal project={project} open={showDonation} onClose={() => setShowDonation(false)} />
    </>
  );
}

// ───────────────────────────────────────────────
//  MAIN PROFILE PAGE
// ───────────────────────────────────────────────
export default function Profile() {
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newOverview, setNewOverview] = useState("");
  const [timeline, setTimeline] = useState(["", "", "", ""]);
  const [contributions, setContributions] = useState([]);
  const [budget, setBudget] = useState([0, 0, 0, 0]);
  const [fundingRequired, setFundingRequired] = useState(0);

  const userRole = typeof window !== "undefined" ? localStorage.getItem("userRole") || "contributor" : "contributor";

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const projects = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => !p.completed);
        setOngoingProjects(projects);
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    };
    fetchProjects();
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    const totalBudget = budget.reduce((a, b) => a + b, 0);

    const newProject = {
      title: newTitle.trim(),
      category: newCategory,
      overview: newOverview.trim(),
      timeline,
      contributions,
      budget,
      totalBudget,
      fundingRequired,
      progress: 0,
      completed: false,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "projects"), newProject);
      setOngoingProjects((prev) => [{ id: docRef.id, ...newProject }, ...prev]);
      setIsAddModalOpen(false);

      setNewTitle("");
      setNewCategory("");
      setNewOverview("");
      setTimeline(["", "", "", ""]);
      setContributions([]);
      setBudget([0, 0, 0, 0]);
      setFundingRequired(0);
    } catch (err) {
      console.error(err);
      alert("Could not create project");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-5 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Profile Header */}
        <section className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <img
                src="https://i.pravatar.cc/120?img=68"
                alt="Profile"
                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow"
              />
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#7FAAF5] text-xs text-white ring-2 ring-white">
                ✓
              </span>
            </div>
            <div className="flex-1">
              <h1 className="flex items-center gap-2 font-serif text-3xl">
                Luna Zhao <span className="text-[#7FAAF5]">✔</span>
              </h1>
              <p className="mt-1 text-sm text-gray-600">Digital Artist & Innovator</p>
              <p className="mt-3 max-w-xl text-sm text-gray-600">
                Creating interactive art and immersive experiences. Passionate about community-driven creation.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-xl bg-[#7FAAF5] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#6a9ce6]">
                  Hire Me
                </button>
                <button className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm hover:bg-gray-50">
                  Message
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Main grid */}
        <section className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[65%_35%]">
          <div className="space-y-10">
            {/* Ongoing Projects */}
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-serif text-2xl">Ongoing Projects</h2>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  + Add Project
                </button>
              </div>

              {ongoingProjects.length === 0 ? (
                <p className="text-gray-500">No ongoing projects yet.</p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {ongoingProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProject(p)}
                      className="cursor-pointer rounded-2xl border border-[#E1EAF8] bg-[#F9FBFF] p-5 transition hover:shadow-md"
                    >
                      <p className="font-medium">{p.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.overview}</p>
                      <span className="mt-2 inline-block rounded-full bg-[#7FAAF5]/10 px-3 py-0.5 text-xs text-[#5F93F3]">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Projects – mock */}
            <div>
              <h2 className="mb-5 font-serif text-2xl">Past Projects</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  { title: "Cosmic Symphony", subtitle: "Interactive audio-visual • 180 backers" },
                  { title: "Echoes of Eldoria", subtitle: "AR folklore experience • Funded in 9 days" },
                  { title: "DreamArchive v1.0", subtitle: "Participatory dream viz • 2024" },
                  { title: "Pixel Hymns", subtitle: "Generative art • SIGGRAPH" },
                ].map((p) => (
                  <div key={p.title} className="rounded-2xl border bg-white p-5">
                    <p className="font-medium">{p.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{p.subtitle}</p>
                    <span className="mt-2 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">
                      Funded
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analytics */}
          <aside className="space-y-6 rounded-3xl bg-[#F4F7FD] p-6">
            <h2 className="font-serif text-2xl">Creator Analytics</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm border">
                <p className="text-xs text-gray-500">Conversion Rate</p>
                <p className="mt-1 text-2xl font-semibold">4.8%</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border">
                <p className="text-xs text-gray-500">Avg Contribution</p>
                <p className="mt-1 text-2xl font-semibold">$3,200</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border">
              <p className="mb-3 text-sm font-medium">Views vs Contributions</p>
              <ChartContainer
                config={{
                  views: { label: "Views", color: "#7FAAF5" },
                  contributions: { label: "Contributions", color: "#B7CCF8" },
                }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analyticsData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8A9BB5" }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="views" stroke="#7FAAF5" fill="#7FAAF5" fillOpacity={0.15} />
                    <Area
                      type="monotone"
                      dataKey="contributions"
                      stroke="#B7CCF8"
                      fill="#B7CCF8"
                      fillOpacity={0.15}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </aside>
        </section>

        {/* Add Project Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="mb-6 text-xl font-semibold">Create New Project</h2>

              <form onSubmit={handleAddProject} className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium">Project Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Art">Art</option>
                    <option value="Education">Education</option>
                    <option value="Technology">Technology</option>
                    <option value="Entertainment">Entertainment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">Overview</label>
                  <textarea
                    value={newOverview}
                    onChange={(e) => setNewOverview(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Timeline Details</label>
                  {["Idea & Research", "Prototype", "Funding Phase", "Production & Launch"].map((label, i) => (
                    <div key={i} className="mt-3">
                      <p className="text-xs font-medium text-gray-600">{label}</p>
                      <input
                        type="text"
                        value={timeline[i]}
                        onChange={(e) => {
                          const next = [...timeline];
                          next[i] = e.target.value;
                          setTimeline(next);
                        }}
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        placeholder="Details / milestones..."
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Required Contributions</label>
                  <div className="flex flex-wrap gap-4">
                    {["Funding", "Mentorship", "Collaboration"].map((type) => (
                      <label key={type} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={contributions.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setContributions([...contributions, type]);
                            } else {
                              setContributions(contributions.filter((t) => t !== type));
                            }
                          }}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Budget Allocation (USD)</label>
                  {budgetLabels.map((label, i) => (
                    <div key={label} className="mt-3 flex items-center gap-3">
                      <span className="w-32 text-sm text-gray-600">{label}</span>
                      <input
                        type="number"
                        min="0"
                        value={budget[i]}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          const next = [...budget];
                          next[i] = val;
                          setBudget(next);
                        }}
                        className="w-full rounded-md border px-3 py-2"
                      />
                    </div>
                  ))}
                  <div className="mt-4 text-right text-sm font-medium">
                    Total: <span className="text-lg">${budget.reduce((a, b) => a + b, 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white hover:bg-blue-700"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Project Detail Modal */}
        {selectedProject && (
          <ProjectModal
            project={selectedProject}
            open={!!selectedProject}
            onClose={() => setSelectedProject(null)}
            userRole={userRole}
          />
        )}
      </div>
    </main>
  );
}