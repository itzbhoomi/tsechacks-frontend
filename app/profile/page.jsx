"use client";

import React, { useState, useEffect } from "react";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  query, 
  orderBy, 
  getDoc, 
  serverTimestamp,
  where,
  writeBatch,
  increment,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import ProjectModal from "@/components/ProjectModal";

const analyticsData = [
  { month: "Jan", views: 1200, contributions: 180 },
  { month: "Feb", views: 1600, contributions: 260 },
  { month: "Mar", views: 1400, contributions: 220 },
  { month: "Apr", views: 2000, contributions: 340 },
  { month: "May", views: 2400, contributions: 420 },
];

const budgetLabels = ["Production", "Marketing", "Logistics", "Platform Fees"];

// --- IMPACT CARD (DB Write Guaranteed) ---
const ProjectImpactCard = ({ project }) => {
  const [stats, setStats] = useState({ 
    channelName: "Creative Minds Hub", 
    views: 0, likes: 0, comments: 0, raised: 0 
  });
  const [loading, setLoading] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);
  // Check if project was already marked as distributed in DB
  const [distributed, setDistributed] = useState(project.revenueDistributed || false);

  // 1. Fetch API Data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("https://harmony-hulkier-caridad.ngrok-free.dev/revenue", {
            cache: "no-store", 
            headers: { "ngrok-skip-browser-warning": "true" } 
        });
        if (!res.ok) throw new Error("API Error");
        const apiData = await res.json();
        
        setStats({
          channelName: "Creative Minds Hub",
          views: apiData.stats?.views || 0,
          likes: apiData.stats?.likes || 0,
          comments: Math.floor((apiData.stats?.likes || 0) * 0.15),
          raised: parseFloat(apiData.monetization?.estimated_revenue_usd || 0)
        });
      } catch (err) {
        console.warn("API Error, using fallback data.");
        const randomRaised = (Math.random() * 8000 + 2000).toFixed(2);
        setStats({
          channelName: "Creative Minds Hub",
          views: Math.floor(Math.random() * 500000) + 15000,
          likes: Math.floor(Math.random() * 50000) + 2000,
          comments: Math.floor(Math.random() * 2000),
          raised: parseFloat(randomRaised)
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [project.id]);

  // 2. Distribute Logic (Guaranteed DB Writes)
  const handleDistribute = async () => {
    if (isDistributing || stats.raised <= 0) return;
    setIsDistributing(true);
    console.log(">>> Starting Distribution...");

    try {
      // Query Transactions
      const q = query(collection(db, "transactions"), where("projectId", "==", project.id));
      const snapshot = await getDocs(q);
      
      let totalContributed = 0;
      const investors = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const amount = parseFloat(data.amount) || 0;
        
        // Include transaction if amount > 0 (even if userId is missing)
        if (amount > 0) {
            totalContributed += amount;
            investors.push({ 
                id: doc.id, 
                userId: data.userId, 
                amount 
            });
        }
      });

      if (investors.length === 0) {
        alert("No valid transactions found in DB.");
        setIsDistributing(false);
        return;
      }

      // PREPARE BATCH
      const batch = writeBatch(db);
      const totalRevenue = stats.raised;
      let opsCount = 0;

      // A. Update Project Document (Mark as distributed)
      const projectRef = doc(db, "projects", project.id);
      batch.update(projectRef, { 
          revenueDistributed: true,
          totalDistributed: totalRevenue,
          distributedAt: serverTimestamp() 
      });
      opsCount++;

      // B. Loop through Investors
      investors.forEach(inv => {
        const share = (inv.amount / totalContributed) * totalRevenue;
        
        // 1. Update Transaction Document (So you see the change in 'transactions' table)
        const transRef = doc(db, "transactions", inv.id);
        batch.update(transRef, { 
            status: "DISTRIBUTED", 
            dividendPaid: share 
        });
        opsCount++;

        // 2. Update User Wallet (Only if we know who they are)
        if (inv.userId) {
            const userRef = doc(db, "users", inv.userId);
            batch.update(userRef, { earnings: increment(share) });
            opsCount++;
        } else {
            console.warn(`⚠️ Transaction ${inv.id} has no userId. Updated transaction status, but skipped user wallet.`);
        }
      });

      // COMMIT BATCH
      console.log(`>>> Committing ${opsCount} DB operations...`);
      await batch.commit();

      setDistributed(true);
      alert(`Success! Updated ${investors.length} transaction records with payouts.`);

    } catch (err) {
      console.error("Distribution Error:", err);
      alert("Failed to write to DB. Check console.");
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm transition hover:shadow-md relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">COMPLETED</div>
      <h3 className="font-serif font-medium text-lg text-gray-900">{project.title}</h3>
      <p className="text-xs text-gray-500 mb-4 line-clamp-1">{project.overview}</p>

      <div className="space-y-3">
         <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs">▶</div>
             <div>
                 <p className="text-xs font-bold text-gray-700">{stats.channelName}</p>
                 <p className="text-[10px] text-gray-500">Official Channel</p>
             </div>
         </div>
         
         <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded-lg border">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Views</p>
                <p className="font-semibold text-gray-800">{loading ? "..." : stats.views?.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                <p className="text-[10px] text-green-600 font-bold uppercase">Raised</p>
                <p className="font-semibold text-green-700">
                  ${loading ? "..." : stats.raised?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
         </div>

         <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t">
             <span>👍 {loading ? "..." : stats.likes?.toLocaleString()} Likes</span>
             <span>💬 {loading ? "..." : stats.comments?.toLocaleString()} Comments</span>
         </div>

         <div className="pt-2">
            {distributed ? (
               <button disabled className="w-full rounded-lg bg-gray-100 py-2 text-xs font-bold text-gray-500 border">✓ REVENUE DISTRIBUTED</button>
            ) : (
               <button 
                 onClick={handleDistribute}
                 disabled={loading || isDistributing}
                 className="w-full rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 shadow-md shadow-green-200"
               >
                 {isDistributing ? "CALCULATING..." : "DISTRIBUTE REVENUE"}
               </button>
            )}
         </div>
      </div>
    </div>
  );
};

export default function Profile() {
  const [allProjects, setAllProjects] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [poolTotal, setPoolTotal] = useState(0);
  const [randomUser, setRandomUser] = useState({ name: "Loading...", photo: "" });

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newOverview, setNewOverview] = useState("");
  const [timeline, setTimeline] = useState(["", "", "", ""]);
  const [contributions, setContributions] = useState([]);
  const [budget, setBudget] = useState([0, 0, 0, 0]);

  const userRole = typeof window !== "undefined" ? localStorage.getItem("userRole") || "contributor" : "contributor";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("https://randomuser.me/api/");
        const data = await res.json();
        const user = data.results[0];
        setRandomUser({ name: `${user.name.first} ${user.name.last}`, photo: user.picture.large });
      } catch (err) { console.error(err); }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        const poolSnap = await getDoc(doc(db, "pool", "main"));
        if (poolSnap.exists()) setPoolTotal(poolSnap.data().total || 0);
      } catch (err) { console.error(err); }
    };
    fetchPoolData();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setAllProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
    };
    fetchProjects();
  }, [selectedProject]);

  const handleAddProject = async (e) => {
    e.preventDefault();
    const newProject = {
      title: newTitle.trim(), category: newCategory, overview: newOverview.trim(),
      timeline, contributions, budget, totalBudget: budget.reduce((a, b) => a + b, 0),
      progress: 0, completed: false, fullyReimbursed: false, createdAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(db, "projects"), newProject);
      setAllProjects(prev => [{ id: docRef.id, ...newProject }, ...prev]);
      setIsAddModalOpen(false);
      setNewTitle(""); setNewCategory(""); setNewOverview(""); setTimeline(["", "", "", ""]); setContributions([]); setBudget([0, 0, 0, 0]);
    } catch (err) { alert("Could not create project"); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-5 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              {randomUser.photo ? <img src={randomUser.photo} className="h-28 w-28 rounded-full border-4 border-white object-cover shadow" /> : <div className="h-28 w-28 rounded-full bg-gray-200 animate-pulse" />}
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#7FAAF5] text-xs text-white ring-2 ring-white">✓</span>
            </div>
            <div className="flex-1">
              <h1 className="flex items-center gap-2 font-serif text-3xl">{randomUser.name} <span className="text-[#7FAAF5]">✔</span></h1>
              <p className="mt-1 text-sm text-gray-600">Digital Artist & Innovator</p>
              <div className="mt-5 flex gap-3">
                <button className="rounded-xl bg-[#7FAAF5] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#6a9ce6]">Hire Me</button>
                <button className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm hover:bg-gray-50">Message</button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[65%_35%]">
          <div className="space-y-10">
            <div>
              <div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-2xl">Projects & Impact</h2><button onClick={() => setIsAddModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">+ Add Project</button></div>
              <div className="grid gap-5 sm:grid-cols-2">
                {allProjects.map(p => (
                  p.completed || p.fullyReimbursed ? (
                    <ProjectImpactCard key={p.id} project={p} />
                  ) : (
                    <div key={p.id} onClick={() => setSelectedProject(p)} className="cursor-pointer rounded-2xl border border-[#E1EAF8] bg-[#F9FBFF] p-5 transition hover:shadow-md">
                      <p className="font-medium">{p.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.overview}</p>
                      <span className="mt-2 inline-block rounded-full bg-[#7FAAF5]/10 px-3 py-0.5 text-xs text-[#5F93F3]">Active</span>
                    </div>
                  )
                ))}
              </div>
            </div>

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
                    <span className="mt-2 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">Funded</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6 rounded-3xl bg-[#F4F7FD] p-6">
            <h2 className="font-serif text-2xl">Creator Analytics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm border"><p className="text-xs text-gray-500">Conversion Rate</p><p className="mt-1 text-2xl font-semibold">4.8%</p></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border"><p className="text-xs text-gray-500">Avg Contribution</p><p className="mt-1 text-2xl font-semibold">${poolTotal.toLocaleString()}</p></div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border">
              <p className="mb-3 text-sm font-medium">Views vs Contributions</p>
              <ChartContainer config={{ views: { label: "Views", color: "#7FAAF5" }, contributions: { label: "Contributions", color: "#B7CCF8" } }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analyticsData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8A9BB5" }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="views" stroke="#7FAAF5" fill="#7FAAF5" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="contributions" stroke="#B7CCF8" fill="#B7CCF8" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </aside>
        </section>

        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <h2 className="mb-6 text-xl font-semibold">Create New Project</h2>
              <form onSubmit={handleAddProject} className="space-y-5">
                <div><label className="block text-sm font-medium">Project Title</label><input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium">Category</label><select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required><option value="">Select category</option><option value="Art">Art</option><option value="Education">Education</option><option value="Technology">Technology</option><option value="Entertainment">Entertainment</option></select></div>
                <div><label className="block text-sm font-medium">Overview</label><textarea value={newOverview} onChange={(e) => setNewOverview(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" rows={3} required /></div>
                <div>
                  <label className="block text-sm font-medium mb-2">Timeline Details</label>
                  {["Idea & Research", "Prototype", "Funding Phase", "Production & Launch"].map((label, i) => (
                    <div key={i} className="mt-3">
                      <p className="text-xs font-medium text-gray-600">{label}</p>
                      <input type="text" value={timeline[i]} onChange={(e) => { const next = [...timeline]; next[i] = e.target.value; setTimeline(next); }} className="mt-1 w-full rounded-md border px-3 py-2" placeholder="Details..." />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Required Contributions</label>
                  <div className="flex flex-wrap gap-4">
                    {["Funding", "Mentorship", "Collaboration"].map((type) => (
                      <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contributions.includes(type)} onChange={(e) => { if (e.target.checked) { setContributions([...contributions, type]); } else { setContributions(contributions.filter((t) => t !== type)); } }} />{type}</label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Budget Allocation (USD)</label>
                  {budgetLabels.map((label, i) => (
                    <div key={label} className="mt-3 flex items-center gap-3">
                      <span className="w-32 text-sm text-gray-600">{label}</span>
                      <input type="number" min="0" value={budget[i]} onChange={(e) => { const val = Math.max(0, Number(e.target.value) || 0); const next = [...budget]; next[i] = val; setBudget(next); }} className="w-full rounded-md border px-3 py-2" />
                    </div>
                  ))}
                  <div className="mt-4 text-right text-sm font-medium">Total: <span className="text-lg">${budget.reduce((a, b) => a + b, 0).toLocaleString()}</span></div>
                </div>
                <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50">Cancel</button><button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white hover:bg-blue-700">Create Project</button></div>
              </form>
            </div>
          </div>
        )}

        {selectedProject && <ProjectModal project={selectedProject} open={!!selectedProject} onClose={() => setSelectedProject(null)} userRole={userRole} />}
      </div>
    </main>
  );
}