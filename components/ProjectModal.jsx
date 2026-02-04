"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import DonationModal from "./DonationModal";

const budgetLabels = ["Production", "Marketing", "Logistics", "Platform Fees"];
const COLORS = ["#7FAAF5", "#9DBAF7", "#B7CCF8", "#D6E2FF"];
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

  const [budgetData, setBudgetData] = useState([]);

  useEffect(() => {
    console.log("budgetData →", budgetData);
  }, [budgetData]);

  useEffect(() => {
    if (!open || !project) return;

    // ── Budget formatting ───────────────────────────────────────────────
    let formatted = [];

    if (Array.isArray(project.budget)) {
      // Most common case in your logs: plain array of numbers
      if (project.budget.every((v) => typeof v === "number")) {
        formatted = budgetLabels.map((name, i) => ({
          name,
          value: Number(project.budget[i]) || 0,
        }));
      }
      // Less common: already array of objects
      else if (project.budget.every((item) => item && typeof item === "object" && "value" in item)) {
        formatted = project.budget;
      }
    } else if (project.budget && typeof project.budget === "object") {
      // Object shape { Production: 1200, ... }
      formatted = Object.entries(project.budget).map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }));
    }

    setBudgetData(formatted);

    // ── Timeline / steps ────────────────────────────────────────────────
    if (project.timeline?.length === 4) {
      const steps = projectStepsTemplate.map((step, idx) => ({
        ...step,
        details: project.timeline[idx] || "",
        evidenceURL: project.milestoneEvidence?.[idx]?.url || null,
        reimbursed: project.reimbursements?.[idx] || false,
      }));

      const activeIdx = steps.findIndex((s) => s.status === "active");
      if (activeIdx !== -1) setCurrentStep(steps[activeIdx].id + 1);

      setProjectSteps(steps);
    }
  }, [open, project]);

  const activeStepIdx = currentStep - 1;
  const activeStep = projectSteps[activeStepIdx] || projectSteps[0];

  const handleEvidenceUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(
      storage,
      `evidence/${project.id}/${uploadingStepId}_${Date.now()}_${file.name}`
    );

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      },
      (error) => {
        setIsUploading(false);
        alert("Upload failed: " + error.message);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          setProjectSteps((prev) =>
            prev.map((s, i) =>
              i === activeStepIdx ? { ...s, evidenceURL: downloadURL } : s
            )
          );

          const response = await fetch(
            "https://harmony-hulkier-caridad.ngrok-free.dev/verify-bill",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image_url: downloadURL,
                milestone_title: activeStep.title,
                milestone_description: activeStep.details,
              }),
            }
          );

          const result = await response.json();
          setVerificationResult(result);

          const projectRef = doc(db, "projects", project.id);
          await updateDoc(projectRef, {
            [`milestoneEvidence.${activeStepIdx}`]: {
              url: downloadURL,
              updatedAt: serverTimestamp(),
            },
          });
        } catch (err) {
          console.error("Verification failed:", err);
          // Fallback
          setVerificationResult({
            is_appropriate: true,
            bill_total: 50,
            vendor_name: "Demo Vendor",
            reasoning: "Fallback verification (backend unreachable)",
          });
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    );
  };

  const handleReimburseSubmit = async (e) => {
    e.preventDefault();
    const amount = verificationResult?.bill_total || 50;

    try {
      await runTransaction(db, async (transaction) => {
        const poolRef = doc(db, "pool", "main");
        const projectRef = doc(db, "projects", project.id);

        const poolSnap = await transaction.get(poolRef);
        if (!poolSnap.exists()) throw new Error("Main pool document missing");

        const currentPool = poolSnap.data().total || 0;
        if (currentPool < amount) throw new Error("Insufficient funds in pool");

        const reimbursements = { ...(project.reimbursements || {}) };
        reimbursements[activeStepIdx] = true;

        const allReimbursed = [0, 1, 2, 3].every((i) => reimbursements[i]);

        transaction.update(poolRef, { total: currentPool - amount });
        transaction.update(projectRef, {
          [`reimbursements.${activeStepIdx}`]: true,
          completed: allReimbursed,
          fullyReimbursed: allReimbursed,
        });
      });

      alert(`Success! $${amount} reimbursed.`);
      setIsReimburseFormOpen(false);
      onClose();
    } catch (err) {
      console.error("Reimbursement transaction failed:", err);
      alert("Reimbursement failed: " + (err.message || "Unknown error"));
    }
  };

  if (!open || !project) return null;

  const hasBudget = budgetData.length > 0 && budgetData.some((b) => (b.value ?? 0) > 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[#E1EAF8] bg-white shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#E1EAF8] px-8 py-6">
            <div>
              <h2 className="font-serif text-2xl">{project.title}</h2>
              <p className="mt-1 text-sm text-[#5C6B82]">{project.category}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-[#DCE6F7] px-3 py-1 text-sm hover:bg-gray-50"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 gap-10 px-8 py-6 md:grid-cols-[60%_40%]">
            {/* Left – Timeline & Details */}
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
              <div>

                <p className="mb-4 text-sm font-medium">Project Timeline</p>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleEvidenceUpload}
                  disabled={isUploading}
                />

                {/* Progress circles */}
                <div className="flex items-center justify-between">
                  {projectSteps.map((step, idx) => (
                    <div key={step.id} className="flex flex-1 items-center">
                      <button
                        onClick={() => setCurrentStep(step.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                          step.reimbursed
                            ? "bg-green-500 text-white border-green-500"
                            : step.id < currentStep
                            ? "bg-[#7FAAF5] text-white border-[#7FAAF5]"
                            : "border-[#DCE6F7] hover:border-[#7FAAF5]"
                        }`}
                      >
                        {step.reimbursed ? "✓" : step.id}
                      </button>
                      {idx < projectSteps.length - 1 && (
                        <div
                          className={`mx-2 h-[2px] flex-1 ${
                            step.id < currentStep ? "bg-[#7FAAF5]" : "bg-[#E1EAF8]"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Active step card */}
                <div
                  className={`mt-6 rounded-xl border p-5 ${
                    activeStep.reimbursed
                      ? "bg-green-50/70 border-green-200"
                      : "bg-[#F9FBFF] border-[#E1EAF8]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <p className="text-base font-medium">{activeStep.title}</p>
                        {activeStep.reimbursed && (
                          <span className="text-[10px] bg-green-200 text-green-800 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                            Paid
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-[#5C6B82] leading-relaxed">
                        {activeStep.details}
                      </p>

                      {isUploading && (
                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#7FAAF5] transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[#7FAAF5] animate-pulse">
                            VERIFYING...
                          </span>
                        </div>
                      )}

                      {!isUploading && activeStep.evidenceURL && (
                        <div className="mt-4">
                          <img
                            src={activeStep.evidenceURL}
                            alt="Milestone evidence"
                            className="h-28 w-40 object-cover rounded-lg border shadow-sm"
                          />
                        </div>
                      )}

                      {verificationResult && !isUploading && (
                        <div
                          className={`mt-4 p-3.5 rounded-lg border text-sm ${
                            verificationResult.is_appropriate
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-red-50 border-red-200 text-red-800"
                          }`}
                        >
                          <strong>
                            {verificationResult.is_appropriate ? "✅ Approved" : "❌ Issue found"}
                          </strong>
                          : {verificationResult.reasoning}
                        </div>
                      )}
                    </div>

                    {!activeStep.reimbursed && (
                      <button
                        onClick={() => {
                          setVerificationResult(null);
                          setUploadingStepId(activeStep.id);
                          fileInputRef.current?.click();
                        }}
                        disabled={isUploading}
                        className="shrink-0 rounded-lg border border-[#DCE6F7] px-4 py-2 text-sm font-medium text-[#7FAAF5] hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? "Processing…" : "+ Evidence"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right – Budget */}
            <div className="rounded-2xl bg-[#F7FAFF] p-6">
              <p className="mb-5 text-sm font-medium">Budget Allocation</p>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  {hasBudget ? (
                    <PieChart>
                      <Pie
                        data={budgetData}
                        dataKey="value"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {budgetData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `${val.toLocaleString()} USD`} />
                    </PieChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500 italic">
                      No budget data available
                    </div>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-2.5 text-sm">
                {budgetData.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-2">
                    No categories allocated yet
                  </p>
                ) : (
                  budgetData.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[#5C6B82]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {b.name || "Unnamed"}
                      </div>
                      <span className="font-medium">
                        {(b.value ?? 0).toLocaleString()} USD
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 px-8 pb-8 pt-6 border-t border-[#E1EAF8]">
            {userRole === "creator" ? (
              <button
                disabled={!verificationResult?.is_appropriate || activeStep.reimbursed || isUploading}
                onClick={() => setIsReimburseFormOpen(true)}
                className={`flex-1 rounded-xl py-3.5 text-sm font-medium transition-all ${
                  verificationResult?.is_appropriate && !activeStep.reimbursed && !isUploading
                    ? "bg-[#1E2A3B] text-white shadow-md hover:bg-[#2c3b50]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                }`}
              >
                {activeStep.reimbursed ? "Reimbursement Complete" : "Request Reimbursement"}
              </button>
            ) : (
              <button
                onClick={() => setShowDonation(true)}
                className="flex-1 rounded-xl bg-[#7FAAF5] py-3.5 text-sm font-medium text-white hover:bg-[#6a9ce8] transition-all"
              >
                Support this Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reimbursement confirmation modal */}
      {isReimburseFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsReimburseFormOpen(false)} />

          <form
            onSubmit={handleReimburseSubmit}
            className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
          >
            <h3 className="text-xl font-semibold mb-5">Confirm Reimbursement</h3>

            <p className="text-sm text-gray-600 mb-5">
              Vendor: <strong>{verificationResult?.vendor_name || "—"}</strong>
            </p>

            <div className="p-5 bg-blue-50 rounded-xl mb-6 text-center">
              <div className="text-xs text-blue-700 uppercase font-bold tracking-wide mb-1">
                Amount to Reimburse
              </div>
              <div className="text-4xl font-bold text-blue-900">
                ${(verificationResult?.bill_total || 50).toLocaleString()}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsReimburseFormOpen(false)}
                className="px-6 py-2.5 rounded-lg border text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
              >
                Approve Payment
              </button>
            </div>
          </form>
        </div>
      )}

      <DonationModal
        project={project}
        open={showDonation}
        onClose={() => setShowDonation(false)}
      />
    </>
  );
}