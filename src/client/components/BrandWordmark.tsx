/** Text wordmark matching the official logo: lowercase Inter Bold, accent on “me”. */
export function BrandWordmark({ className = "brand-name" }: { className?: string }) {
  return (
    <span className={className}>
      squad<span className="brand-name-me">me</span>
    </span>
  );
}
