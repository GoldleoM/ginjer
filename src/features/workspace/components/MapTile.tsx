import React from 'react';
import { Image } from 'expo-image';

export interface MapTileProps { uri: string; x: number; y: number; size: number; onError: () => void; }

// Native image requests must identify the app and persist tiles between visits.
export function MapTile({ uri, x, y, size, onError }: MapTileProps) {
  return <Image accessible={false} source={{ uri, headers: { 'User-Agent': 'GinjerMobile/0.1 (+https://github.com/GoldleoM/ginjer)' } }}
    cachePolicy="memory-disk" contentFit="fill" transition={0} onError={onError}
    style={{ position: 'absolute', left: x, top: y, width: size, height: size }} />;
}
