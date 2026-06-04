// src/pages/PublicStore.tsx
// Public route: /store/:userId  — no authentication required
// Anyone with the link can browse the shop's live inventory.

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface InventoryProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit_price: number;
  current_stock: number;
  min_stock_level: number;
  unit: string;
  category: string | null;
  photo_url?: string | null;
  variants?: string;
  is_active: boolean;
}

interface Variant {
  id: string;
  stock_quantity: number;
  unit_price: number;
  cost_price?: number;
  hsn_code?: string;
  [key: string]: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseVariants = (p: InventoryProduct): Variant[] => {
  try { return p.variants ? JSON.parse(p.variants) : []; }
  catch { return []; }
};

// Handles old plain-URL strings, new JSON arrays, and null
const parsePhotoUrls = (photo_url: string | null | undefined): string[] => {
  if (!photo_url) return [];
  try {
    const parsed = JSON.parse(photo_url);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    return [photo_url];
  } catch {
    return [photo_url];
  }
};

// Returns first photo URL or null
const getFirstPhoto = (photo_url: string | null | undefined): string | null => {
  const urls = parsePhotoUrls(photo_url);
  return urls.length > 0 ? urls[0] : null;
};

const SPECIAL_KEYS = new Set(["id", "stock_quantity", "unit_price", "cost_price", "hsn_code", "min_stock_level"]);

const getVariantLabel = (v: Variant) =>
  Object.entries(v)
    .filter(([k, val]) => !SPECIAL_KEYS.has(k) && val)
    .map(([, val]) => val)
    .slice(0, 3)
    .join(" / ") || "Default";

const getTotalStock = (variants: Variant[], fallback: number) =>
  variants.length ? variants.reduce((s, v) => s + (v.stock_quantity || 0), 0) : fallback;

const getMinPrice = (variants: Variant[], fallback: number) => {
  if (!variants.length) return fallback;
  const prices = variants.map((v) => v.unit_price).filter(Boolean);
  return prices.length ? Math.min(...prices) : fallback;
};

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductModal({ product, onClose }: { product: InventoryProduct; onClose: () => void }) {
  const variants = parseVariants(product);
  const totalStock = getTotalStock(variants, product.current_stock);
  const photos = parsePhotoUrls(product.photo_url);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const prevPhoto = () => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  const nextPhoto = () => setPhotoIdx((i) => (i + 1) % photos.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Photo */}
        <div className="relative">
          {photos.length > 0 ? (
            <div className="relative">
              <img
                src={photos[photoIdx]}
                alt={product.name}
                className="w-full h-60 sm:h-72 object-cover sm:rounded-t-3xl rounded-t-3xl"
              />
              {/* Nav arrows for multiple photos */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white text-sm transition-all"
                  >‹</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white text-sm transition-all"
                  >›</button>
                  <span className="absolute bottom-3 right-3 text-[11px] font-bold bg-black/40 text-white backdrop-blur-sm rounded-full px-2 py-0.5">
                    {photoIdx + 1} / {photos.length}
                  </span>
                </>
              )}
              {/* Thumbnail strip */}
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                      className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? "bg-white scale-125" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-48 sm:rounded-t-3xl rounded-t-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <span className="text-6xl opacity-20">📦</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white text-sm transition-all"
          >✕</button>
          <div className="absolute bottom-3 left-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm border ${
              totalStock === 0
                ? "bg-red-500/80 text-white border-red-400"
                : totalStock <= product.min_stock_level
                ? "bg-yellow-400/90 text-yellow-900 border-yellow-300"
                : "bg-green-500/80 text-white border-green-400"
            }`}>
              {totalStock === 0 ? "Out of Stock" : totalStock <= product.min_stock_level ? `Only ${totalStock} left!` : `${totalStock} in stock`}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h2>
              {product.sku && (
                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0 mt-1">#{product.sku}</span>
              )}
            </div>
            {product.category && (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 mt-1.5 inline-block">{product.category}</span>
            )}
          </div>

          {product.description && <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>}

          {variants.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Available Options</p>
              <div className="space-y-2">
                {variants.map((v) => {
                  const inStock = (v.stock_quantity || 0) > 0;
                  return (
                    <div key={v.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${inStock ? "border-gray-200 bg-white hover:bg-gray-50" : "border-red-100 bg-red-50/50 opacity-60"}`}>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{getVariantLabel(v)}</p>
                        <p className={`text-xs mt-0.5 ${inStock ? "text-green-600" : "text-red-500"}`}>
                          {inStock ? `${v.stock_quantity} available` : "Out of stock"}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">₹{fmt(v.unit_price || 0)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Price per {product.unit}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalStock} {product.unit} available</p>
              </div>
              <p className="text-3xl font-black text-indigo-700">₹{fmt(product.unit_price)}</p>
            </div>
          )}

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 text-center">
            <p className="text-white text-sm font-semibold">Interested in this product?</p>
            <p className="text-slate-400 text-xs mt-1">Contact the store to place your order.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Public Store Page ────────────────────────────────────────────────────
