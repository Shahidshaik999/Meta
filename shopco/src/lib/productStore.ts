import { Product } from "@/types/product.types";

const STORAGE_KEY = "shopco_products";
const STORAGE_VERSION = "v5"; // restored to original 8 products
const VERSION_KEY = "shopco_products_version";

// ── Default products — original ShopCo products ───────────────────────────────
export const defaultProducts: Product[] = [
  {
    id: 1,
    title: "T-shirt with Tape Details",
    srcUrl: "/images/pic1.png",
    gallery: ["/images/pic1.png", "/images/pic10.png", "/images/pic11.png"],
    price: 120,
    discount: { amount: 0, percentage: 0 },
    rating: 4.5,
  },
  {
    id: 2,
    title: "Skinny Fit Jeans",
    srcUrl: "/images/pic2.png",
    gallery: ["/images/pic2.png"],
    price: 260,
    discount: { amount: 0, percentage: 20 },
    rating: 3.5,
  },
  {
    id: 3,
    title: "Chechered Shirt",
    srcUrl: "/images/pic3.png",
    gallery: ["/images/pic3.png"],
    price: 180,
    discount: { amount: 0, percentage: 0 },
    rating: 4.5,
  },
  {
    id: 4,
    title: "Sleeve Striped T-shirt",
    srcUrl: "/images/pic4.png",
    gallery: ["/images/pic4.png", "/images/pic10.png", "/images/pic11.png"],
    price: 160,
    discount: { amount: 0, percentage: 30 },
    rating: 4.5,
  },
  {
    id: 5,
    title: "Vertical Striped Shirt",
    srcUrl: "/images/pic5.png",
    gallery: ["/images/pic5.png", "/images/pic10.png", "/images/pic11.png"],
    price: 232,
    discount: { amount: 0, percentage: 20 },
    rating: 5.0,
  },
  {
    id: 6,
    title: "Courage Graphic T-shirt",
    srcUrl: "/images/pic6.png",
    gallery: ["/images/pic6.png", "/images/pic10.png", "/images/pic11.png"],
    price: 145,
    discount: { amount: 0, percentage: 0 },
    rating: 4.0,
  },
  {
    id: 7,
    title: "Loose Fit Bermuda Shorts",
    srcUrl: "/images/pic7.png",
    gallery: ["/images/pic7.png"],
    price: 80,
    discount: { amount: 0, percentage: 0 },
    rating: 3.0,
  },
  {
    id: 8,
    title: "Faded Skinny Jeans",
    srcUrl: "/images/pic8.png",
    gallery: ["/images/pic8.png"],
    price: 210,
    discount: { amount: 0, percentage: 10 },
    rating: 4.5,
  },
];

// Get all products (localStorage first, then defaults)
export function getProducts(): Product[] {
  if (typeof window === "undefined") return defaultProducts;
  try {
    // Version check — if version changed, reset to new defaults
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      return defaultProducts;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Product[];
  } catch {}
  return defaultProducts;
}

// Save all products to localStorage
export function saveProducts(products: Product[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// Add a new product
export function addProduct(product: Omit<Product, "id">): Product {
  const products = getProducts();
  const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
  const newProduct: Product = { ...product, id: maxId + 1 };
  saveProducts([...products, newProduct]);
  return newProduct;
}

// Update an existing product
export function updateProduct(updated: Product): void {
  const products = getProducts();
  saveProducts(products.map((p) => (p.id === updated.id ? updated : p)));
}

// Delete a product
export function deleteProduct(id: number): void {
  const products = getProducts();
  saveProducts(products.filter((p) => p.id !== id));
}

// Reset to defaults
export function resetProducts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
}

// Admin password
export const ADMIN_PASSWORD = "shopco2026";

export function checkAdminAuth(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("admin_auth") === "true";
}

export function setAdminAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("admin_auth", "true");
}

export function clearAdminAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("admin_auth");
}
