"use client";
import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

// ── ANALYTICS DATA (UNTOUCHED) ──
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

// ───────────────────────────────────────────────

export default function Profile() {
  return (
    <main className="min-h-screen bg-blue-100 px-6 py-10 text-[#1E2A3B]">
      <div className="mx-auto max-w-6xl">
        {/* PROFILE HEADER –– added longer bio + verified badge feel */}
        {/* Header Card */}
        <section className="rounded-3xl border border-[#E1EAF8] bg-white p-8">
          <div className="flex items-center gap-6">

            {/* Avatar */}
            <div className="relative">
              <img
                src="https://i.pravatar.cc/120"
                alt="Profile"
                className="h-28 w-28 rounded-full border-4 border-white object-cover"
              />
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#7FAAF5] text-xs text-white">
                ✓
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="flex items-center gap-2 font-serif text-3xl">
                Luna Zhao
                <span className="text-[#7FAAF5]">✔</span>
              </h1>
              <p className="mt-1 text-sm text-[#5C6B82]">
                Digital Artist & Innovator
              </p>
              <p className="mt-3 max-w-xl text-sm text-[#5C6B82]">
                Creating interactive art and immersive experiences.
                Passionate about community-driven projects.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 text-[#5C6B82]">
              <button className="rounded-full w-10 border border-[#DCE6F7] p-2 bg-blue-200">✕</button>
              <button className="rounded-full w-10 border border-[#DCE6F7] p-2 bg-blue-200">◎</button>
              <button className="rounded-full w-10 border border-[#DCE6F7] p-2 bg-white">↗</button>
            </div>
          </div>
        </section>

        {/* MAIN GRID */}
        <section className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[65%_35%]">
          {/* LEFT COLUMN */}
          <div className="space-y-10">
            {/* ONGOING PROJECTS –– more entries + varied roles */}
            <div>
              <h2 className="mb-4 font-serif text-xl">Ongoing Projects</h2>
              <div className="space-y-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {[
                  { title: "Living Canvas – Season 2", role: "Lead Artist & Creative Technologist" },
                  { title: "Neon Cities AR Public Beta", role: "Creative Director" },
                  { title: "Memory Weavers – Collective NFT Edition", role: "Worldbuilding & Visual Lead" },
                  { title: "Fragments of Tomorrow", role: "Co-founder & Art Direction" },
                ].map((p) => (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-[#E1EAF8] bg-[#F7FAFF] p-5"
                  >
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-[#6B7C96]">{p.role}</p>
                    <span className="mt-1 inline-block rounded-full bg-[#7FAAF5]/10 px-3 py-0.5 text-xs text-[#5F93F3]">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PAST PROJECTS –– more entries + richer info */}
            <div>
              <h2 className="mb-4 font-serif text-xl">Past Projects</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[
                  {
                    title: "Cosmic Symphony",
                    subtitle: "Interactive audio-visual installation • 180 backers",
                  },
                  {
                    title: "Echoes of Eldoria",
                    subtitle: "AR folklore experience • Fully funded in 9 days",
                  },
                  {
                    title: "DreamArchive v1.0",
                    subtitle: "Participatory dream visualization • 2024",
                  },
                  {
                    title: "Pixel Hymns",
                    subtitle: "Generative hymn generator • Exhibited at SIGGRAPH",
                  },
                ].map((p) => (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-[#E1EAF8] bg-white p-5"
                  >
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-[#6B7C96] mt-0.5">{p.subtitle}</p>
                    <span className="mt-2 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">
                      Successfully funded
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — ANALYTICS (completely untouched) */}
          <aside className="rounded-3xl bg-[#F4F7FD] p-6 space-y-6">
            <h2 className="font-serif text-xl">Creator Analytics</h2>

            {/* KPI CARDS */}
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

            {/* AREA CHART */}
            <div className="rounded-2xl bg-white p-5 border border-[#E1EAF8]">
              <p className="mb-3 text-sm font-medium">
                Views vs Contributions
              </p>
              <ChartContainer
                config={{
                  views: { label: "Views", color: "#7FAAF5" },
                  contributions: { label: "Contributions", color: "#B7CCF8" },
                }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analyticsData}>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8A9BB5", fontSize: 12 }}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#7FAAF5"
                      fill="#7FAAF5"
                      fillOpacity={0.15}
                    />
                    <Area
                      type="monotone"
                      dataKey="contributions"
                      stroke="#B7CCF8"
                      fill="#B7CCF8"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* BAR CHART */}
            <div className="rounded-2xl bg-white p-5 border border-[#E1EAF8]">
              <p className="mb-3 text-sm font-medium">
                Contribution Types
              </p>
              <ChartContainer
                config={{
                  value: { label: "Contribution %" },
                }}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={contributionData}>
                    <XAxis
                      dataKey="type"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8A9BB5", fontSize: 12 }}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      radius={[8, 8, 0, 0]}
                      fill="#7FAAF5"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}