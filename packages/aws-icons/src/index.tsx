/// <reference types="vite/client" />
import { ICON_MANIFEST, IconCategory, IconKey } from './manifest';

export { ICON_MANIFEST, ICON_KEYS } from './manifest';
export type { IconKey, IconEntry, IconCategory } from './manifest';

/** Synced SVGs, bundled by Vite as local asset URLs (never fetched from a CDN). */
const SVG_URLS = import.meta.glob('../svg/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function iconUrl(key: IconKey): string | undefined {
  return SVG_URLS[`../svg/${key}.svg`];
}

export function hasIcon(key: IconKey): boolean {
  return iconUrl(key) !== undefined;
}

/** Resolve a game node type (plus subnet variant) to an icon key. */
export function iconKeyFor(type: string, opts: { privateSubnet?: boolean } = {}): IconKey | undefined {
  if (type === 'subnet') return opts.privateSubnet ? 'subnet_private' : 'subnet_public';
  return type in ICON_MANIFEST ? (type as IconKey) : undefined;
}

// AWS category colors, used only for the fallback tile before icons are synced.
const CATEGORY_COLOR: Record<IconCategory, string> = {
  compute: '#ED7100',
  storage: '#7AA116',
  database: '#C925D1',
  security: '#DD344C',
  networking: '#8C4FFF',
  management: '#E7157B',
  general: '#232F3E',
};

function initials(name: string): string {
  const words = name.replace(/^(Amazon|AWS)\s+/, '').split(/\s+/);
  return words.length === 1 ? words[0].slice(0, 3).toUpperCase() : words.map(w => w[0]).join('').slice(0, 3).toUpperCase();
}

export interface AwsIconProps {
  type: string;
  privateSubnet?: boolean;
  size?: number;
  className?: string;
  /** Overrides the accessible name (defaults to the AWS service name). */
  label?: string;
}

export function AwsIcon({ type, privateSubnet, size = 24, className, label }: AwsIconProps) {
  const key = iconKeyFor(type, { privateSubnet });
  const entry = key ? ICON_MANIFEST[key] : undefined;
  const name = label ?? entry?.name ?? type;
  const url = key ? iconUrl(key) : undefined;

  if (url) {
    return <img src={url} width={size} height={size} alt={name} title={name} className={className} draggable={false} />;
  }

  // Fallback before icons are synced: an SVG tile in the service's AWS category color.
  return (
    <svg role="img" aria-label={name} width={size} height={size} viewBox="0 0 48 48" className={className}>
      <title>{name}</title>
      <rect width="48" height="48" rx="6" fill={entry ? CATEGORY_COLOR[entry.category] : CATEGORY_COLOR.general} />
      <text x="24" y="29" textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" fill="#fff">
        {initials(name)}
      </text>
    </svg>
  );
}
