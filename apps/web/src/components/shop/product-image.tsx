import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import {
  bagGuji,
  bagSidamo,
  bagYirgacheffe,
  productLineup,
} from '@/lib/imageSrc';

/**
 * Resolves a product's artwork.
 *
 * `Product.imageUrl` wins when set, so anything added through the admin panel
 * carries its own image. Products without one fall back to the packshot whose
 * name they match, and finally to the lineup shot — a shop card should never
 * render an empty frame.
 */
const NAME_FALLBACKS: Array<{ match: string; src: StaticImageData }> = [
  { match: 'sidamo', src: bagSidamo },
  { match: 'yirgacheffe', src: bagYirgacheffe },
  { match: 'guji', src: bagGuji },
];

export function resolveProductImage(
  name: string | null | undefined,
  imageUrl: string | null | undefined,
): string | StaticImageData {
  const trimmed = imageUrl?.trim();
  if (trimmed) return trimmed;

  const needle = (name ?? '').toLowerCase();
  const match = NAME_FALLBACKS.find((entry) => needle.includes(entry.match));
  return match?.src ?? productLineup;
}

type Props = {
  name: string;
  imageUrl?: string | null;
  /** Passed straight to next/image; the parent must be `relative`. */
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * Always renders with `fill`, so remote URLs (which have no intrinsic
 * dimensions) and static imports lay out identically. Place it inside a
 * `relative` container that sets the frame.
 */
export default function ProductImage({
  name,
  imageUrl,
  sizes,
  className,
  priority,
}: Props) {
  return (
    <Image
      src={resolveProductImage(name, imageUrl)}
      alt={`${name} coffee`}
      fill
      sizes={sizes}
      quality={100}
      priority={priority}
      className={className}
    />
  );
}