export default function PublicStore() {
  const { userId } = useParams<{ userId: string }>();
  const [products, setProducts]   = useState<InventoryProduct[]>([]);
  const [filtered, setFiltered]   = useState<InventoryProduct[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("all");
  const [stockOnly, setStockOnly] = useState(false);
  const [sortBy, setSortBy]       = useState<"name" | "price_asc" | "price_desc">("name");
  const [selected, setSelected]   = useState<InventoryProduct | null>(null);
  const [storeName, setStoreName] = useState("Our Store");

  useEffect(() => {
    if (!userId) { setError("Invalid store link."); setLoading(false); return; }
    (async () => {
      setLoading(true);

      // ── FIX: Fetch business name from business_settings (not profiles) ──
      const { data: bizSettings } = await supabase
        .from("business_settings")
        .select("business_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (bizSettings?.business_name) {
        setStoreName(bizSettings.business_name);
      } else {
        // Fallback to profile name if business_settings not set
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("full_name, company_name")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.company_name) setStoreName(profile.company_name);
        else if (profile?.full_name) setStoreName(`${profile.full_name}'s Store`);
        else setStoreName("Our Store");
      }

      const { data, error: err } = await supabase
        .from("inventory_products")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("name");

      if (err) setError("Unable to load products.");
      else { setProducts(data || []); }
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    let f = [...products];
    if (search) f = f.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
    );
    if (category !== "all") f = f.filter((p) => p.category === category);
    if (stockOnly) f = f.filter((p) => getTotalStock(parseVariants(p), p.current_stock) > 0);

    if (sortBy === "price_asc")  f.sort((a, b) => getMinPrice(parseVariants(a), a.unit_price) - getMinPrice(parseVariants(b), b.unit_price));
    if (sortBy === "price_desc") f.sort((a, b) => getMinPrice(parseVariants(b), b.unit_price) - getMinPrice(parseVariants(a), a.unit_price));
    if (sortBy === "name")       f.sort((a, b) => a.name.localeCompare(b.name));

    setFiltered(f);
  }, [products, search, category, stockOnly, sortBy]);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const inStockCount = products.filter((p) => getTotalStock(parseVariants(p), p.current_stock) > 0).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0ede8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm font-medium">Loading store…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0ede8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-center space-y-3 max-w-xs">
        <div className="text-5xl">🔍</div>
        <h2 className="text-lg font-bold text-gray-800">Store not found</h2>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />

      <div className="min-h-screen bg-[#f0ede8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Hero ── */}
        <header className="relative overflow-hidden bg-[#1c1c1e] text-white">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-indigo-700/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-pink-700/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-900/10 blur-[100px] pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-6 py-16 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-400 mb-3">Welcome to</p>
            <h1 className="text-4xl sm:text-6xl font-black leading-[1.1] mb-5" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>
              {storeName}
            </h1>
            <p className="text-slate-400 text-base max-w-sm mx-auto leading-relaxed">
              Browse our full catalog — fresh stock, real prices, always up to date.
            </p>
            <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
              {[
                { label: "Products",   value: products.length },
                { label: "Categories", value: categories.length },
                { label: "In Stock",   value: inStockCount },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 backdrop-blur-sm text-center min-w-[80px]">
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── Sticky filter bar ── */}
        <div className="sticky top-0 z-30 bg-[#f0ede8]/95 backdrop-blur-md border-b border-[#ddd8d0] shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#ddd8d0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400"
                />
              </div>
              {categories.length > 0 && (
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-[#ddd8d0] bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700">
                  <option value="all">All Categories</option>
                  {categories.map((c) => <option key={c} value={c!}>{c}</option>)}
                </select>
              )}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-xl border border-[#ddd8d0] bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700">
                <option value="name">Sort: A–Z</option>
                <option value="price_asc">Price: Low–High</option>
                <option value="price_desc">Price: High–Low</option>
              </select>
              <button onClick={() => setStockOnly(!stockOnly)} className={`rounded-xl border text-sm px-4 py-2 font-semibold transition-all ${stockOnly ? "bg-[#1c1c1e] text-white border-[#1c1c1e]" : "bg-white text-gray-600 border-[#ddd8d0] hover:border-gray-400"}`}>
                In Stock Only
              </button>
              <p className="text-xs text-gray-400 ml-auto hidden sm:block">{filtered.length} / {products.length} shown</p>
            </div>
          </div>
        </div>

        {/* ── Category quick-scroll ── */}
        {categories.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              <button onClick={() => setCategory("all")} className={`shrink-0 text-xs font-semibold rounded-full px-4 py-1.5 border transition-all ${category === "all" ? "bg-[#1c1c1e] text-white border-[#1c1c1e]" : "bg-white text-gray-600 border-[#ddd8d0] hover:border-gray-400"}`}>All</button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(category === c ? "all" : c!)} className={`shrink-0 text-xs font-semibold rounded-full px-4 py-1.5 border transition-all ${category === c ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-[#ddd8d0] hover:border-gray-400"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Grid ── */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 pb-16">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🛒</p>
              <p className="text-gray-600 font-semibold text-lg">No products found</p>
              <button onClick={() => { setSearch(""); setCategory("all"); setStockOnly(false); }} className="mt-3 text-indigo-600 text-sm underline">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((product) => {
                const variants   = parseVariants(product);
                const minPrice   = getMinPrice(variants, product.unit_price);
                const maxPrice   = variants.length ? Math.max(...variants.map((v) => v.unit_price).filter(Boolean)) : product.unit_price;
                const totalStock = getTotalStock(variants, product.current_stock);
                const inStock    = totalStock > 0;
                const hasRange   = variants.length > 1 && minPrice !== maxPrice;
                // ── FIX: parse photo_url as JSON array ──
                const firstPhoto = getFirstPhoto(product.photo_url);

                return (
                  <button
                    key={product.id}
                    onClick={() => setSelected(product)}
                    className="group text-left bg-white rounded-2xl overflow-hidden border border-[#e8e3dc] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <div className="relative overflow-hidden bg-gray-100 aspect-square">
                      {firstPhoto ? (
                        <img src={firstPhoto} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <span className="text-4xl opacity-20">📦</span>
                        </div>
                      )}
                      {!inStock && (
                        <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg rotate-[-6deg]">Sold Out</span>
                        </div>
                      )}
                      {inStock && totalStock <= product.min_stock_level && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Low stock</span>
                        </div>
                      )}
                      {product.category && (
                        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-black/45 text-white backdrop-blur-sm rounded-full px-2 py-0.5">{product.category}</span>
                      )}
                      {variants.length > 1 && (
                        <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-white/80 backdrop-blur-sm text-gray-700 rounded-full px-2 py-0.5 border border-white">{variants.length} options</span>
                      )}
                      {/* Multi-photo indicator */}
                      {parsePhotoUrls(product.photo_url).length > 1 && (
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/40 text-white backdrop-blur-sm rounded-full px-2 py-0.5">
                          +{parsePhotoUrls(product.photo_url).length - 1} photos
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{product.name}</h3>
                      {product.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{product.description}</p>
                      )}
                      <div className="flex items-end justify-between mt-2 gap-1">
                        <div>
                          {hasRange ? (
                            <>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wide">from</p>
                              <p className="text-base font-black text-gray-900">₹{fmt(minPrice)}</p>
                            </>
                          ) : (
                            <p className="text-base font-black text-gray-900">₹{fmt(minPrice)}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${!inStock ? "bg-red-100 text-red-600" : totalStock <= product.min_stock_level ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {!inStock ? "Sold out" : totalStock <= product.min_stock_level ? `${totalStock} left` : "In stock"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-[#ddd8d0] bg-[#1c1c1e] text-center py-8 px-6">
          <p className="text-slate-400 text-sm font-medium">{storeName}</p>
          <p className="text-slate-600 text-xs mt-1">Powered by your Inventory System</p>
        </footer>
      </div>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}