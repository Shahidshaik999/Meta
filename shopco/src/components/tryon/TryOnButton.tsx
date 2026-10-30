"use client";

import { useState } from "react";
import TryOnModal from "./TryOnModal";

interface Props {
  productName: string;
  productImageUrl: string;
}

export default function TryOnButton({ productName, productImageUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-4 rounded-full border-2 border-black text-black font-medium text-sm hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
      >
        {/* Sparkle icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        Try It On
      </button>

      {open && (
        <TryOnModal
          productName={productName}
          productImageUrl={productImageUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
