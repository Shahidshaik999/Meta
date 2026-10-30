"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { getProducts } from "@/lib/productStore";
import { Product } from "@/types/product.types";

const API = process.env.NEXT_PUBLIC_SHOPLENS_API || "http://meta-1-x9qz.onrender.com";

interface MoodResult {
  vibe: string;
  style_tags: string[];
  matched_ids: number[];
  match_reasons: string[];
  color_palette: string[];
}

export default function MoodBoardPage() {
  const [image, setImage]           = useState<string | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [result, setResult]         = useState<MoodResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [products, setProducts]     = useState<Product[]>([]);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);

  useEffect(() => { setProducts(getProducts()); }, []);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage((reader.result as string).split(",")[1]);
      setPreview(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  async function handleMatch() {
    if (!image) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/mood-board/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: image,
          products: products.map(p => ({ id: p.id, title: p.title })),
        }),
      });
      const data: MoodResult = await res.json();
      setResult(data);
      setMatchedProducts(products.filter(p => data.matched_ids.includes(p.id)));
    } catch {
      alert("Matching failed, try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-black transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 text-xl">Mood Board</h1>
            <p className="text-xs text-gray-400">Upload any inspiration image — we find matching styles</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Upload area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          <div className="flex flex-col gap-4">
            <div
              {...getRootProps()}
              className={`aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                isDragActive ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <img src={preview} alt="Inspiration" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-700">Drop your inspiration</p>
                  <p className="text-sm text-gray-400 mt-1">A celebrity look, Pinterest screenshot,<br />or any fashion photo</p>
                </div>
              )}
            </div>

            <button
              onClick={handleMatch}
              disabled={!image || loading}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${
                image && !loading
                  ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg hover:opacity-90"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing your vibe...
                </span>
              ) : "Find My Vibe →"}
            </button>
          </div>

          {/* Result panel */}
          {result ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4 shadow-sm">
              {/* Vibe */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Vibe</p>
                <h2 className="text-2xl font-black text-gray-900 capitalize">{result.vibe}</h2>
              </div>

              {/* Style tags */}
              {result.style_tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Style Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {result.style_tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100 capitalize">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Color palette */}
              {result.color_palette.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Color Palette</p>
                  <div className="flex gap-2">
                    {result.color_palette.map((color, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-xl shadow-sm border border-white"
                        style={{ background: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Match count */}
              <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl px-4 py-3">
                <p className="font-bold text-gray-900">{matchedProducts.length} matching products found</p>
                <p className="text-xs text-gray-500 mt-0.5">Scroll down to see them</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-orange-100 rounded-3xl flex items-center justify-center mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Shop by Vibe</h3>
              <p className="text-sm text-gray-400">Upload any fashion inspiration and our AI identifies your style, then finds matching products from the store</p>
            </div>
          )}
        </div>

        {/* Matched products */}
        {matchedProducts.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              Products matching your vibe
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {matchedProducts.map((p, i) => (
                <Link key={p.id} href={`/shop/product/${p.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition group">
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      <img src={p.srcUrl} alt={p.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">${p.price}</p>
                      {result?.match_reasons[i] && (
                        <p className="text-xs text-orange-500 mt-1 line-clamp-2">{result.match_reasons[i]}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
