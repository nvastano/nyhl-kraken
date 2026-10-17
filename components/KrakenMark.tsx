export default function KrakenMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-accent/30"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 32% 28%, var(--accent), rgba(79,217,196,0.12) 70%)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" width={size * 0.58} height={size * 0.58}>
        <path
          d="M12 3c-3.5 0-5.5 2.6-5.5 6 0 1.8.7 3.2 1.6 4.4C6.8 14.6 5.5 16 4 16.8c1.8.6 3.7.3 5-.6.3 1 .9 2 1.7 2.8.8-.8 1.4-1.8 1.7-2.8 1.3.9 3.2 1.2 5 .6-1.5-.8-2.8-2.2-4.1-3.4.9-1.2 1.6-2.6 1.6-4.4 0-3.4-2-6-5.5-6z"
          fill="currentColor"
          className="text-accent-ink"
          opacity={0.9}
        />
        <circle cx="9.7" cy="9.2" r="1" fill="var(--background)" />
        <circle cx="14.3" cy="9.2" r="1" fill="var(--background)" />
      </svg>
    </div>
  );
}
