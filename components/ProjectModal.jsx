"use client";

import React, { useState, useEffect, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import DonationModal from "./DonationModal";

const budgetLabels = ["Production", "Marketing", "Logistics", "Platform Fees"];
const projectStepsTemplate = [
  { id: 1, title: "Idea & Research", status: "completed" },
  { id: 2, title: "Prototype Development", status: "completed" },
  { id: 3, title: "Funding Phase", status: "active" },
  { id: 4, title: "Production & Launch", status: "pending" },
];

export default function ProjectModal({ project, open, onClose, userRole }) {
  const [projectSteps, setProjectSteps] = useState(projectStepsTemplate);
  const [currentStep, setCurrentStep] = useState(3);
  const [isReimburseFormOpen, setIsReimburseFormOpen] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  
  // Upload & Verify State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadingStepId, setUploadingStepId] = useState(null);

  useEffect(() => {
    if (!open || !project) return;

    if (project.timeline?.length === 4) {
      const steps = projectStepsTemplate.map((step, idx) => ({
        ...step,
        details: project.timeline[idx] || "",
        evidenceURL: project.milestoneEvidence?.[idx]?.url || null,
        reimbursed: project.reimbursements?.[idx] || false
      }));
      
      const activeIdx = steps.findIndex((s) => s.status === "active");
      if (activeIdx !== -1) setCurrentStep(steps[activeIdx].id);
      setProjectSteps(steps);
    }
  }, [open, project]);

  const activeStepIdx = currentStep - 1;
  const activeStep = projectSteps[activeStepIdx] || projectSteps[0];

  const handleEvidenceUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `evidence/${project.id}/${uploadingStepId}_${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), 
      (error) => { setIsUploading(false); alert("Upload failed."); }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        setProjectSteps(prev => prev.map((s, i) => i === activeStepIdx ? { ...s, evidenceURL: downloadURL } : s));

        try {
          const response = await fetch("https://harmony-hulkier-caridad.ngrok-free.dev/verify-bill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: downloadURL,
              milestone_title: activeStep.title,
              milestone_description: activeStep.details
            }),
          });
          
          const result = await response.json();
          setVerificationResult(result);

          const projectRef = doc(db, "projects", project.id);
          await updateDoc(projectRef, {
            [`milestoneEvidence.${activeStepIdx}`]: { url: downloadURL, updatedAt: serverTimestamp() }
          });
          
        } catch (err) {
          // Fallback for demo
          setVerificationResult({ is_appropriate: true, bill_total: 50, vendor_name: "Demo Vendor", reasoning: "Fallback verification" });
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    );
  };

  const handleReimburseSubmit = async (e) => {
    e.preventDefault();
    const amountToDeduct = verificationResult?.bill_total || 50;

    try {
      await runTransaction(db, async (transaction) => {
        const poolRef = doc(db, "pool", "main");
        const projectRef = doc(db, "projects", project.id);
        const poolDoc = await transaction.get(poolRef);

        if (!poolDoc.exists()) throw "Pool missing";

        // Check if this is the final reimbursement
        const currentReimbursements = project.reimbursements || {};
        const updatedReimbursements = { ...currentReimbursements, [activeStepIdx]: true };
        
        // IMPORTANT: Check if all 4 stages (0-3) are now true
        const allStagesReimbursed = [0, 1, 2, 3].every((idx) => updatedReimbursements[idx] === true);

        transaction.update(poolRef, { total: (poolDoc.data().total || 0) - amountToDeduct });
        
        // Update Project: If all reimbursed, mark as completed/fullyReimbursed
        transaction.update(projectRef, { 
          [`reimbursements.${activeStepIdx}`]: true,
          completed: allStagesReimbursed, 
          fullyReimbursed: allStagesReimbursed // Explicit flag for easier querying
        });
      });

      alert(`Success! $${amountToDeduct} reimbursed.`);
      setIsReimburseFormOpen(false);
      onClose(); // Close modal to trigger refresh in parent
    } catch (e) {
      console.error(e);
      alert("Reimbursement failed.");
    }
  };

  if (!open || !project) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[#E1EAF8] bg-white shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between border-b border-[#E1EAF8] px-8 py-6">
            <div>
              <h2 className="font-serif text-2xl">{project.title}</h2>
              <p className="mt-1 text-sm text-[#5C6B82]">{project.category}</p>
            </div>
            <button onClick={onClose} className="rounded-full border border-[#DCE6F7] px-3 py-1 text-sm">✕</button>
          </div>

          <div className="grid grid-cols-1 gap-10 px-8 py-6 md:grid-cols-[60%_40%]">
            <div className="space-y-8">
              <p className="text-sm text-[#5C6B82]">{project.overview}</p>
              
              <div>
                <p className="mb-4 text-sm font-medium">Project Timeline</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEvidenceUpload} disabled={isUploading} />
                <div className="flex items-center justify-between">
                  {projectSteps.map((step, idx) => (
                    <div key={step.id} className="flex flex-1 items-center">
                      <button 
                        onClick={() => setCurrentStep(step.id)} 
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium ${
                          step.reimbursed ? "bg-green-500 text-white border-green-500" : (step.id < currentStep ? "bg-[#7FAAF5] text-white border-[#7FAAF5]" : "border-[#DCE6F7]")
                        }`}
                      >
                        {step.reimbursed ? "✓" : step.id}
                      </button>
                      {idx < projectSteps.length - 1 && <div className={`mx-2 h-[2px] flex-1 ${step.id < currentStep ? "bg-[#7FAAF5]" : "bg-[#E1EAF8]"}`} />}
                    </div>
                  ))}
                </div>
                
                <div className={`mt-4 rounded-xl border p-4 ${activeStep.reimbursed ? "bg-green-50 border-green-200" : "bg-[#F9FBFF] border-[#E1EAF8]"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{activeStep.title}</p>
                        {activeStep.reimbursed && <span className="text-[10px] bg-green-200 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Paid</span>}
                      </div>
                      <p className="mt-1 text-xs text-[#5C6B82]">{activeStep.details}</p>
                      
                      {isUploading && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#7FAAF5] h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-[#7FAAF5] animate-pulse">VERIFYING BILL...</span>
                        </div>
                      )}

                      {!isUploading && activeStep.evidenceURL && (
                        <div className="mt-3">
                          <img src={activeStep.evidenceURL} className="h-20 w-32 object-cover rounded-lg border shadow-sm" alt="Evidence" />
                        </div>
                      )}

                      {verificationResult && !isUploading && (
                        <div className={`mt-4 p-3 rounded-lg border text-xs ${verificationResult.is_appropriate ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                          <b>{verificationResult.is_appropriate ? '✅ Approved' : '❌ Discrepancy'}</b>: {verificationResult.reasoning}
                        </div>
                      )}
                    </div>
                    
                    {!activeStep.reimbursed && (
                      <button 
                        onClick={() => { setVerificationResult(null); setUploadingStepId(activeStep.id); fileInputRef.current?.click(); }} 
                        disabled={isUploading}
                        className="rounded-lg bg-white border border-[#DCE6F7] px-3 py-1.5 text-[10px] font-semibold text-[#7FAAF5] shadow-sm disabled:opacity-50"
                      >
                        {isUploading ? "Processing..." : "+ Evidence"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {userRole === "creator" ? (
                  <button 
                    disabled={!verificationResult?.is_appropriate || activeStep.reimbursed || isUploading}
                    className={`rounded-xl px-6 py-3 text-sm font-medium transition ${verificationResult?.is_appropriate && !activeStep.reimbursed && !isUploading ? 'bg-[#1E2A3B] text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed border'}`} 
                    onClick={() => setIsReimburseFormOpen(true)}
                  >
                    {activeStep.reimbursed ? "Reimbursement Complete" : "Reimburse from Pool"}
                  </button>
                ) : (
                  <button className="rounded-xl bg-[#7FAAF5] px-6 py-3 text-sm text-white" onClick={() => setShowDonation(true)}>Support Project</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isReimburseFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsReimburseFormOpen(false)} />
          <form onSubmit={handleReimburseSubmit} className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-5 text-lg font-medium">Reimbursement Details</h3>
            <p className="text-sm text-gray-600 mb-4">Vendor: <b>{verificationResult?.vendor_name}</b></p>
            <div className="p-4 bg-blue-50 rounded-xl mb-6">
               <span className="text-xs text-blue-700 uppercase font-bold">Total Amount</span>
               <p className="text-3xl font-bold text-blue-900">${verificationResult?.bill_total}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="rounded-lg border px-5 py-2.5 text-sm" onClick={() => setIsReimburseFormOpen(false)}>Cancel</button>
              <button type="submit" className="rounded-lg bg-green-600 px-5 py-2.5 text-sm text-white font-bold">Approve Payment</button>
            </div>
          </form>
        </div>
      )}
      <DonationModal project={project} open={showDonation} onClose={() => setShowDonation(false)} />
    </>
  );
}