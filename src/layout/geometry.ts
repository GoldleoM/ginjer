// Shared layout rules use the available container width, including split-screen windows.
export const MAX_CONTENT_WIDTH = 1280;

export function gridGeometry(width: number, minimumWidth: number, gap = 12, maximumColumns = 3, fontScale = 1) {
  const available = Math.max(0, width);
  const readableMinimum = minimumWidth * Math.max(1, fontScale);
  const columns = Math.max(1, Math.min(maximumColumns, Math.floor((available + gap) / (readableMinimum + gap))));
  return { columns, itemWidth: Math.max(0, (available - gap * (columns - 1)) / columns) };
}
