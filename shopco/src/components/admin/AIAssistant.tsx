"use client";

import { useState } from "react";

interface ExtractedProduct {
  title: string;
  price: number;
  discountPercentage: number;
  discountAmount: number;
  rating: number;
  srcUrl: string;
  message: string;
}

interface Props {
  onProductReady: (product: {
    title: string;
    price: string;
    discountPercentage: string;
    discountAmount: string;
    rating: string;
    srcUrl: string;
  }) => void;
}

const API = process.env.NEXT_PUBLIC_SHOPLENS_API || "http://localhost:8000";

export default function AIAssistant({ onProductReady }: Props) {
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply]     = useState("");
  const [error, setError]     = useState("");

  const examples = [
    "Add a black leather jacket, price $299, 20% off",
    "Add white sneakers for $150",
    "Add a red floral summer dress, price $89, rating 4.8",
    "Add blue slim fit jeans price 120 with 15% discount",
  ];

  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);
    setReply("");
    setError("");

    try {
      const res = await fetch(`${API}/admin/ai-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: input.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to process command");
      }

      const data: ExtractedProduct = await res.json();

      setReply(data.message || `Got it! Ready to add "${data.title}"`);

      // Pass extracted data to the form
      onProductReady({
        title: data.title,
        price: String(data.price),
        discountPercentage: String(data.discountPercentage || 0),
        discountAmount: String(data.discountAmount || 0),
        rating: String(data.rating || 4.5),
        srcUrl: data.srcUrl || "",
      });

      setInput("");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ borderColor: "rgba(0,0,0,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-black text-white">
        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-sm">AI Assistant</p>
          <p className="text-xs text-white/50">Describe a product and I'll add it</p>
        </div>
      </div>

      <div className="p-5 bg-white flex flex-col gap-4">

        {/* Reply bubble */}
        {reply && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-700 max-w-sm">
              {reply}
              <p className="text-xs text-gray-400 mt-1">Form filled below — review and save</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
            placeholder='e.g. "Add a black hoodie, price $89, 10% off"'
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`px-5 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-2 ${
              input.trim() && !loading
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>

        {/* Example prompts */}
        {!reply && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Try these
            </p>
            <div className="flex flex-col gap-1.5">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="text-left text-xs text-gray-500 hover:text-black px-3 py-2 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-100"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
