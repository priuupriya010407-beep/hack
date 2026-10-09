import { describe, expect, it } from 'vitest';
import { analyzeRgbaPixels } from './mediaAnalysis';

describe('local visual diagnostics', () => {
  it('summarizes brightness, contrast, clipping, transparency, and tonal range', () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 0,
      128, 128, 128, 255,
    ]);

    expect(analyzeRgbaPixels(pixels)).toEqual({
      averageLuminance: expect.closeTo(127.67, 1),
      contrast: expect.closeTo(104.1, 1),
      shadowClippingPercent: expect.closeTo(33.33, 1),
      highlightClippingPercent: expect.closeTo(33.33, 1),
      transparentPixelPercent: expect.closeTo(33.33, 1),
      tonalBins: 3,
    });
  });

  it('rejects empty or incomplete pixel data', () => {
    expect(() => analyzeRgbaPixels(new Uint8ClampedArray())).toThrow(/complete RGBA pixels/i);
    expect(() => analyzeRgbaPixels(new Uint8ClampedArray([0, 0, 0]))).toThrow(/complete RGBA pixels/i);
  });
});
