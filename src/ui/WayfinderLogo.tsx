interface Props {
  size?: number;
  className?: string;
}

/**
 * Wayfinder compass-mark — an SVG wordmark/icon used in the app header.
 * Four cardinal spokes converging on a centre dot, framed in the brand accent.
 */
export const WayfinderLogo = ({ size = 48, className }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    {/* Outer ring */}
    <circle cx="24" cy="24" r="22" stroke="#e8833a" strokeWidth="2" />
    {/* N spoke — taller */}
    <line
      x1="24"
      y1="6"
      x2="24"
      y2="18"
      stroke="#e8833a"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* S spoke */}
    <line
      x1="24"
      y1="30"
      x2="24"
      y2="42"
      stroke="#e8833a"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.55"
    />
    {/* E spoke */}
    <line
      x1="30"
      y1="24"
      x2="42"
      y2="24"
      stroke="#e8833a"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.55"
    />
    {/* W spoke */}
    <line
      x1="6"
      y1="24"
      x2="18"
      y2="24"
      stroke="#e8833a"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.55"
    />
    {/* NE short */}
    <line
      x1="31"
      y1="17"
      x2="36"
      y2="12"
      stroke="#e8833a"
      strokeWidth="1"
      strokeLinecap="round"
      strokeOpacity="0.35"
    />
    {/* SW short */}
    <line
      x1="17"
      y1="31"
      x2="12"
      y2="36"
      stroke="#e8833a"
      strokeWidth="1"
      strokeLinecap="round"
      strokeOpacity="0.35"
    />
    {/* NW short */}
    <line
      x1="17"
      y1="17"
      x2="12"
      y2="12"
      stroke="#e8833a"
      strokeWidth="1"
      strokeLinecap="round"
      strokeOpacity="0.35"
    />
    {/* SE short */}
    <line
      x1="31"
      y1="31"
      x2="36"
      y2="36"
      stroke="#e8833a"
      strokeWidth="1"
      strokeLinecap="round"
      strokeOpacity="0.35"
    />
    {/* North arrowhead */}
    <polygon points="24,4 21,12 27,12" fill="#e8833a" />
    {/* Centre dot */}
    <circle cx="24" cy="24" r="3" fill="#e8833a" />
  </svg>
);
