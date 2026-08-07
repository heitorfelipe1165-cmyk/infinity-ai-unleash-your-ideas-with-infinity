import { Link } from "@tanstack/react-router";

/** Logotipo minimalista da Infinity AI (sem cara de robô). */
export function InfinityLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 28"
      role="img"
      aria-label="Infinity AI"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="infinity-stroke" x1="0" y1="0" x2="48" y2="28">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        d="M14 4c5.5 0 8 6.4 10 10s4.5 10 10 10 8-4.5 8-10-4-10-8-10-8 6.4-10 10-4.5 10-10 10S6 19.5 6 14 10 4 14 4z"
        stroke="url(#infinity-stroke)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandMark({ to }: { to?: "/" }) {
  const content = (
    <>
      <InfinityLogo className="h-7 w-7 text-neon" />
      <span className="font-display text-lg font-semibold tracking-tight">Infinity AI</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="flex items-center gap-2">
        {content}
      </Link>
    );
  }
  return <div className="flex items-center gap-2">{content}</div>;
}
