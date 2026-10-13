interface LogoMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Orion constellation mark: shoulders, the three belt stars and the feet,
 * drawn in currentColor so it follows the theme. Rigel (bottom right) is the
 * brightest star and the only one drawn larger.
 */
export default function LogoMark({ size = 20, className, title }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g stroke="currentColor" strokeOpacity="0.42" strokeWidth="1.3" strokeLinecap="round">
        <path d="M6.2 4.6 9.4 11.4M17.3 5.4l-2.7 7.8M9.4 11.4l2.6.9 2.6.9M9.4 11.4l-1.9 8M14.6 13.2l3.1 5.9" />
      </g>
      <g fill="currentColor">
        <circle cx="6.2" cy="4.6" r="1.9" />
        <circle cx="17.3" cy="5.4" r="1.5" />
        <circle cx="9.4" cy="11.4" r="1.45" />
        <circle cx="12" cy="12.3" r="1.45" />
        <circle cx="14.6" cy="13.2" r="1.45" />
        <circle cx="7.5" cy="19.4" r="1.55" />
        <circle cx="17.7" cy="19.1" r="2.35" />
      </g>
    </svg>
  );
}
