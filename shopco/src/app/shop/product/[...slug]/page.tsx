"use client";

import { useEffect, useState } from "react";
import { getProducts } from "@/lib/productStore";
import ProductListSec from "@/components/common/ProductListSec";
import BreadcrumbProduct from "@/components/product-page/BreadcrumbProduct";
import Header from "@/components/product-page/Header";
import Tabs from "@/components/product-page/Tabs";
import SocialProofWall from "@/components/features/SocialProofWall";
import SizePredictor from "@/components/features/SizePredictor";
import { Product } from "@/types/product.types";

export default function ProductPage({
  params,
}: {
  params: { slug: string[] };
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const all = getProducts();
    const found = all.find((p) => p.id === Number(params.slug[0]));
    setProduct(found ?? null);
    setRelated(all.filter((p) => p.id !== Number(params.slug[0])).slice(0, 4));
    setLoading(false);
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900 mb-2">Product not found</p>
          <a href="/shop" className="text-sm text-gray-400 underline">Back to shop</a>
        </div>
      </div>
    );
  }

  return (
    <main>
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />
        <BreadcrumbProduct title={product.title} />
        <section className="mb-11">
          <Header data={product} />
        </section>

        {/* AI Size Predictor */}
        <div className="mb-8">
          <SizePredictor
            productName={product.title}
            productCategory="clothing"
          />
        </div>

        <Tabs />

        {/* Social Proof Wall */}
        <div className="mb-16">
          <SocialProofWall
            productId={product.id}
            productName={product.title}
          />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mb-[50px] sm:mb-20">
          <ProductListSec title="You might also like" data={related} />
        </div>
      )}
    </main>
  );
}
