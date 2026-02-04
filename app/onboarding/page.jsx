"use client";

import { useState } from "react";

const questions = [
  {
    id: 1,
    question: "I am a",
    type: "choice",
    options: ["Creator", "Contributor"],
  },
  {
    id: 2,
    question: "My projects best fit in",
    type: "choice",
    options: ["Art", "Entertainment", "Education", "Technology", "Other"],
  },
  {
    id: 3,
    question: "I’m primarily looking for",
    type: "choice",
    options: ["Funding", "Collaboration", "Mentorship", "All of the above"],
  },
  {
    id: 4,
    question: "My experience level is",
    type: "choice",
    options: ["Beginner", "Intermediate", "Experienced"],
  },
  {
    id: 5,
    question: "I plan to start or join a project within",
    type: "choice",
    options: ["1 month", "3 months", "6 months+"],
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const current = questions[step];

  function handleSelect(option) {
    setAnswers({ ...answers, [current.id]: option });
    setTimeout(() => {
      setStep((prev) => prev + 1);
    }, 250);
  }

  return (
    <div className="min-h-screen bg-blue-100 font-sans text-[#1E2A3B]">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-8">

        {/* Progress */}
        <div className="mb-10 w-full">
          <div className="h-1 w-full rounded-full bg-[#E1EAF8]">
            <div
              className="h-1 rounded-full bg-[#7FAAF5] transition-all duration-500"
              style={{ width: `${((step + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          key={current?.id}
          className="w-full rounded-3xl border border-[#E1EAF8] bg-white p-10 transition-all duration-500 ease-out animate-fade-slide"
        >
          {step < questions.length ? (
            <>
              <h2 className="mb-8 font-serif text-3xl leading-snug">
                {current.question}
              </h2>

              <div className="grid gap-4">
                {current.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    className="rounded-full border border-[#DCE6F7] px-6 py-3 text-left text-sm font-medium tracking-wide text-[#1E2A3B] transition hover:bg-[#F4F7FD]"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-serif text-3xl">
                You’re all set.
              </h2>
              <p className="mt-4 text-[#5C6B82]">
                We’ll personalize CoCreate based on your preferences.
              </p>

              <a
                href="/dashboard"
                className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#7FAAF5] px-8 text-sm font-medium tracking-wide text-white transition hover:bg-[#6C9AE8]"
              >
                Continue to CoCreate
              </a>
            </>
          )}
        </div>
      </main>

      {/* Animation styles */}
      <style jsx>{`
        .animate-fade-slide {
          animation: fadeSlide 0.5s ease forwards;
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
