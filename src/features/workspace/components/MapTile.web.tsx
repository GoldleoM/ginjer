import React from 'react';
import type { MapTileProps } from './MapTile';

// A direct image request lets the browser honor HTTP caching and send the real
// page origin. Do not fetch tiles as blobs, spoof Referer, or add cache busters.
export function MapTile({ uri, x, y, size, onError }: MapTileProps) {
  return <img src={uri} alt="" draggable={false} referrerPolicy="strict-origin-when-cross-origin" onError={onError}
    style={{ position: 'absolute', left: x, top: y, width: size, height: size, pointerEvents: 'none', userSelect: 'none' }} />;
}
