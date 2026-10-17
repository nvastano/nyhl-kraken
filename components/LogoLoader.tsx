import Image from "next/image";

export default function LogoLoader({ size = 108, label = "Loading..." }: { size?: number; label?: string }) {
  const ringSize = Math.round(size * 1.22);
  const glowSize = Math.round(size * 1.55);

  return (
    <div className="kraken-loader flex flex-col items-center gap-4 py-16">
      <div className="relative flex items-center justify-center" style={{ width: glowSize, height: glowSize }}>
        <div
          className="absolute rounded-full"
          style={{
            width: glowSize,
            height: glowSize,
            background: "radial-gradient(circle, rgba(79,217,196,0.35), transparent 70%)",
            animation: "kraken-glow-pulse 2.4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: ringSize,
            height: ringSize,
            border: "2.5px solid transparent",
            borderTopColor: "var(--accent)",
            borderRightColor: "var(--accent)",
            animation: "kraken-ring-spin 1s linear infinite",
          }}
        />
        <Image
          src="/nyhl-kraken/kraken-logo.png"
          alt="Kraken"
          width={size}
          height={size}
          priority
          className="rounded-full border border-accent/30"
          style={{ animation: "kraken-logo-breathe 2.4s ease-in-out infinite" }}
        />
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</span>
      <style>{`
        @keyframes kraken-glow-pulse {
          0%, 100% { opacity: 0.45; transform: scale(0.88); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes kraken-ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes kraken-logo-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.93); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kraken-loader * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
