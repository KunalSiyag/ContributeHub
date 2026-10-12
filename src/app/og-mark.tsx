/** Orion constellation as inline SVG for next/og ImageResponse renders. */
export function OgMark({ size, color, line }: { size: number; color: string; line: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6.2 4.6 9.4 11.4M17.3 5.4l-2.7 7.8M9.4 11.4l2.6.9 2.6.9M9.4 11.4l-1.9 8M14.6 13.2l3.1 5.9"
        stroke={line}
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <circle cx="6.2" cy="4.6" r="1.9" fill={color} />
      <circle cx="17.3" cy="5.4" r="1.5" fill={color} />
      <circle cx="9.4" cy="11.4" r="1.45" fill={color} />
      <circle cx="12" cy="12.3" r="1.45" fill={color} />
      <circle cx="14.6" cy="13.2" r="1.45" fill={color} />
      <circle cx="7.5" cy="19.4" r="1.55" fill={color} />
      <circle cx="17.7" cy="19.1" r="2.35" fill={color} />
    </svg>
  );
}
