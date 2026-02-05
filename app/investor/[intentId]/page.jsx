"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export default function InvestorDashboard() {
  const { intentId } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!intentId) return;

    const fetchInvestmentData = async () => {
      try {
        // Query transactions by intentId
        const q = query(
          collection(db, "transactions"), 
          where("intentId", "==", intentId) // Ensure this matches your DB field name exactly
        );
        
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setTransaction(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching investment:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestmentData();
  }, [intentId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium animate-pulse">Loading Investment Data...</p>
        </div>
      </main>
    );
  }

  if (error || !transaction) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-serif text-gray-900">Investment Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">Could not find a record for Intent ID: <br/><code className="bg-gray-100 px-2 py-1 rounded mt-2 inline-block">{intentId}</code></p>
        </div>
      </main>
    );
  }

  // Calculate simple stats
  const invested = transaction.amount || 0;
  const earnings = transaction.dividendPaid || 0;
  const roi = invested > 0 ? ((earnings - invested) / invested) * 100 : 0;
  const isDistributed = transaction.status === "DISTRIBUTED";

  // Dummy chart data for visual consistency
  const chartData = [
    { month: "Start", value: invested },
    { month: "Now", value: invested + earnings },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-5 py-10 md:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Header Section */}
        <section className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center gap-5">
                <div className="h-20 w-20 flex items-center justify-center rounded-full bg-blue-50 text-3xl shadow-inner">
                    💰
                </div>
                <div>
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 mb-2">
                        INVESTOR DASHBOARD
                    </span>
                    <h1 className="font-serif text-3xl text-gray-900">{transaction.projectTitle || "Unknown Project"}</h1>
                    <p className="mt-1 text-sm text-gray-500">Transaction ID: <span className="font-mono text-xs">{intentId.slice(0, 18)}...</span></p>
                </div>
            </div>
            
            <div className={`px-6 py-3 rounded-2xl border text-sm font-bold text-center
                ${isDistributed ? "bg-green-50 border-green-200 text-green-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}
            `}>
                <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Status</p>
                {transaction.status || "PENDING"}
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Col: Financials */}
            <div className="space-y-6">
                {/* Revenue Card */}
                <div className="rounded-3xl bg-white p-6 shadow-sm border border-green-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold">
                        YOUR SHARE
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue Generated</p>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-serif text-green-700">${earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                        {isDistributed && <span className="text-sm font-bold text-green-600">+{roi.toFixed(1)}% ROI</span>}
                    </div>
                    <p className="mt-4 text-xs text-gray-400">
                        {isDistributed 
                            ? "This amount has been credited to your wallet based on your ownership stake."
                            : "Revenue distribution has not yet been triggered for this project."
                        }
                    </p>
                </div>

                {/* Investment Details */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-[#F9FBFF] p-5 border border-[#E1EAF8]">
                        <p className="text-xs text-gray-500 font-bold uppercase">Initial Investment</p>
                        <p className="mt-2 text-2xl font-semibold text-gray-800">${invested.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-[#F9FBFF] p-5 border border-[#E1EAF8]">
                        <p className="text-xs text-gray-500 font-bold uppercase">Net Profit</p>
                        <p className={`mt-2 text-2xl font-semibold ${earnings > 0 ? "text-green-600" : "text-gray-400"}`}>
                            ${Math.max(0, earnings - invested).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Col: Analytics Visual */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border flex flex-col justify-between">
                <div>
                    <h3 className="font-serif text-xl mb-2">Growth Analytics</h3>
                    <p className="text-xs text-gray-500">Visualizing your contribution vs current value.</p>
                </div>
                
                <div className="h-[200px] w-full mt-6">
                    <ChartContainer config={{ value: { label: "Value", color: "#10B981" } }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#10B981" 
                                    strokeWidth={3}
                                    fill="url(#colorValue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-gray-400 mt-10">
            <p>Transaction Reference: {transaction.paymentUrl ? transaction.paymentUrl.split('?')[0] : 'N/A'}</p>
            <p className="mt-1">Generated via Creative Minds Protocol</p>
        </div>

      </div>
    </main>
  );
}