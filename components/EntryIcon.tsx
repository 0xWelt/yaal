'use client';

import { useEffect, useState } from 'react';
import { iconCandidates } from '@/lib/entryIcon';

interface EntryIconProps {
  name: string;
  url: string;
  icon?: string;
}

function letterFor(name: string) {
  const match = name.match(/[\p{L}\p{N}]/u);
  return (match ? match[0] : '?').toUpperCase();
}

export default function EntryIcon({ name, url, icon }: EntryIconProps) {
  const candidates = iconCandidates(url, icon);
  const [index, setIndex] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const src = candidates[index];
  const loaded = Boolean(src) && loadedSrc === src;

  useEffect(() => {
    setIndex(0);
    setLoadedSrc(null);
  }, [url, icon]);

  return (
    <span
      className="relative inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600"
      aria-hidden
    >
      {src && (
        <img
          src={src}
          alt=""
          width={24}
          height={24}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSrc(src)}
          onError={() => {
            setLoadedSrc(null);
            setIndex((current) => current + 1);
          }}
          className={`size-full object-contain ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {!loaded && (
        <span className="absolute inset-0 flex items-center justify-center">
          {letterFor(name)}
        </span>
      )}
    </span>
  );
}
