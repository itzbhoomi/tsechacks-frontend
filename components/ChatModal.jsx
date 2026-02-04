"use client";
import React, { useState } from "react";

export default function ChatModal({ open, onClose, projectTitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  if (!open) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setInput("");
    // Here you could integrate AI or Firebase chat backend
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#E1EAF8] bg-white/90 backdrop-blur-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E1EAF8] px-6 py-4">
          <h2 className="font-serif text-lg">Chat about "{projectTitle}"</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-[#DCE6F7] px-3 py-1 text-sm hover:bg-[#F4F7FD]"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="max-h-80 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-[#5C6B82]">Start the conversation with the project creator!</p>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                msg.sender === "user" ? "ml-auto bg-[#7FAAF5]/20 text-[#1E2A3B]" : "bg-[#F7FAFF] text-[#5C6B82]"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-[#E1EAF8] px-4 py-3">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-[#DCE6F7] bg-white/90 px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#7FAAF5]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="rounded-xl bg-[#7FAAF5] px-4 py-2 text-sm text-white hover:bg-[#6B96E6] transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
