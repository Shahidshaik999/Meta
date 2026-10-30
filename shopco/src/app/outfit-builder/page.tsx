"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { getProducts } from "@/lib/productStore";
import { Product } from "@/types/product.types";

const API = process.env.NEXT_PUBLIC_SHOPLENS_API || "http://localhost:8000";

const CATEGORIES = ["Top", "Bottom", "Dress", "Accessory"];

interface SelectedItem {
  product: Product;
  category: string;
}

export default function OutfitBuilderPage() {
  const [products, setProducts]         = useState<Product[]>([]);
  const [selected, setSelected]         = useState<SelectedItem[]>([]);
  const [userImage, setUserImage]       = useState<string | null>(null);
  const [userPreview, setUserPreview]   = useState<string | null>(null);
  const [result, setResult]             = useState<any>(null);
  const [loading, setLoading]           = useState(false);
  const [loadingStep, setLoadingStep]   = useState("");
  const [filter, setFilter]             = useState("All");

  useEffect(() => { setProducts(getProducts()); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      setUserImage(b64);
      setUserPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  async function urlToBase64(url: string): Promise<string> {
    const fullUrl = url.startsWith("/") ? `${window.location.origin}${url}` : url;
    const res = await fetch(fullUrl);
    const blob = await res.blob();
    return new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve((r.result as string).split(",")[1]);
      r.readAsDataURL(blob);
    });
  }

  async function handleBuild() {
    if (!userImage || selected.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
      setLoadingStep("Preparing outfit items...");
      const items = await Promise.all(selected.map(async s => ({
        name: s.product.title,
        category: s.category,
        image_base64: await urlToBase64(s.product.srcUrl),
      })));

      setLoadingStep("Muse Image compositing your outfit...");
      const res = await fetch(`${API}/outfit/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_image_base64: userImage, items }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      alert(e.message || "Failed to build outfit");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  function toggleProduct(p: Product) {
    const exists = selected.find(s => s.product.id === p.id);
    if (exists) {
      setSelected(prev => prev.filter(s => s.product.id !== p.id));
    } else if (selected.length < 3) {
      setSelected(prev => [...prev, { product: p, category: "Top" }]);
    }
  }

  const scoreColor = result
    ? result.style_score >= 8 ? "#10b981"
    : result.style_score >= 6 ? "#f59e0b"
    : "#ef4444"
    : "#10b981";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-black transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 text-xl">Outfit Builder</h1>
            <p className="text-xs text-gray-400">Mix & match up to 3 items — see the full look on you</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: product picker */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Category filter */}
          <div className="flex gap-2">
            {["All", ...CATEGORIES].map(c => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  filter === c ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-black"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map(p => {
              const isSelected = selected.some(s => s.product.id === p.id);
              const isDisabled = !isSelected && selected.length >= 3;
              return (
                <button
                  key={p.id}
                  onClick={() => !isDisabled && toggleProduct(p)}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                    isSelected
                      ? "border-black shadow-lg scale-[1.02]"
                      : isDisabled
                      ? "border-gray-100 opacity-40 cursor-not-allowed"
                      : "border-gray-100 hover:border-gray-400"
                  }`}
                >
                  <div className="aspect-square bg-gray-50">
                    <img src={p.srcUrl} alt={p.title} className="w-full h-full object-contain" />
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-xs font-semibold text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400">${p.price}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: canvas + result */}
        <div className="flex flex-col gap-4">

          {/* Selected items */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Selected Items ({selected.length}/3)
            </p>
            {selected.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Pick up to 3 items from the grid</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selected.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <img src={s.product.srcUrl} alt={s.product.title} className="w-10 h-10 rounded-xl object-contain bg-gray-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{s.product.title}</p>
                    </div>
                    <button onClick={() => toggleProduct(s.product)} className="text-gray-300 hover:text-red-400 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Photo</p>
            {userPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={userPreview} alt="You" className="w-full object-contain max-h-48" />
                <button
                  onClick={() => { setUserImage(null); setUserPreview(null); }}
                  className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-xs font-semibold shadow"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
                  isDragActive ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <input {...getInputProps()} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <p className="text-xs text-gray-400">Upload selfie</p>
              </div>
            )}
          </div>

          {/* Build button */}
          <button
            onClick={handleBuild}
            disabled={!userImage || selected.length === 0 || loading}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${
              userImage && selected.length > 0 && !loading
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {loadingStep}
              </span>
            ) : "Build My Outfit"}
          </button>

          {/* Result */}
          {result && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <img
                src={`data:image/jpeg;base64,${result.result_image_base64}`}
                alt="Your outfit"
                className="w-full object-contain"
                style={{ maxHeight: "360px" }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900 text-sm">Style Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${result.style_score * 10}%`, background: scoreColor }} />
                    </div>
                    <span className="text-sm font-black" style={{ color: scoreColor }}>{result.style_score}/10</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800">{result.style_verdict}</p>
                {result.styling_tip && (
                  <p className="text-xs text-gray-500 mt-1">{result.styling_tip}</p>
                )}
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = `data:image/jpeg;base64,${result.result_image_base64}`;
                    a.download = "my-outfit.jpg";
                    a.click();
                  }}
                  className="w-full mt-3 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition"
                >
                  Download Outfit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
