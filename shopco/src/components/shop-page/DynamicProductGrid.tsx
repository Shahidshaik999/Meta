"use client";

import { useEffect, useState } from "react";
import { getProducts } from "@/lib/productStore";
import { Product } from "@/types/product.types";
import ProductCard from "@/components/common/ProductCard";

export default function DynamicProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} data={product} />
      ))}
    </div>
  );
}
