"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";

const API = process.env.NEXT_PUBLIC_SHOPLENS_API || "http://meta-1-x9qz.onrender.com";

interface FitData {
  fit_score: number;
  fit_verdict: string;
  fit_issues: string[];
  size_recommendation: string;
  style_note: string;
  fit_confidence: string;
}

interface TryOnResult {
  result_image_base64: string;
  product_name: string;
  product_category: string;
  product_description: string;
  sam_segments: string[];
  fit_score: number;
  fit_verdict: string;
  fit_issues: string[];
  size_recommendation: string;
  style_note: string;
  fit_confidence: string;
}

interface Props {
  productName: string;
  productImageUrl: string;
  onClose: () => void;
}

export default function TryOnModal({ productName, productImageUrl, onClose }: Props) {
  const [userImage, setUserImage]       = useState<string | null>(null);
  const [userPreview, setUserPreview]   = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [loadingStep, setLoadingStep]   = useState("");
  const [result, setResult]             = useState<TryOnResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [downloaded, setDownloaded]     = useState(false);
  const [shared, setShared]             = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareForm, setShareForm] = useState({ height: "", size: "", body_type: "" });

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Convert File to base64
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Convert image URL to base64 — with CORS fallback
  // If browser can't fetch (CORS blocked), returns null so we send URL instead
  async function urlToBase64Safe(url: string): Promise<string | null> {
    // For local /images/ paths, build full URL using window.location.origin
    const fullUrl = url.startsWith("/")
      ? `${window.location.origin}${url}`
      : url;

    try {
      const res = await fetch(fullUrl, { mode: "cors" });
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Dropzone
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setUserImage(b64);
    setUserPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
  });

  // Generate try-on
  async function handleGenerate() {
    if (!userImage) return;
    setLoading(true);
    setResult(null);

    try {
      setLoadingStep("Analyzing product with Muse Spark...");
      await new Promise(r => setTimeout(r, 500));
      setLoadingStep("Segmenting with SAM 3.1...");
      await new Promise(r => setTimeout(r, 500));
      setLoadingStep("Compositing with Muse Image...");
      await new Promise(r => setTimeout(r, 500));
      setLoadingStep("Analyzing fit with Muse Wonder...");

      // Try to get product image as base64
      // If CORS blocks it, send the URL — backend fetches it server-side
      const productB64 = await urlToBase64Safe(productImageUrl);

      const body: any = {
        user_image_base64: userImage,
        user_type: "person",
      };

      if (productB64) {
        // Browser could fetch the image — send as base64
        body.product_image_base64 = productB64;
      } else if (productImageUrl.startsWith("http")) {
        // CORS blocked — let backend fetch it by URL
        body.instagram_url = productImageUrl;
      } else {
        throw new Error(
          "Could not load product image. Try uploading the product photo directly using the 'Upload' option."
        );
      }

      const res = await fetch(`${API}/try-on`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Try-on failed");
      }

      const data: TryOnResult = await res.json();
      setResult(data);
    } catch (e: any) {
      alert(e.message || "Try-on failed. Please try again.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  function handleDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = `data:image/jpeg;base64,${result.result_image_base64}`;
    a.download = `tryon-${productName.replace(/\s+/g, "-")}.jpg`;
    a.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }

  async function handleShareToWall() {
    if (!result) return;
    try {
      // Extract product ID from URL
      const pathParts = window.location.pathname.split("/");
      const productId = Number(pathParts[pathParts.indexOf("product") + 1]) || 1;
      await fetch(`${API}/social-proof/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          image_base64: result.result_image_base64,
          height: shareForm.height,
          size: shareForm.size,
          body_type: shareForm.body_type,
        }),
      });
      setShared(true);
      setShowShareForm(false);
    } catch {
      alert("Share failed, try again");
    }
  }

  const fitColor = result
    ? result.fit_score >= 8 ? "#10b981"
    : result.fit_score >= 6 ? "#f59e0b"
    : "#ef4444"
    : "#10b981";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 bg-white rounded-3xl w-full overflow-y-auto shadow-2xl"
        style={{ maxWidth: "900px", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Virtual Try-On</h2>
            <p className="text-sm text-gray-400 mt-0.5">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            /* ── Upload phase ─────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Product preview */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Product</p>
                <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
                  <img
                    src={productImageUrl}
                    alt={productName}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* User photo upload */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Photo</p>

                {userPreview ? (
                  <div className="relative rounded-2xl overflow-hidden bg-gray-50" style={{ minHeight: "280px" }}>
                    <img
                      src={userPreview}
                      alt="You"
                      className="w-full h-full object-contain"
                      style={{ maxHeight: "400px", display: "block", margin: "0 auto" }}
                    />
                    <button
                      onClick={() => { setUserImage(null); setUserPreview(null); }}
                      className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full px-3 py-1 text-xs font-semibold text-gray-700 shadow"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragActive
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {isDragActive ? "Drop here" : "Upload your selfie"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP</p>
                  </div>
                )}

                {/* Tips */}
                <div className="mt-4 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Best results</p>
                  <ul className="space-y-1">
                    {["Clear, well-lit photo", "Plain background works best", "Face visible for clothing"].map(t => (
                      <li key={t} className="text-xs text-gray-500 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* ── Result phase ─────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left: image viewer */}
              <div>
                {/* Toggle */}
                <div className="flex rounded-xl bg-gray-100 p-1 gap-1 mb-4">
                  {["Try-On", "Original"].map((label, i) => (
                    <button
                      key={label}
                      onClick={() => setShowOriginal(i === 1)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        (i === 1) === showOriginal
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div
                  className="relative rounded-2xl overflow-hidden bg-gray-50"
                  style={{ minHeight: "280px" }}
                >
                  <img
                    src={
                      showOriginal
                        ? (userPreview || `data:image/jpeg;base64,${result.result_image_base64}`)
                        : `data:image/jpeg;base64,${result.result_image_base64}`
                    }
                    alt="Result"
                    className="w-full object-contain"
                    style={{ maxHeight: "480px", display: "block", margin: "0 auto" }}
                  />
                  {!showOriginal && (
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
                      AI Try-On
                    </div>
                  )}
                </div>

                {/* SAM segments */}
                {result.sam_segments && result.sam_segments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detected segments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.sam_segments.map((seg, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-black text-white">
                          {seg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: analysis + actions */}
              <div className="flex flex-col gap-4">

                {/* Product info */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                  <img src={productImageUrl} alt={productName} className="w-14 h-14 rounded-xl object-cover" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{result.product_name || productName}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{result.product_category}</p>
                  </div>
                </div>

                {/* Fit Analysis */}
                {result.fit_score > 0 && result.fit_verdict && (
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-sm font-bold text-gray-900">Fit Analysis</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${result.fit_score * 10}%`,
                              background: fitColor,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold" style={{ color: fitColor }}>
                          {result.fit_score}/10
                        </span>
                      </div>
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-2">
                      {/* Verdict badge */}
                      <span
                        className="self-start text-xs font-semibold px-3 py-1 rounded-full"
                        style={{
                          background: `${fitColor}18`,
                          color: fitColor,
                          border: `1px solid ${fitColor}40`,
                        }}
                      >
                        {result.fit_verdict}
                      </span>

                      {/* Issues */}
                      {result.fit_issues?.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <span className="text-xs text-gray-500">{issue}</span>
                        </div>
                      ))}

                      {/* Size rec */}
                      {result.size_recommendation && (
                        <div className="flex items-start gap-2 bg-emerald-50 rounded-lg px-3 py-2 mt-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span className="text-xs font-medium text-emerald-700">{result.size_recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Style note */}
                {result.style_note && (
                  <div className="flex items-start gap-3 bg-orange-50 rounded-xl px-4 py-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-orange-600 mb-0.5">Style Note</p>
                      <p className="text-xs text-orange-800">{result.style_note}</p>
                    </div>
                  </div>
                )}

                {/* Pipeline */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { step: "01", label: "Muse Spark", sub: "Analyze" },
                    { step: "02", label: "SAM 3.1", sub: "Segment" },
                    { step: "03", label: "Muse Image", sub: "Composite" },
                    { step: "04", label: "Muse Wonder", sub: "Fit AI" },
                  ].map((s) => (
                    <div key={s.step} className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-xs font-black text-gray-300">{s.step}</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{s.label}</p>
                      <p className="text-xs text-gray-400" style={{ fontSize: "10px" }}>{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 rounded-xl bg-black text-white font-semibold text-sm hover:bg-gray-800 transition flex items-center justify-center gap-2"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {downloaded ? "Downloaded!" : "Download Try-On"}
                  </button>

                  {/* Share to product wall */}
                  {!shared ? (
                    showShareForm ? (
                      <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                        <p className="text-xs font-semibold text-gray-700">Share details (optional)</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "height", placeholder: "Height e.g. 5'6\"" },
                            { key: "size", placeholder: "Size e.g. M" },
                            { key: "body_type", placeholder: "Body type" },
                          ].map(f => (
                            <input
                              key={f.key}
                              placeholder={f.placeholder}
                              value={(shareForm as any)[f.key]}
                              onChange={e => setShareForm(p => ({ ...p, [f.key]: e.target.value }))}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-black"
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleShareToWall} className="flex-1 py-2 rounded-lg bg-black text-white text-xs font-semibold">
                            Share to Wall
                          </button>
                          <button onClick={() => setShowShareForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowShareForm(true)}
                        className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        Share to Product Wall
                      </button>
                    )
                  ) : (
                    <div className="text-center py-2 text-sm text-emerald-600 font-semibold">
                      ✓ Shared to product wall!
                    </div>
                  )}

                  <button
                    onClick={() => setResult(null)}
                    className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generate button — only shown in upload phase */}
          {!result && (
            <div className="mt-6">
              <button
                onClick={handleGenerate}
                disabled={!userImage || loading}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                  userImage && !loading
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {loadingStep || "Generating..."}
                  </span>
                ) : (
                  "Generate Try-On"
                )}
              </button>
              {!userImage && (
                <p className="text-center text-xs text-gray-400 mt-2">Upload your photo to generate</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
