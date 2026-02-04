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
  setDoc,
  increment,
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

const COLORS = ["#7FAAF5", "#9DBAF7", "#B7CCF8", "#D6E2FF"];
const budgetLabels = ["Production", "Marketing", "Logistics", "Platform Fees"];
const projectStepsTemplate = [
  { id: 1, title: "Idea & Research", status: "completed", details: "" },
  { id: 2, title: "Prototype Development", status: "completed", details: "" },
  { id: 3, title: "Funding Phase", status: "active", details: "" },
  { id: 4, title: "Production & Launch", status: "pending", details: "" },
];

// ── DONATION MODAL ──
function DonationModal({ project, open, onClose }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handlePreset = (val) => setAmount(val.toString());

  const handleConfirmPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) return alert("Please enter a valid amount");
    setLoading(true);

    try {
      const response = await fetch("https://api.fmm.finternetlab.io/api/v1/payment-intents", {
        method: "POST",
        headers: {
          "X-API-Key": "sk_hackathon_bea2ab2910e59eb4522d62cfa9f60438",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount).toFixed(2),
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
        const numericAmount = parseFloat(amount);
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

        const poolRef = doc(db, "pool", "main");
        await setDoc(poolRef, {
          total: increment(numericAmount),
          lastUpdated: serverTimestamp()
        }, { merge: true });

        window.location.href = result.data.paymentUrl;
      } else {
        alert("Failed to initiate payment.");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-serif text-xl">Support {project.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="mb-6 flex flex-col items-center justify-center rounded-2xl bg-[#F7FAFF] py-8 border border-[#E1EAF8]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7FAAF5]">Enter Amount</p>
          <div className="flex items-baseline text-[#1E2A3B]">
            <span className="text-3xl font-bold">$</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-32 bg-transparent text-center text-5xl font-bold outline-none"
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
          className="w-full rounded-xl bg-[#1E2A3B] py-4 font-medium text-white disabled:opacity-70"
        >
          {loading ? "Processing..." : `Donate $${amount || "0"}`}
        </button>
      </div>
    </div>
  );
}

// ── PROJECT DETAILS MODAL ──
function ProjectModal({ projectId, open, onClose, userRole }) {
  const [project, setProject] = useState(null);
  const [budgetData, setBudgetData] = useState([]);
  const [projectSteps, setProjectSteps] = useState(projectStepsTemplate);
  const [currentStep, setCurrentStep] = useState(3);
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    const fetchProject = async () => {
      try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProject({ id: docSnap.id, ...data });
          const safeBudget = data.budget || [0, 0, 0, 0];
          setBudgetData(budgetLabels.map((label, i) => ({ name: label, value: safeBudget[i] })));
          const safeTimeline = data.timeline || ["", "", "", ""];
          const steps = projectStepsTemplate.map((step, idx) => ({ ...step, details: safeTimeline[idx] }));
          setProjectSteps(steps);
        }
      } catch (err) { console.error(err); }
    };
    fetchProject();
  }, [open, projectId]);

  if (!open || !project) return null;
  const activeStep = projectSteps.find((s) => s.id === currentStep);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[#E1EAF8] bg-white shadow-xl overflow-hidden">
          <div className="flex items-start justify-between border-b border-[#E1EAF8] px-8 py-6">
            <div>
              <h2 className="font-serif text-2xl">{project.title}</h2>
              <p className="mt-1 text-sm text-[#5C6B82]">{project.category || "Uncategorized"}</p>
            </div>
            <button onClick={onClose} className="rounded-full border border-[#DCE6F7] px-3 py-1 text-sm hover:bg-[#F4F7FD]">✕</button>
          </div>

          <div className="grid grid-cols-1 gap-10 px-8 py-6 md:grid-cols-[60%_40%] max-h-[80vh] overflow-y-auto">
            <div className="space-y-8">
              <p className="text-sm text-[#5C6B82]">{project.overview || "No overview available."}</p>
              <div>
                <div className="mb-2 flex justify-between text-xs text-[#7A8CA5]">
                  <span>Funding progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E1EAF8]">
                  <div className="h-2 rounded-full bg-[#7FAAF5]" style={{ width: `${project.progress || 0}%` }} />
                </div>
              </div>

              <div>
                <p className="mb-4 text-sm font-medium">Project Timeline</p>
                <div className="flex items-center justify-between">
                  {projectSteps.map((step, idx) => {
                    const isComplete = step.id < currentStep;
                    return (
                      <div key={step.id} className="flex flex-1 items-center">
                        <button onClick={() => setCurrentStep(step.id)} className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${isComplete ? "bg-[#7FAAF5] text-white" : "text-[#7A8CA5]"}`}>
                          {step.id}
                        </button>
                        {idx !== projectSteps.length - 1 && <div className={`mx-2 h-[2px] flex-1 ${isComplete ? "bg-[#7FAAF5]" : "bg-[#E1EAF8]"}`} />}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-xl border border-[#E1EAF8] bg-[#F9FBFF] p-4">
                  <p className="text-sm font-medium">{activeStep?.title}</p>
                  <p className="mt-1 text-xs text-[#5C6B82]">{activeStep?.details}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {userRole === "creator" ? (
                  <>
                    <button className="rounded-xl bg-green-500 px-6 py-3 text-sm text-white">Invite via Email</button>
                    <button className="rounded-xl border px-6 py-3 text-sm">Reimburse</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsDonationOpen(true)} className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white">Support Project</button>
                    <button className="rounded-xl border px-6 py-3 text-sm">Collaborate</button>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-[#F7FAFF] p-5">
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
      <DonationModal project={project} open={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
    </>
  );
}

// ── PROFILE PAGE ──
export default function Profile() {
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [profileName, setProfileName] = useState("Loading...");
  const [userRole, setUserRole] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newOverview, setNewOverview] = useState("");
  const [timeline, setTimeline] = useState(["", "", "", ""]);
  const [contributions, setContributions] = useState([]);
  const [budget, setBudget] = useState([0, 0, 0, 0]);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole") || "contributor");
    const fetchRandomName = async () => {
      try {
        const res = await fetch(`https://jsonplaceholder.typicode.com/users/${Math.floor(Math.random() * 10) + 1}`);
        const data = await res.json();
        setProfileName(data.name);
      } catch (err) { setProfileName("User"); }
    };
    fetchRandomName();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setOngoingProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProjects();
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    const project = {
      title: newTitle, category: newCategory, overview: newOverview,
      timeline, contributions, budget, completed: false, createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "projects"), project);
    setIsModalOpen(false);
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-blue-100 px-6 py-10 text-[#1E2A3B]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-[#E1EAF8] bg-white p-8 mb-12">
          <div className="flex items-center gap-6">
            <img src="https://i.pravatar.cc/120" className="h-28 w-28 rounded-full" alt="profile" />
            <div className="flex-1">
              <h1 className="font-serif text-3xl">{profileName}</h1>
              <p className="text-sm text-[#5C6B82]">Digital Artist & Innovator</p>
              <div className="mt-4 flex gap-3">
                <button className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white">Hire Me</button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-[65%_35%]">
          <div className="space-y-10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl">Ongoing Projects</h2>
                <button onClick={() => setIsModalOpen(true)} className="rounded-lg bg-blue-500 px-4 py-2 text-white">+ Add Project</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ongoingProjects.map(p => (
                  <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="rounded-2xl border bg-white p-5 cursor-pointer">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-gray-400 truncate">{p.overview}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl bg-[#F4F7FD] p-6 space-y-6">
            <h2 className="font-serif text-xl">Analytics</h2>
            <div className="rounded-2xl bg-white p-5 border border-[#E1EAF8]">
              {/* FIX: Wrap with ChartContainer and pass a config object */}
              <ChartContainer config={{ views: { label: "Views", color: "#7FAAF5" } }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analyticsData}>
                    <XAxis dataKey="month" hide />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="views" fill="var(--color-views)" stroke="var(--color-views)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </aside>
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Add New Project</h2>
              <form onSubmit={handleAddProject} className="space-y-4">
                <input type="text" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border p-2 rounded" required />
                <textarea placeholder="Overview" value={newOverview} onChange={e => setNewOverview(e.target.value)} className="w-full border p-2 rounded" required />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="border px-4 py-2 rounded">Cancel</button>
                  <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

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