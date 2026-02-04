"use client";

import React, { useState, useEffect, useRef } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import DonationModal from "@/components/DonationModal";

const COLORS = ["#7FAAF5", "#9DBAF7", "#B7CCF8", "#D6E2FF"];
const budgetLabels = ["Production", "Marketing", "Logistics", "Platform Fees"];
const projectStepsTemplate = [
  { id: 1, title: "Idea & Research", status: "completed" },
  { id: 2, title: "Prototype Development", status: "completed" },
  { id: 3, title: "Funding Phase", status: "active" },
  { id: 4, title: "Production & Launch", status: "pending" },
];

export default function ProjectModal({ project, open, onClose, userRole }) {
  const [budgetData, setBudgetData] = useState([]);
  const [projectSteps, setProjectSteps] = useState(projectStepsTemplate);
  const [currentStep, setCurrentStep] = useState(3);
  const [isReimburseFormOpen, setIsReimburseFormOpen] = useState(false);
  const [billFile, setBillFile] = useState(null);
  const [showDonation, setShowDonation] = useState(false);
  
  const fileInputRef = useRef(null);
  const [uploadingStepId, setUploadingStepId] = useState(null);

  useEffect(() => {
    if (!open || !project) return;
    if (project.budget?.length === 4) {
      setBudgetData(budgetLabels.map((label, i) => ({ name: label, value: project.budget[i] })));
    }
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

  const handleEvidenceClick = (stepId) => {
    setUploadingStepId(stepId);
    fileInputRef.current?.click();
  };

  const handleEvidenceUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) alert(`Evidence for step ${uploadingStepId} ("${file.name}") selected!`);
  };

  const handleReimburseSubmit = (e) => {
    e.preventDefault();
    if (!billFile) return alert("Please upload a bill image first!");
    alert(`Bill "${billFile.name}" submitted for reimbursement! (mock)`);
    setIsReimburseFormOpen(false);
    setBillFile(null);
  };

  if (!open || !project) return null;
  const activeStep = projectSteps.find((s) => s.id === currentStep) || projectSteps[0];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[#E1EAF8] bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-[#E1EAF8] px-8 py-6">
            <div>
              <h2 className="font-serif text-2xl">{project.title}</h2>
              <p className="mt-1 text-sm text-[#5C6B82]">{project.category}</p>
            </div>
            <button onClick={onClose} className="rounded-full border border-[#DCE6F7] px-3 py-1 text-sm hover:bg-[#F4F7FD]">✕</button>
          </div>

          <div className="grid grid-cols-1 gap-10 px-8 py-6 md:grid-cols-[60%_40%]">
            <div className="space-y-8">
              <p className="text-sm text-[#5C6B82]">{project.overview}</p>
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
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEvidenceUpload} />
                <div className="flex items-center justify-between">
                  {projectSteps.map((step, idx) => (
                    <div key={step.id} className="flex flex-1 items-center">
                      <button onClick={() => setCurrentStep(step.id)} className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium ${step.id < currentStep ? "bg-[#7FAAF5] text-white border-[#7FAAF5]" : step.id === currentStep ? "border-[#7FAAF5] text-[#7FAAF5]" : "border-[#DCE6F7] text-[#7A8CA5]"}`}>{step.id}</button>
                      {idx < projectSteps.length - 1 && <div className={`mx-2 h-[2px] flex-1 ${step.id < currentStep ? "bg-[#7FAAF5]" : "bg-[#E1EAF8]"}`} />}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[#E1EAF8] bg-[#F9FBFF] p-4">
                  <div className="flex items-start justify-between">
                    <div><p className="text-sm font-medium">{activeStep.title}</p><p className="mt-1 text-xs text-[#5C6B82]">{activeStep.details}</p></div>
                    <button onClick={() => handleEvidenceClick(activeStep.id)} className="rounded-lg bg-white border border-[#DCE6F7] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7FAAF5] hover:bg-[#F4F7FD] transition shadow-sm">+ Evidence</button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {userRole === "creator" ? (
                  <>
                    <button className="rounded-xl bg-green-600 px-6 py-3 text-sm text-white" onClick={() => alert("Invite via Email (mock)")}>Invite via Email</button>
                    <button className="rounded-xl border border-gray-300 px-6 py-3 text-sm hover:bg-gray-50" onClick={() => setIsReimburseFormOpen(true)}>Reimburse from Pool</button>
                  </>
                ) : (
                  <>
                    <button className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white" onClick={() => setShowDonation(true)}>Support Project</button>
                    <button className="rounded-xl border border-gray-300 px-6 py-3 text-sm hover:bg-gray-50">Collaborate</button>
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
                      {budgetData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {budgetData.map((b, i) => (
                  <div key={b.name} className="flex items-center justify-between text-xs text-[#5C6B82]">
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />{b.name}</div>
                    <span>${b.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isReimburseFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsReimburseFormOpen(false)} />
          <form onSubmit={handleReimburseSubmit} className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-5 text-lg font-medium">Upload Bill for Reimbursement</h3>
            <input type="file" accept="image/*" onChange={(e) => setBillFile(e.target.files?.[0] ?? null)} className="mb-6 w-full rounded border p-2" />
            <div className="flex justify-end gap-3">
              <button type="button" className="rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50" onClick={() => setIsReimburseFormOpen(false)}>Cancel</button>
              <button type="submit" className="rounded-lg bg-green-600 px-5 py-2.5 text-sm text-white">Submit</button>
            </div>
          </form>
        </div>
      )}
      <DonationModal project={project} open={showDonation} onClose={() => setShowDonation(false)} />
    </>
  );
}