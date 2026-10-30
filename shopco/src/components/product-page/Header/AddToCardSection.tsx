"use client";

import CartCounter from "@/components/ui/CartCounter";
import React, { useState } from "react";
import AddToCartBtn from "./AddToCartBtn";
import { Product } from "@/types/product.types";
import TryOnButton from "@/components/tryon/TryOnButton";

const AddToCardSection = ({ data }: { data: Product }) => {
  const [quantity, setQuantity] = useState<number>(1);

  return (
    <div className="flex flex-col gap-3">
      {/* Add to cart row */}
      <div className="fixed md:relative w-full bg-white border-t md:border-none border-black/5 bottom-0 left-0 p-4 md:p-0 z-10 flex items-center justify-between sm:justify-start md:justify-center">
        <CartCounter onAdd={setQuantity} onRemove={setQuantity} />
        <AddToCartBtn data={{ ...data, quantity }} />
      </div>

      {/* Try-On button — only shown on md+ screens inline */}
      <div className="hidden md:block">
        <TryOnButton
          productName={data.title}
          productImageUrl={data.srcUrl}
        />
      </div>

      {/* Try-On button — shown on mobile above the fixed bar */}
      <div className="block md:hidden mb-16">
        <TryOnButton
          productName={data.title}
          productImageUrl={data.srcUrl}
        />
      </div>
    </div>
  );
};

export default AddToCardSection;
