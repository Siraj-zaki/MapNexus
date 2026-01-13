// Pre-defined SVG paths for supported icons (24x24 viewbox base)
// We will scale/translate them to fit into the marker
const ICONS: Record<string, string> = {
  TAG: '<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" fill="white" stroke="none"/><path d="M7 7h.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  USER: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="7" r="4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  CAR: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="7" cy="17" r="2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="17" cy="17" r="2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M5 17h2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M9 17h6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  TRUCK:
    '<path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19.17 9.17A4 4 0 0 0 16.34 8H14v9h2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="7" cy="17" r="2" stroke="white" stroke-width="2" fill="none"/><circle cx="17" cy="17" r="2" stroke="white" stroke-width="2" fill="none"/>',
  HOME: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="9 22 9 12 15 12 15 22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  STAR: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  LOCATION:
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="10" r="3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  FLAG: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="4" y1="22" x2="4" y2="15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  BUILDING:
    '<rect x="4" y="2" width="16" height="20" rx="2" ry="2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="9" y1="22" x2="9" y2="22.01" stroke="white" stroke-width="3"/><line x1="15" y1="22" x2="15" y2="22.01" stroke="white" stroke-width="3"/><line x1="9" y1="18" x2="9" y2="18.01" stroke="white" stroke-width="3"/><line x1="15" y1="18" x2="15" y2="18.01" stroke="white" stroke-width="3"/><line x1="9" y1="14" x2="9" y2="14.01" stroke="white" stroke-width="3"/><line x1="15" y1="14" x2="15" y2="14.01" stroke="white" stroke-width="3"/><line x1="9" y1="10" x2="9" y2="10.01" stroke="white" stroke-width="3"/><line x1="15" y1="10" x2="15" y2="10.01" stroke="white" stroke-width="3"/><line x1="9" y1="6" x2="9" y2="6.01" stroke="white" stroke-width="3"/><line x1="15" y1="6" x2="15" y2="6.01" stroke="white" stroke-width="3"/>',
  CIRCLE: '<circle cx="12" cy="12" r="6" fill="white" stroke="none"/>',
};

// Generates the SVG string for the marker
export function getMarkerSvg(color: string, iconType: string = 'TAG'): string {
  // 1. Get icon path (default to TAG if not found)
  const iconContent = ICONS[iconType] || ICONS.TAG;

  // 2. Define the main marker shape and filters using the provided template
  // We place the icon at roughly x=110, y=70 within the viewBox 0 0 345 493
  // Scaling the 24x24 icon up to ~120x120 to fit nicely
  const svg = `
    <svg width="70" height="70" viewBox="0 0 345 493" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="filter0_di_58_14754" x="28" y="27" width="292" height="291" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.856915 0 0 0 0 0.856915 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_58_14754" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_58_14754" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect2_innerShadow_58_14754" />
        </filter>
      </defs>
      
      <!-- Outer Shape (Stroke) -->
      <path d="M172.5 4C265.638 4 341 77.9499 341 169C341 260.05 265.638 334 172.5 334C79.3623 334 4 260.05 4 169C4 77.9499 79.3623 4 172.5 4Z" fill="${color}" stroke="white" stroke-width="8" />
      <path d="M41.8574 274.608L304.806 272.082L175.35 483.38L41.8574 274.608Z" fill="${color}" stroke="white" stroke-width="8" />
      
      <!-- Inner Circle with filter -->
      <g filter="url(#filter0_di_58_14754)">
        <path d="M310 168.5C310 243.335 249.111 304 174 304C98.8893 304 38 243.335 38 168.5C38 93.6654 98.8893 33 174 33C249.111 33 310 93.6654 310 168.5Z" fill="black" />
        <path d="M174 37.5C246.641 37.5 305.5 96.1663 305.5 168.5C305.5 240.834 246.641 299.5 174 299.5C101.359 299.5 42.5 240.834 42.5 168.5C42.5 96.1663 101.359 37.5 174 37.5Z" stroke="white" stroke-width="9" />
      </g>

      <!-- Icon Overlay (Translated and Scaled) -->
      <g transform="translate(114, 108) scale(5)">
        ${iconContent}
      </g>
    </svg>
  `;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

export const SUPPORTED_ICONS = Object.keys(ICONS);
