"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_SHOPLENS_API || "http://meta-1-x9qz.onrender.com";

interface Props {
  productName: string;
  productCategory: string;
}

interface Prediction {
  recommended_size: string;
  confidence: number;
  fit_type: string;
  note: string;
}

export default function SizePredictor({ productName, productCategory }: Props) {
  const [open, setOpen]             = useState(false);
  const [step, setStep]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [form, setForm] = useState({
    height_cm: "",
    weight_kg: "",
    chest_cm: "",
    waist_cm: "",
    body_shape: "slim",
    usual_size: "M",
  });

  async function handlePredict() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/size/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          height_cm: Number(form.height_cm),
          weight_kg: Number(form.weight_kg),
          chest_cm: Number(form.chest_cm),
          waist_cm: Number(form.waist_cm),
          product_name: productName,
          product_category: productCategory,
        }),
      });
      const data = await res.json();
      setPrediction(data);
      setStep(3);
    } catch {
      alert("Prediction failed, try again");
    } finally {
      setLoading(false);
    }
  }

  const confColor = prediction
    ? prediction.confidence >= 85 ? "#10b981"
    : prediction.confidence >= 70 ? "#f59e0b"
    : "#ef4444"
    : "#10b981";

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition font-medium border-b border-dashed border-gray-300 pb-0.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        </svg>
        Predict my size with AI
      </button>

      {open && (
        <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-900 text-sm">AI Size Predictor</h4>
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-2 h-2 rounded-full transition-all ${step >= s ? "bg-black" : "bg-gray-200"}`} />
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 mb-1">Basic measurements</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "height_cm", label: "Height (cm)", placeholder: "165" },
                  { key: "weight_kg", label: "Weight (kg)", placeholder: "60" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    <input
                      type="number"
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!form.height_cm || !form.weight_kg}
                className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition"
              >
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 mb-1">Body details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Chest (cm)</label>
                  <input
                    type="number"
                    placeholder="86"
                    value={form.chest_cm}
                    onChange={e => setForm(prev => ({ ...prev, chest_cm: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Waist (cm)</label>
                  <input
                    type="number"
                    placeholder="68"
                    value={form.waist_cm}
                    onChange={e => setForm(prev => ({ ...prev, waist_cm: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Body shape</label>
                  <select
                    value={form.body_shape}
                    onChange={e => setForm(prev => ({ ...prev, body_shape: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  >
                    {["slim", "athletic", "curvy", "plus"].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Usual size</label>
                  <select
                    value={form.usual_size}
                    onChange={e => setForm(prev => ({ ...prev, usual_size: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  >
                    {["XS", "S", "M", "L", "XL", "XXL"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handlePredict}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Predicting...</>
                ) : "Predict My Size"}
              </button>
            </div>
          )}

          {step === 3 && prediction && (
            <div className="flex flex-col gap-3">
              {/* Big size display */}
              <div className="text-center py-4">
                <div
                  className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black text-white mb-3"
                  style={{ background: confColor }}
                >
                  {prediction.recommended_size}
                </div>
                <p className="font-bold text-gray-900">{prediction.fit_type}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${prediction.confidence}%`, background: confColor }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: confColor }}>{prediction.confidence}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">confidence</p>
              </div>
              <p className="text-xs text-gray-600 text-center bg-white rounded-xl px-4 py-3 border border-gray-100">
                {prediction.note}
              </p>
              <button
                onClick={() => { setStep(1); setPrediction(null); }}
                className="text-xs text-gray-400 hover:text-black transition text-center"
              >
                Recalculate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
