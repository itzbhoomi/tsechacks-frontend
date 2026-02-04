"use client";

import { useState } from "react";
import ProjectModal from "@/components/ProjectModal";

const projects = [
  {
    id: 1,
    title: "Echoes of the River",
    creator: "Aarav Mehta",
    category: "Art",
    progress: 68,
    contributions: ["Funding", "Collaboration"],
  },
  {
    id: 2,
    title: "Open Learn Toolkit",
    creator: "Nisha Verma",
    category: "Education",
    progress: 42,
    contributions: ["Mentorship", "Collaboration"],
  },
  {
    id: 3,
    title: "Indie Documentary Lab",
    creator: "Rohan Kapoor",
    category: "Entertainment",
    progress: 81,
    contributions: ["Funding"],
  },
];

export default function Dashboard() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProject, setSelectedProject] = useState(null);

  const categories = ["All", "Art", "Education", "Entertainment", "Technology"];

  return (
    <div className="min-h-screen bg-blue-100 font-sans text-[#1E2A3B]">
      <main className="mx-auto max-w-6xl px-8 py-20">

        {/* Hero */}
        <section className="relative rounded-3xl border border-[#E1EAF8] bg-gradient-to-br from-[#F4F7FD] to-white p-12">
          <a
            href="/profile"
            className="absolute right-6 top-6 flex items-center gap-2 rounded-xl border border-[#DCE6F7] bg-white px-4 py-2 text-sm font-medium text-[#1E2A3B] hover:bg-[#F4F7FD]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF4FF] text-xs font-semibold text-[#7FAAF5]">
              👤
            </span>
            Profile
          </a>

          <h1 className="font-serif text-4xl leading-tight">
            Discover creative projects
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-[#5C6B82]">
            Explore thoughtfully built projects seeking funding,
            collaboration, and long-term support.
          </p>
        </section>

        {/* Search + Filters */}
        <section className="mt-14 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <input
            placeholder="Search projects, creators, or ideas"
            className="w-full rounded-full border border-[#DCE6F7] bg-white px-6 py-3 text-sm placeholder-[#8A9BB5] focus:outline-none focus:ring-2 focus:ring-[#7FAAF5]/30 md:max-w-md"
          />

          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                  activeCategory === cat
                    ? "border-[#7FAAF5] bg-[#EEF4FF]"
                    : "border-[#DCE6F7] text-[#5C6B82] hover:bg-[#F4F7FD]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Project Grid */}
        <section className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {projects
            .filter(
              (p) =>
                activeCategory === "All" || p.category === activeCategory
            )
            .map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="cursor-pointer rounded-3xl border border-[#E1EAF8] bg-white p-8 transition hover:bg-[#FAFBFF]"
              >
                <span className="inline-block rounded-full bg-[#EEF4FF] px-4 py-1 text-xs font-medium text-[#5C6B82]">
                  {project.category}
                </span>

                <h3 className="mt-4 font-serif text-xl">
                  {project.title}
                </h3>

                <p className="mt-1 text-sm text-[#7A8CA5]">
                  by {project.creator}
                </p>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-xs text-[#7A8CA5]">
                    <span>Funding progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#E1EAF8]">
                    <div
                      className="h-2 rounded-full bg-[#7FAAF5]"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {project.contributions.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-[#DCE6F7] px-3 py-1 text-xs text-[#5C6B82]"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </section>

        {/* Modal */}
        <ProjectModal
          project={selectedProject}
          open={!!selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      </main>
    </div>
  );
}
