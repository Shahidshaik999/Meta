import Link from "next/link";

const features = [
  {
    href: "/stylist",
    gradient: "from-purple-500 to-pink-500",
    lightBg: "bg-purple-50",
    lightBorder: "border-purple-100",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    tag: "AI STYLIST",
    title: "Aria — Personal Style Assistant",
    desc: "Chat with our AI stylist. Tell her your occasion, budget and vibe — she'll pick the perfect outfit from the store, just for you.",
    cta: "Chat with Aria",
  },
  {
    href: "/outfit-builder",
    gradient: "from-blue-500 to-cyan-500",
    lightBg: "bg-blue-50",
    lightBorder: "border-blue-100",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    tag: "OUTFIT BUILDER",
    title: "Mix & Match Full Looks",
    desc: "Pick a top, bottom and accessory. Our AI composites the full outfit onto your photo at once — see the complete look before you buy.",
    cta: "Build an Outfit",
  },
  {
    href: "/mood-board",
    gradient: "from-rose-500 to-orange-500",
    lightBg: "bg-rose-50",
    lightBorder: "border-rose-100",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    tag: "MOOD BOARD",
    title: "Shop by Vibe",
    desc: "Upload a Pinterest board, a celebrity photo, or any inspiration image. We identify your style and find matching products from our collection.",
    cta: "Find My Vibe",
  },
];

export default function FeaturesHub() {
  return (
    <section className="max-w-frame mx-auto px-4 xl:px-0 py-16">
      {/* Section header */}
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          Powered by Meta AI
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          The Future of Shopping
        </h2>
        <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm sm:text-base">
          Five AI features that make shopping smarter, faster and more personal than ever before.
        </p>
      </div>

      {/* Top 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {features.map((f) => (
          <Link key={f.href} href={f.href} className="group block">
            <div className={`rounded-3xl border ${f.lightBorder} ${f.lightBg} p-6 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <span className="text-xs font-black tracking-widest text-gray-400">{f.tag}</span>
              <h3 className="font-bold text-gray-900 text-base mt-1 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{f.desc}</p>
              <span className={`inline-flex items-center gap-1 text-sm font-bold bg-gradient-to-r ${f.gradient} bg-clip-text text-transparent`}>
                {f.cta}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900 group-hover:translate-x-1 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom 2 cards — try-on & social proof */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Virtual Try-On */}
        <Link href="/shop" className="group block">
          <div className="rounded-3xl border border-gray-100 bg-gray-900 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at top right, #7c3aed, transparent 60%)" }} />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <span className="text-xs font-black tracking-widest text-gray-400">AI TRY-ON</span>
              <h3 className="font-bold text-white text-base mt-1 mb-2">Virtual Try-On</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                See any product on yourself before buying. Fit analysis, size recommendation and style notes — all powered by Muse Wonder.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-violet-400 group-hover:gap-2 transition-all">
                Try it on any product
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </div>
        </Link>

        {/* Social Proof */}
        <Link href="/shop" className="group block">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span className="text-xs font-black tracking-widest text-gray-400">SOCIAL PROOF</span>
            <h3 className="font-bold text-gray-900 text-base mt-1 mb-2">Real People Wearing It</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              See real try-ons from people with your body type. After your try-on, share it to the product wall to help others.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 group-hover:gap-2 transition-all">
              Browse products
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
