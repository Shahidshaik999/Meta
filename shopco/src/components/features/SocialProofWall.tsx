"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_SHOPLENS_API || "http://meta-1-x9qz.onrender.com";

interface ProofEntry {
  image_base64: string;
  height: string;
  size: string;
  body_type: string;
  timestamp: string;
}

interface Props {
  productId: number;
  productName: string;
}

export default function SocialProofWall({ productId, productName }: Props) {
  const [entries, setEntries]       = useState<ProofEntry[]>([]);
  const [expanded, setExpanded]     = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch(`${API}/social-proof/${productId}`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Real People Wearing It</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {entries.length > 0
              ? `${entries.length} ${entries.length === 1 ? "person" : "people"} tried this on`
              : "Be the first to share your try-on"}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">No try-ons shared yet</p>
          <p className="text-xs text-gray-400 mt-1">Try it on and share to help others</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {entries.map((entry, i) => (
            <button
              key={i}
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="relative rounded-2xl overflow-hidden group"
            >
              <div className="aspect-[3/4] bg-gray-100">
                <img
                  src={`data:image/jpeg;base64,${entry.image_base64}`}
                  alt="Try-on"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                {entry.size && <span className="text-white text-xs font-semibold block">Size {entry.size}</span>}
                {entry.height && <span className="text-white/70 text-xs">{entry.height}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Expanded view */}
      {expanded !== null && entries[expanded] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setExpanded(null)}>
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img
              src={`data:image/jpeg;base64,${entries[expanded].image_base64}`}
              alt="Try-on"
              className="w-full object-contain max-h-[70vh]"
            />
            <div className="p-4 flex items-center justify-between">
              <div className="flex gap-3">
                {entries[expanded].size && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Size</p>
                    <p className="text-sm font-bold text-gray-900">{entries[expanded].size}</p>
                  </div>
                )}
                {entries[expanded].height && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Height</p>
                    <p className="text-sm font-bold text-gray-900">{entries[expanded].height}</p>
                  </div>
                )}
                {entries[expanded].body_type && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Body type</p>
                    <p className="text-sm font-bold text-gray-900 capitalize">{entries[expanded].body_type}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">{entries[expanded].timestamp}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
