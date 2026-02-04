"use client";

import React, { useState } from "react";
import { collection, addDoc, doc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DonationModal({ project, open, onClose }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handlePreset = (val) => setAmount(val.toString());

  const handleConfirmPayment = async () => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://api.fmm.finternetlab.io/api/v1/payment-intents", {
        method: "POST",
        headers: {
          "X-API-Key": "sk_hackathon_bea2ab2910e59eb4522d62cfa9f60438",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount.toFixed(2),
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
        await setDoc(
          poolRef,
          { total: increment(numericAmount), lastUpdated: serverTimestamp() },
          { merge: true }
        );

        window.location.href = result.data.paymentUrl;
      } else {
        alert("Failed to initiate payment. API response error.");
      }
    } catch (err) {
      console.error("Payment initiation failed:", err);
      alert("Failed to start payment process. Please try again.");
    } finally {
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
              className="w-32 bg-transparent text-center text-5xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
          className="w-full rounded-xl bg-[#1E2A3B] py-4 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Processing..." : `Donate $${amount || "0"}`}
        </button>
      </div>
    </div>
  );
}