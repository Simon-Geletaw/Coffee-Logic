const TONES = {
  gold: { line: "bg-[#B08A3E]/60", dot: "bg-[#B08A3E]" },
  light: { line: "bg-[#E8E0CC]/60", dot: "bg-[#E8E0CC]" },
} as const;

type OrnamentProps = {
  tone?: keyof typeof TONES;
  className?: string;
};

/* Thin line — dot — line divider used across the storefront sections. */
export default function Ornament({ tone = "gold", className = "" }: OrnamentProps) {
  const { line, dot } = TONES[tone];
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`h-px w-10 ${line}`} />
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span className={`h-px w-10 ${line}`} />
    </span>
  );
}
