/**
 * Dynamic Favicon & Logo Color Theming based on User Role
 *
 * Theme breakdown:
 * - Farmer: Rich Forest/Emerald Green background with Lush Green Sprout
 * - Buyer: Warm Harvest Amber/Terracotta background with Golden Sprout
 * - Delivery Agent / Driver: Deep Logistics Teal background with Electric Cyan Sprout
 * - Admin: Midnight Indigo background with Soft Violet Sprout
 * - Default / Guest: Classic KisanBazaar Green with Vibrant Lime Sprout
 */

export const ROLE_FAVICON_THEMES = {
  default: {
    bg: '#14532d',
    fg: '#a3e635',
    name: 'KisanBazaar',
  },
  farmer: {
    bg: '#14532d',
    fg: '#4ade80',
    name: 'Farmer Portal',
  },
  buyer: {
    bg: '#7c2d12',
    fg: '#fbbf24',
    name: 'Buyer Hub',
  },
  delivery_agent: {
    bg: '#134e4a',
    fg: '#2dd4bf',
    name: 'Delivery Agent',
  },
  driver: {
    bg: '#134e4a',
    fg: '#2dd4bf',
    name: 'Driver Hub',
  },
  admin: {
    bg: '#312e81',
    fg: '#a5b4fc',
    name: 'Admin Console',
  },
};

/**
 * Returns clean SVG markup string for the given role.
 */
export function getFaviconSvg(role) {
  const theme = ROLE_FAVICON_THEMES[role] || ROLE_FAVICON_THEMES.default;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="16" fill="${theme.bg}"/>
  <path d="M18 49 h28" stroke="${theme.fg}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M31 49 C31 42 33 36 34 29" stroke="${theme.fg}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M31 37 C21 37 17 29 25 24 C32 20 33 28 31 37 Z" stroke="${theme.fg}" stroke-width="4.5" stroke-linejoin="round" fill="none"/>
  <path d="M34 29 C44 26 47 16 38 15 C31 15 32 23 34 29 Z" stroke="${theme.fg}" stroke-width="4.5" stroke-linejoin="round" fill="none"/>
</svg>`.trim();
}

/**
 * Dynamically updates the browser tab's <link rel="icon"> at the top of the browser.
 */
export function updateFavicon(role) {
  if (typeof document === 'undefined') return;

  const svg = getFaviconSvg(role);
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.type = 'image/svg+xml';
  link.href = dataUri;
}

export default updateFavicon;
