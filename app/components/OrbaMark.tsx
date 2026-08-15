import Image from "next/image";

export function OrbaMark({
  size = 34,
  label = true,
}: {
  size?: number;
  label?: boolean;
}) {
  return (
    <span className="orba-lockup" aria-label={label ? "Orba" : undefined}>
      <Image
        src="/brand/orba-icon-512.png"
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
      />
      {label && <span>Orba</span>}
    </span>
  );
}
