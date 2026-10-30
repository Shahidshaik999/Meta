import BreadcrumbShop from "@/components/shop-page/BreadcrumbShop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileFilters from "@/components/shop-page/filters/MobileFilters";
import Filters from "@/components/shop-page/filters";
import { FiSliders } from "react-icons/fi";
import DynamicProductGrid from "@/components/shop-page/DynamicProductGrid";

export default function ShopPage() {
  return (
    <main className="pb-20">
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />
        <BreadcrumbShop />
        <div className="flex md:space-x-5 items-start">
          {/* Filters sidebar */}
          <div className="hidden md:block min-w-[295px] max-w-[295px] border border-black/10 rounded-[20px] px-5 md:px-6 py-5 space-y-5 md:space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-bold text-black text-xl">Filters</span>
              <FiSliders className="text-2xl text-black/40" />
            </div>
            <Filters />
          </div>

          {/* Product grid */}
          <div className="flex flex-col w-full space-y-5">
            <div className="flex flex-col lg:flex-row lg:justify-between">
              <div className="flex items-center justify-between">
                <h1 className="font-bold text-2xl md:text-[32px]">All Products</h1>
                <MobileFilters />
              </div>
              <div className="flex items-center">
                Sort by:{" "}
                <Select defaultValue="most-popular">
                  <SelectTrigger className="font-medium text-sm px-1.5 sm:text-base w-fit text-black bg-transparent shadow-none border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="most-popular">Most Popular</SelectItem>
                    <SelectItem value="low-price">Low Price</SelectItem>
                    <SelectItem value="high-price">High Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic grid — reads from localStorage (admin-managed) */}
            <DynamicProductGrid />
          </div>
        </div>
      </div>
    </main>
  );
}
