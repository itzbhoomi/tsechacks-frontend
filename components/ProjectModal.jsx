"use client"

import { useEffect, useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const budgetData = [
  { name: "Production", value: 45 },
  { name: "Marketing", value: 25 },
  { name: "Logistics", value: 15 },
  { name: "Platform Fees", value: 15 },
]

const COLORS = ["#7FAAF5", "#9DBAF7", "#B7CCF8", "#D6E2FF"]

const projectSteps = [
  {
    id: 1,
    title: "Idea & Research",
    status: "completed",
    details:
      "Concept finalized, feasibility validated, early community feedback collected.",
  },
  {
    id: 2,
    title: "Prototype Development",
    status: "completed",
    details:
      "Initial prototype built, creative direction locked, collaborators onboarded.",
  },
  {
    id: 3,
    title: "Funding Phase",
    status: "active",
    details:
      "Raising funds and forming strategic partnerships to scale production.",
  },
  {
    id: 4,
    title: "Production & Launch",
    status: "pending",
    details:
      "Final production, distribution planning, and public launch.",
  },
]

export default function ProjectModal({ project, open, onClose }) {
  const [currentStep, setCurrentStep] = useState(
    projectSteps.find((s) => s.status === "active")?.id || 1
  )

  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [open, onClose])

  if (!open || !project) return null

  const activeStep = projectSteps.find((s) => s.id === currentStep)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[#E1EAF8] bg-white shadow-xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-[#E1EAF8] px-8 py-6">
          <div>
            <h2 className="font-serif text-2xl">{project.title}</h2>
            <p className="mt-1 text-sm text-[#5C6B82]">
              by {project.creator} · {project.category}
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
            <p className="text-sm text-[#5C6B82]">
              A thoughtfully crafted creative project exploring new
              storytelling formats and community-backed production.
            </p>

            {/* FUNDING */}
            <div>
              <div className="mb-2 flex justify-between text-xs text-[#7A8CA5]">
                <span>Funding progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#E1EAF8]">
                <div
                  className="h-2 rounded-full bg-[#7FAAF5]"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            {/* 🔹 HORIZONTAL STEPPER */}
            <div>
              <p className="mb-4 text-sm font-medium">Project Timeline</p>

              <div className="flex items-center justify-between">
                {projectSteps.map((step, idx) => {
                  const isActive = step.id === currentStep
                  const isComplete = step.id < currentStep

                  return (
                    <div key={step.id} className="flex flex-1 items-center">
                      <button
                        onClick={() => setCurrentStep(step.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium
                          ${
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
                  )
                })}
              </div>

              {/* STEP DETAILS */}
              <div className="mt-4 rounded-xl border border-[#E1EAF8] bg-[#F9FBFF] p-4">
                <p className="text-sm font-medium">{activeStep.title}</p>
                <p className="mt-1 text-xs text-[#5C6B82]">
                  {activeStep.details}
                </p>
              </div>
            </div>

            {/* CONTRIBUTIONS */}
            <div className="flex flex-wrap gap-2">
              {project.contributions.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-[#DCE6F7] px-3 py-1 text-xs"
                >
                  {c}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-4">
              <button className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white">
                Support Project
              </button>
              <button className="rounded-xl border px-6 py-3 text-sm">
                Collaborate
              </button>
            </div>
          </div>

          {/* RIGHT */}
          {/* RIGHT — BUDGET DONUT */}
<div className="rounded-2xl bg-[#F7FAFF] p-5 max-w-100">
  <p className="mb-4 text-sm font-medium">
    Budget Allocation
  </p>

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
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>

  {/* LEGEND */}
  <div className="mt-4 space-y-2">
    {budgetData.map((b, i) => (
      <div
        key={b.name}
        className="flex items-center justify-between text-xs text-[#5C6B82]"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: COLORS[i] }}
          />
          {b.name}
        </div>
        <span>{b.value}%</span>
      </div>
    ))}
  </div>
</div>

        </div>
      </div>
    </div>
  )
}
