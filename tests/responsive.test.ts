import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridGeometry, MAX_CONTENT_WIDTH } from '../src/layout/geometry.ts';

test('device cards change columns at widths that preserve a readable card', () => {
  assert.equal(gridGeometry(296, 300).columns, 1); // 320px phone, with list gutters.
  assert.equal(gridGeometry(676, 300).columns, 2); // Small tablet or landscape phone.
  assert.equal(gridGeometry(1000, 300).columns, 3); // Large tablet.
  assert.equal(gridGeometry(1256, 300).columns, 3);
});

test('outputs collapse on narrow phones and expand to four columns on tablets', () => {
  assert.equal(gridGeometry(288, 156, 12, 4).columns, 1);
  assert.equal(gridGeometry(358, 156, 12, 4).columns, 2);
  assert.equal(gridGeometry(736, 156, 12, 4).columns, 4);
});

test('phone, tablet, rotation, and split-screen widths never overflow the grid', () => {
  const widths = [0, 240, 280, 320, 360, 375, 390, 393, 412, 430, 540, 600, 640, 700, 744, 768, 800, 810, 820, 834, 912, 1024, 1080, 1180, 1194, 1280, 1366, 1600];
  for (const width of widths) {
    for (const fontScale of [1, 1.3, 2]) {
      for (const [minimumWidth, maximumColumns] of [[300, 3], [156, 4], [280, 2]]) {
        const available = Math.max(0, Math.min(width, MAX_CONTENT_WIDTH) - 24);
        const { columns, itemWidth } = gridGeometry(available, minimumWidth, 12, maximumColumns, fontScale);
        assert.ok(Number.isFinite(itemWidth) && itemWidth >= 0);
        assert.ok(columns >= 1 && columns <= maximumColumns);
        assert.ok(itemWidth * columns + 12 * (columns - 1) <= available + 0.001);
        if (columns > 1) assert.ok(itemWidth >= minimumWidth * fontScale);
      }
    }
  }
});

test('larger text reduces column count to keep content readable', () => {
  assert.equal(gridGeometry(740, 300, 12, 3, 1).columns, 2);
  assert.equal(gridGeometry(740, 300, 12, 3, 2).columns, 1);
  assert.equal(gridGeometry(740, 156, 12, 4, 2).columns, 2);
});
