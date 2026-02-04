"use client";
import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

// ── STATIC ANALYTICS & MOCK DATA ──
const analyticsData = [
  { month: "Jan", views: 1200, contributions: 180 },
  { month: "Feb", views: 1600, contributions: 260 },
  { month: "Mar", views: 1400, contributions: 220 },
  { month: "Apr", views: 2000, contributions: 340 },
  { month: "May", views: 2400, contributions: 420 },
];

const contributionData = [
  { type: "Funding", value: 70 },
  { type: "Mentorship", value: 40 },
  { type: "Collaboration", value: 55 },
];

const COLORS = ["#7FAAF5", "#9DBAF7", "#B7CCF8", "#D6E2FF"];
const budgetLabels = ["Production", "Marketing", "Logistics", "Platform Fees"];
const projectStepsTemplate = [
  { id: 1, title: "Idea & Research", status: "completed", details: "" },
  { id: 2, title: "Prototype Development", status: "completed", details: "" },
  { id: 3, title: "Funding Phase", status: "active", details: "" },
  { id: 4, title: "Production & Launch", status: "pending", details: "" },
];

// ── PROJECT DETAILS MODAL ──
function ProjectModal({ projectId, open, onClose, userRole }) {
  const [project, setProject] = useState(null);
  const [budgetData, setBudgetData] = useState([]);
  const [projectSteps, setProjectSteps] = useState(projectStepsTemplate);
  const [currentStep, setCurrentStep] = useState(3);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;

    const fetchProject = async () => {
      try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProject(data);

          if (data.budget && data.budget.length === 4) {
            setBudgetData(
              budgetLabels.map((label, i) => ({ name: label, value: data.budget[i] }))
            );
          }

          if (data.timeline && data.timeline.length === 4) {
            const steps = projectStepsTemplate.map((step, idx) => ({
              ...step,
              details: data.timeline[idx],
            }));
            const activeStepId = steps.findIndex((s) => s.status === "active");
            setCurrentStep(activeStepId + 1);
            setProjectSteps(steps);
          }
        }
      } catch (err) {
        console.error("Error fetching project:", err);
      }
    };

    fetchProject();

    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, projectId, onClose]);

  if (!open || !project) return null;
  const activeStep = projectSteps.find((s) => s.id === currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[#E1EAF8] bg-white shadow-xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-[#E1EAF8] px-8 py-6">
          <div>
            <h2 className="font-serif text-2xl">{project.title}</h2>
            <p className="mt-1 text-sm text-[#5C6B82]">
              {project.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[#DCE6F7] px-3 py-1 text-sm hover:bg-[#F4F7FD]"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-1 gap-10 px-8 py-6 md:grid-cols-[60%_40%]">
          {/* LEFT */}
          <div className="space-y-8">
            <p className="text-sm text-[#5C6B82]">{project.overview}</p>

            {/* FUNDING */}
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

            {/* TIMELINE */}
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
                      {idx !== projectSteps.length - 1 && (
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

              {/* STEP DETAILS */}
              <div className="mt-4 rounded-xl border border-[#E1EAF8] bg-[#F9FBFF] p-4">
                <p className="text-sm font-medium">{activeStep.title}</p>
                <p className="mt-1 text-xs text-[#5C6B82]">{activeStep.details}</p>
              </div>
            </div>

            {/* CONTRIBUTIONS */}
            <div className="flex flex-wrap gap-2">
              {project.contributions?.map((c) => (
                <span key={c} className="rounded-full border border-[#DCE6F7] px-3 py-1 text-xs">{c}</span>
              ))}
            </div>

            {/* CTA BUTTONS */}
            <div className="flex gap-3 pt-4">
              {userRole === "creator" ? (
                <>
                  <button className="rounded-xl bg-green-500 px-6 py-3 text-sm text-white">
                    Invite via Email
                  </button>
                  <button className="rounded-xl border px-6 py-3 text-sm">
                    Reimburse from Contributors Pool
                  </button>
                </>
              ) : (
                <>
                  <button className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white">
                    Support Project
                  </button>
                  <button
                    className="rounded-xl border px-6 py-3 text-sm"
                    onClick={() => setIsChatOpen(true)}
                  >
                    Collaborate
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RIGHT — BUDGET DONUT */}
          <div className="rounded-2xl bg-[#F7FAFF] p-5 max-w-100">
            <p className="mb-4 text-sm font-medium">Budget Allocation</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={budgetData} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={4}>
                    {budgetData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* LEGEND */}
            <div className="mt-4 space-y-2">
              {budgetData.map((b, i) => (
                <div key={b.name} className="flex items-center justify-between text-xs text-[#5C6B82]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    {b.name}
                  </div>
                  <span>{b.value} USD</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE PAGE ──
export default function Profile() {
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newOverview, setNewOverview] = useState("");
  const [timeline, setTimeline] = useState(["", "", "", ""]);
  const [contributions, setContributions] = useState([]);
  const [budget, setBudget] = useState([0, 0, 0, 0]);
  const [fundingRequired, setFundingRequired] = useState(0);

  const [userRole, setUserRole] = useState(""); // ← ADDED: creator/contributor

  // Fetch user role from localStorage (set during onboarding)
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role) setUserRole(role);
  }, []);

  // Fetch ongoing projects dynamically
  useEffect(() => {
    const fetchOngoingProjects = async () => {
      try {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const projects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((p) => !p.completed);
        setOngoingProjects(projects);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOngoingProjects();
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    const totalBudget = budget.reduce((a, b) => a + b, 0);
    const project = {
      title: newTitle,
      category: newCategory,
      overview: newOverview,
      timeline,
      contributions,
      budget,          // stored in USD
      totalBudget,     // optional total
      fundingRequired,
      completed: false,
      createdAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(db, "projects"), project);
      setOngoingProjects((prev) => [{ id: docRef.id, ...project }, ...prev]);
      setNewTitle(""); setNewCategory(""); setNewOverview(""); setTimeline(["", "", "", ""]); setContributions([]); setBudget([0,0,0,0]); setFundingRequired(0);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add project");
    }
  };

  return (
    <main className="min-h-screen bg-blue-100 px-6 py-10 text-[#1E2A3B]">
      <div className="mx-auto max-w-6xl">
        {/* PROFILE HEADER — static mock */}
        <section className="rounded-3xl border border-[#E1EAF8] bg-white p-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <img src="https://i.pravatar.cc/120" alt="Profile" className="h-28 w-28 rounded-full border-4 border-white object-cover" />
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#7FAAF5] text-xs text-white">✓</span>
            </div>
            <div className="flex-1">
              <h1 className="flex items-center gap-2 font-serif text-3xl">Luna Zhao<span className="text-[#7FAAF5]">✔</span></h1>
              <p className="mt-1 text-sm text-[#5C6B82]">Digital Artist & Innovator</p>
              <p className="mt-3 max-w-xl text-sm text-[#5C6B82]">Creating interactive art and immersive experiences. Passionate about community-driven projects.</p>
              {/* CTA buttons (mock) */}
              <div className="mt-4 flex gap-3">
                <button className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white">Hire Me</button>
                <button className="rounded-xl border px-6 py-3 text-sm">Message</button>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN GRID */}
        <section className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[65%_35%]">
          <div className="space-y-10">
            {/* ONGOING PROJECTS — dynamic */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl">Ongoing Projects</h2>
                <button onClick={() => setIsModalOpen(true)} className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition">+ Add Project</button>
              </div>
              <div className="space-y-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {ongoingProjects.length > 0 ? ongoingProjects.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-[#E1EAF8] bg-[#F7FAFF] p-5 cursor-pointer hover:shadow-lg transition" onClick={() => setSelectedProjectId(p.id)}>
                    <p className="font-medium font-serif">{p.title}</p>
                    <p className="text-sm text-gray-400 font-bold">{p.overview}</p>
                    <span className="mt-1 inline-block rounded-full bg-[#7FAAF5]/10 px-3 py-0.5 text-xs text-[#5F93F3]">Active</span>
                  </div>
                )) : <p className="text-[#5C6B82]">No ongoing projects yet.</p>}
              </div>
            </div>

            {/* PAST PROJECTS — static mock */}
            <div>
              <h2 className="mb-4 font-serif text-xl">Past Projects</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[
                  { title: "Cosmic Symphony", subtitle: "Interactive audio-visual installation • 180 backers" },
                  { title: "Echoes of Eldoria", subtitle: "AR folklore experience • Fully funded in 9 days" },
                  { title: "DreamArchive v1.0", subtitle: "Participatory dream visualization • 2024" },
                  { title: "Pixel Hymns", subtitle: "Generative hymn generator • Exhibited at SIGGRAPH" },
                ].map((p) => (
                  <div key={p.title} className="rounded-2xl border border-[#E1EAF8] bg-white p-5">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-[#6B7C96] mt-0.5">{p.subtitle}</p>
                    <span className="mt-2 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">Successfully funded</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Analytics (static mock) */}
          <aside className="rounded-3xl bg-[#F4F7FD] p-6 space-y-6">
            <h2 className="font-serif text-xl">Creator Analytics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-4 border border-[#E1EAF8]">
                <p className="text-xs text-[#6B7C96]">Conversion Rate</p>
                <p className="font-serif text-xl">4.8%</p>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-[#E1EAF8]">
                <p className="text-xs text-[#6B7C96]">Avg Contribution</p>
                <p className="font-serif text-xl">₹3,200</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-[#E1EAF8]">
              <p className="mb-3 text-sm font-medium">Views vs Contributions</p>
              <ChartContainer config={{ views: { label: "Views", color: "#7FAAF5" }, contributions: { label: "Contributions", color: "#B7CCF8" } }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analyticsData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8A9BB5", fontSize: 12 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="views" stroke="#7FAAF5" fill="#7FAAF5" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="contributions" stroke="#B7CCF8" fill="#B7CCF8" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </aside>
        </section>

        {/* PROJECT MODAL */}
        {isModalOpen && (
          <div> 
            {isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsModalOpen(false)}>
    <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
      <h2 className="mb-4 text-xl font-semibold">Add New Project</h2>
      <form onSubmit={handleAddProject} className="space-y-4 overflow-y-auto max-h-[80vh]">
        {/* Project Title */}
        <div>
          <label className="text-sm font-medium">Project Title</label>
          <input
            type="text"
            placeholder="Enter project title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-md border px-3 py-2 mt-1"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full rounded-md border px-3 py-2 mt-1"
            required
          >
            <option value="">Select category</option>
            <option value="Art">Art</option>
            <option value="Education">Education</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Technology">Technology</option>
          </select>
        </div>

        {/* Project Overview */}
        <div>
          <label className="text-sm font-medium">Project Overview</label>
          <textarea
            placeholder="Brief overview of the project"
            value={newOverview}
            onChange={(e) => setNewOverview(e.target.value)}
            className="w-full rounded-md border px-3 py-2 mt-1"
            rows={3}
            required
          />
        </div>

        {/* Project Timeline */}
        <div>
          <label className="text-sm font-medium">Project Timeline</label>
          {["Idea & Research", "Prototype Development", "Funding Phase", "Production & Launch"].map((step, idx) => (
            <div key={step} className="mt-2">
              <p className="text-xs font-medium">{step}</p>
              <input
                type="text"
                placeholder={`Details for ${step}`}
                value={timeline[idx]}
                onChange={(e) => {
                  const newTimeline = [...timeline];
                  newTimeline[idx] = e.target.value;
                  setTimeline(newTimeline);
                }}
                className="w-full rounded-md border px-3 py-2 mt-1"
                required
              />
            </div>
          ))}
        </div>

        {/* Required Contributions */}
        <div>
          <label className="text-sm font-medium">Required Contributions</label>
          <div className="flex gap-4 mt-1">
            {["Funding", "Collaboration", "Mentorship"].map((c) => (
              <label key={c} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={contributions.includes(c)}
                  onChange={(e) => {
                    if (e.target.checked) setContributions([...contributions, c]);
                    else setContributions(contributions.filter((x) => x !== c));
                  }}
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* Budget Allocation */}
        <div>
          <label className="text-sm font-medium">Budget Allocation (USD)</label>
          {["Production", "Marketing", "Logistics", "Platform Fees"].map((b, idx) => (
            <div key={b} className="mt-2 flex items-center gap-2">
              <span className="w-28 text-xs">{b}</span>
              <input
                type="number"
                value={budget[idx]}
                onChange={(e) => {
                  const newBudget = [...budget];
                  newBudget[idx] = parseFloat(e.target.value) || 0;
                  setBudget(newBudget);
                }}
                className="w-full rounded-md border px-3 py-2"
                min={0}
                required
              />
              <span>USD</span>
            </div>
          ))}

          {/* Total Budget */}
          <div className="mt-4 text-right text-sm font-semibold">
            Total: <span className="text-lg">${budget.reduce((a, b) => a + b, 0)}</span> USD
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md border px-4 py-2 hover:bg-gray-100">Cancel</button>
          <button type="submit" className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">Add Project</button>
        </div>
      </form>
    </div>
  </div>
)}
          </div>
        )}

        {/* PROJECT DETAILS MODAL */}
        {selectedProjectId && (
          <ProjectModal
            projectId={selectedProjectId}
            open={!!selectedProjectId}
            onClose={() => setSelectedProjectId(null)}
            userRole={userRole}
          />
        )}
      </div>
    </main>
  );
}
