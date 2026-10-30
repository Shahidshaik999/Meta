"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/productStore";
import { Product } from "@/types/product.types";

const API = process.env.NEXT_PUBLIC_SHOPLENS_API || "http://meta-1-x9qz.onrender.com";

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
}

interface Profile {
  style_pref: string;
  budget: string;
  occasion: string;
  body_type: string;
}

const QUICK_PROMPTS = [
  "I have a wedding next week, budget ₹2000",
  "Suggest something casual for a day out",
  "I need a party dress under ₹1500",
  "What looks good for office wear?",
];

export default function StylistPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm Aria, your personal style assistant ✨ Tell me what you're looking for — an occasion, a budget, a vibe — and I'll find the perfect outfit from our collection.",
    },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({ style_pref: "", budget: "", occasion: "", body_type: "" });
  const [showProfile, setShowProfile] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/stylist/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          profile,
          products: products.map(p => ({ id: p.id, title: p.title, price: p.price, discount: p.discount })),
        }),
      });
      const data = await res.json();
      const recommended = products.filter(p => data.recommended_ids?.includes(p.id));
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply || "Let me think about that...",
        products: recommended,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble thinking just now. Try again!" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-black transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </Link>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-lg">A</div>
            <div>
              <h1 className="font-bold text-gray-900">Aria</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-400">AI Personal Stylist</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="text-sm border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            My Style Profile
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Profile Panel */}
        {showProfile && (
          <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Your Style Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "style_pref", label: "Style preference", placeholder: "e.g. casual, elegant, boho" },
                { key: "budget", label: "Usual budget", placeholder: "e.g. ₹1000–₹2000" },
                { key: "occasion", label: "Upcoming occasion", placeholder: "e.g. wedding, office" },
                { key: "body_type", label: "Body type", placeholder: "e.g. slim, curvy, athletic" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={(profile as any)[f.key]}
                    onChange={e => setProfile(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Aria uses this to give you better recommendations</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-4 min-h-[50vh]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "" : "flex flex-col gap-3"}`}>
                {msg.role === "assistant" && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0 mt-1">A</div>
                    <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100 text-sm text-gray-700 leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm">
                    {msg.content}
                  </div>
                )}

                {/* Product recommendations */}
                {msg.products && msg.products.length > 0 && (
                  <div className="ml-11 grid grid-cols-3 gap-2 mt-1">
                    {msg.products.map(p => (
                      <Link key={p.id} href={`/shop/product/${p.id}`}>
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition group">
                          <div className="aspect-square bg-gray-50 overflow-hidden">
                            <img src={p.srcUrl} alt={p.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold text-gray-900 truncate">{p.title}</p>
                            <p className="text-xs text-gray-500">${p.price}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-sm">A</div>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs border border-purple-200 text-purple-600 px-3 py-1.5 rounded-full hover:bg-purple-50 transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-3 sticky bottom-4">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask Aria anything about style..."
            className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-purple-400 shadow-sm"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${
              input.trim() && !loading
                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:opacity-90"
                : "bg-gray-100 text-gray-300"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
