import Image from "next/image";

export default function LogoLoader({ size = 108, label = "Loading..." }: { size?: number; label?: string }) {
  const ringSize = Math.round(size * 1.22);
  const glowSize = Math.round(size * 1.55);

  return (
    <div className="sabres-loader flex flex-col items-center gap-4 py-16">
      <div className="relative flex items-center justify-center" style={{ width: glowSize, height: glowSize }}>
        <div
          className="absolute rounded-full"
          style={{
            width: glowSize,
            height: glowSize,
            background: "radial-gradient(circle, rgba(252,181,20,0.35), transparent 70%)",
            animation: "sabres-glow-pulse 2.4s ease-in-out infinite",
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
            animation: "sabres-ring-spin 1s linear infinite",
          }}
        />
        <Image
          // Placeholder monogram until the real team logo is swapped in.
          src="/nyhl-sabres/sabres-logo.png"
          alt="Sabres"
          width={size}
          height={size}
          priority
          className="rounded-full border border-accent/30"
          style={{ animation: "sabres-logo-breathe 2.4s ease-in-out infinite" }}
        />
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</span>
      <style>{`
        @keyframes sabres-glow-pulse {
          0%, 100% { opacity: 0.45; transform: scale(0.88); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes sabres-ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes sabres-logo-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.93); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sabres-loader * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
