"use client";

import React, { useState, useEffect, useRef } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import DonationModal from "./DonationModal";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

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
  
  // Progress, Loading & Verification State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  
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
    setVerificationResult(null); // Reset previous result
    setUploadingStepId(stepId);
    fileInputRef.current?.click();
  };

  const handleEvidenceUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `evidence/${project.id}/${uploadingStepId}_${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        alert("Upload failed.");
        setIsUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Prepare Payload for your Verify Bill API
        const payload = {
          image_url: downloadURL,
          milestone_title: activeStep.title,
          milestone_description: activeStep.details
        };

        try {
          const response = await fetch("https://harmony-hulkier-caridad.ngrok-free.dev/verify-bill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          
          const result = await response.json();
          setVerificationResult(result); // Store the response (is_appropriate, reasoning, etc.)
          
        } catch (err) {
          console.error("Verification API error:", err);
          alert("Evidence uploaded but verification failed to connect.");
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
          e.target.value = null;
        }
      }
    );
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
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEvidenceUpload} disabled={isUploading} />
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
                    <div className="flex-1 mr-4">
                      <p className="text-sm font-medium">{activeStep.title}</p>
                      <p className="mt-1 text-xs text-[#5C6B82]">{activeStep.details}</p>
                      
                      {isUploading && (
                        <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-[#7FAAF5] h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}

                      {/* Verification Feedback UI */}
                      {verificationResult && (
                        <div className={`mt-4 p-3 rounded-lg border text-xs ${verificationResult.is_appropriate ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                          <div className="flex items-center gap-2 font-bold mb-1">
                            {verificationResult.is_appropriate ? '✅ Approved' : '❌ Discrepancy Detected'}
                          </div>
                          <p className="leading-relaxed">{verificationResult.reasoning}</p>
                          {verificationResult.bill_total && (
                            <p className="mt-2 font-semibold">Bill Total: ${verificationResult.bill_total}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleEvidenceClick(activeStep.id)} 
                      disabled={isUploading}
                      className="flex items-center gap-2 rounded-lg bg-white border border-[#DCE6F7] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7FAAF5] hover:bg-[#F4F7FD] transition shadow-sm disabled:opacity-50"
                    >
                      {isUploading ? "Verifying..." : "+ Evidence"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {userRole === "creator" ? (
                  <>
                    <button className="rounded-xl bg-green-600 px-6 py-3 text-sm text-white" onClick={() => alert("Invite via Email (mock)")}>Invite via Email</button>
                    <button 
                      className={`rounded-xl px-6 py-3 text-sm font-medium transition ${verificationResult?.is_appropriate ? 'bg-[#1E2A3B] text-white hover:bg-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`} 
                      onClick={() => verificationResult?.is_appropriate ? setIsReimburseFormOpen(true) : alert("Evidence must be verified and appropriate to request reimbursement.")}
                    >
                      Reimburse from Pool
                    </button>
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
          <form onSubmit={handleReimburseSubmit} className="relative z-10 w-full max-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-5 text-lg font-medium">Request Reimbursement</h3>
            <p className="text-sm text-gray-600 mb-4">You are requesting <strong>${verificationResult?.bill_total || '0'}</strong> based on your verified evidence from {verificationResult?.vendor_name}.</p>
            <div className="flex justify-end gap-3">
              <button type="button" className="rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50" onClick={() => setIsReimburseFormOpen(false)}>Cancel</button>
              <button type="submit" className="rounded-lg bg-green-600 px-5 py-2.5 text-sm text-white">Confirm Request</button>
            </div>
          </form>
        </div>
      )}
      <DonationModal project={project} open={showDonation} onClose={() => setShowDonation(false)} />
    </>
  );
}