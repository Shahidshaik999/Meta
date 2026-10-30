"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  resetProducts,
  checkAdminAuth,
  setAdminAuth,
  clearAdminAuth,
  ADMIN_PASSWORD,
} from "@/lib/productStore";
import { Product } from "@/types/product.types";

// ─── Empty form state ──────────────────────────────────────────────────────────
const emptyForm = {
  title: "",
  srcUrl: "",
  price: "",
  discountPercentage: "",
  discountAmount: "",
  rating: "4.5",
};

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false);
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [products, setProducts]   = useState<Product[]>([]);
  const [form, setForm]           = useState(emptyForm);
  const [editId, setEditId]       = useState<number | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [toast, setToast]         = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Check auth on load
  useEffect(() => {
    if (checkAdminAuth()) {
      setAuthed(true);
      setProducts(getProducts());
    }
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAdminAuth();
      setAuthed(true);
      setProducts(getProducts());
      setError("");
    } else {
      setError("Incorrect password");
    }
  }

  function handleLogout() {
    clearAdminAuth();
    setAuthed(false);
  }

  // ─── Image upload → base64 → data URL ─────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, srcUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
  });

  // ─── Save product ─────────────────────────────────────────────────────────
  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.srcUrl || !form.price) {
      setError("Title, image, and price are required");
      return;
    }

    const productData = {
      title: form.title.trim(),
      srcUrl: form.srcUrl,
      gallery: [form.srcUrl],
      price: Number(form.price),
      discount: {
        amount: Number(form.discountAmount) || 0,
        percentage: Number(form.discountPercentage) || 0,
      },
      rating: Number(form.rating) || 4.5,
    };

    if (editId !== null) {
      updateProduct({ ...productData, id: editId });
      showToast("Product updated!");
    } else {
      addProduct(productData);
      showToast("Product added!");
    }

    setProducts(getProducts());
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────
  function handleEdit(p: Product) {
    setForm({
      title: p.title,
      srcUrl: p.srcUrl,
      price: String(p.price),
      discountPercentage: String(p.discount.percentage || ""),
      discountAmount: String(p.discount.amount || ""),
      rating: String(p.rating),
    });
    setEditId(p.id);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  function handleDelete(id: number) {
    deleteProduct(id);
    setProducts(getProducts());
    setDeleteConfirm(null);
    showToast("Product deleted");
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  function handleReset() {
    if (confirm("Reset all products to defaults? This cannot be undone.")) {
      resetProducts();
      setProducts(getProducts());
      showToast("Reset to defaults");
    }
  }

  // ─── Login screen ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-400 mt-1">ShopCo Product Management</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-black text-white rounded-xl py-3 font-semibold text-sm hover:bg-gray-800 transition"
            >
              Login
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">Default password: shopco2026</p>
        </div>
      </div>
    );
  }

  // ─── Admin dashboard ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-black text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-black transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </a>
          <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
            {products.length} products
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); setError(""); }}
            className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Product
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-black transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Add / Edit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-5">
              {editId !== null ? "Edit Product" : "Add New Product"}
            </h2>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Left: image */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Product Image
                  </label>

                  {form.srcUrl ? (
                    <div className="relative rounded-2xl overflow-hidden aspect-square bg-gray-50 border border-gray-100">
                      <img
                        src={form.srcUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Show broken image message if URL doesn't load
                          (e.target as HTMLImageElement).style.display = "none";
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent && !parent.querySelector(".img-error")) {
                            const msg = document.createElement("div");
                            msg.className = "img-error absolute inset-0 flex items-center justify-center text-center p-4";
                            msg.innerHTML = '<p class="text-xs text-gray-400">Image could not load.<br/>Try right-clicking the image on the website and selecting <b>"Copy image address"</b></p>';
                            parent.appendChild(msg);
                          }
                        }}
                        onLoad={(e) => {
                          // Clear any error message on successful load
                          (e.target as HTMLImageElement).style.display = "block";
                          const parent = (e.target as HTMLImageElement).parentElement;
                          parent?.querySelector(".img-error")?.remove();
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, srcUrl: "" }))}
                        className="absolute top-3 right-3 bg-white shadow rounded-full px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      {...getRootProps()}
                      className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                        isDragActive ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">
                        {isDragActive ? "Drop here" : "Click or drag image"}
                      </p>
                      <p className="text-xs text-gray-300 mt-1">JPG, PNG, WebP</p>
                    </div>
                  )}
                </div>

                {/* Or URL input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Paste image link from any website
                  </label>
                  <input
                    type="text"
                    placeholder="Paste image URL here — e.g. https://amazon.com/..."
                    value={form.srcUrl.startsWith("data:") ? "" : form.srcUrl}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setForm(f => ({ ...f, srcUrl: val }));
                    }}
                    onPaste={(e) => {
                      // Auto-set on paste instantly
                      const pasted = e.clipboardData.getData("text").trim();
                      setTimeout(() => setForm(f => ({ ...f, srcUrl: pasted })), 10);
                    }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Right-click any product image → "Copy image address" → paste here
                  </p>
                </div>
              </div>

              {/* Right: details */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Classic White T-Shirt"
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    placeholder="120"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Discount %
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      value={form.discountPercentage}
                      onChange={(e) => setForm(f => ({ ...f, discountPercentage: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Discount $
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={form.discountAmount}
                      onChange={(e) => setForm(f => ({ ...f, discountAmount: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Rating (0–5)
                  </label>
                  <input
                    type="number"
                    placeholder="4.5"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => setForm(f => ({ ...f, rating: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition"
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex gap-3 mt-auto pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-black text-white rounded-xl py-3 font-semibold text-sm hover:bg-gray-800 transition"
                  >
                    {editId !== null ? "Update Product" : "Add Product"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setError(""); }}
                    className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-3 font-semibold text-sm hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-md transition-all"
            >
              {/* Image */}
              <div className="aspect-square bg-gray-50 overflow-hidden">
                <img
                  src={p.srcUrl}
                  alt={p.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-bold text-gray-900">${p.price}</p>
                  {p.discount.percentage > 0 && (
                    <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                      -{p.discount.percentage}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-yellow-500">★</span>
                  <span className="text-xs text-gray-400">{p.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-300 ml-1">ID: {p.id}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(p)}
                    className="flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-1.5 rounded-lg hover:border-black hover:text-black transition"
                  >
                    Edit
                  </button>
                  {deleteConfirm === p.id ? (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex-1 bg-red-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-600 transition"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="flex-1 border border-gray-200 text-gray-400 text-xs font-semibold py-1.5 rounded-lg hover:border-red-300 hover:text-red-500 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reset button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-red-500 transition underline underline-offset-2"
          >
            Reset all products to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
