/**
 * Renders "Lifetime" with the dot on the first "i" replaced by a tiny ∞ symbol.
 * Uses the Turkish dotless-ı (U+0131) with a positioned ∞ above it.
 */
export default function BrandName({ className }: { className?: string }) {
  return (
    <span className={className}>
      L
      <span className="relative inline-block">
        <span className="absolute -top-[0.3em] left-[-0.1em] right-[-0.1em] text-center text-[0.4em] leading-none">
          ∞
        </span>
        ı
      </span>
      fetime
    </span>
  );
}
