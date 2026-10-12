'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

interface AvatarImageProps {
  src: string;
  alt: string;
  size: number;
  className: string;
  /** Shown instead when the photo can't load (deleted account, blocked host). */
  fallback: ReactNode;
}

export function AvatarImage({ src, alt, size, className, fallback }: AvatarImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // GitHub and Google serve sized avatars directly; skipping the optimizer
  // avoids a server hop and redirect handling for github.com/<user>.png URLs.
  return (
    <Image src={src} alt={alt} width={size} height={size} className={className} unoptimized onError={() => setFailed(true)} />
  );
}
