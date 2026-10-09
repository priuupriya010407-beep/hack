export type VisualMetrics = {
  averageLuminance: number;
  contrast: number;
  shadowClippingPercent: number;
  highlightClippingPercent: number;
  transparentPixelPercent: number;
  tonalBins: number;
};

export function analyzeRgbaPixels(pixels: Uint8ClampedArray): VisualMetrics {
  if (pixels.length === 0 || pixels.length % 4 !== 0) {
    throw new Error('Pixel data must contain complete RGBA pixels.');
  }

  const pixelCount = pixels.length / 4;
  const luminanceBins = new Uint32Array(16);
  let luminanceTotal = 0;
  let squaredLuminanceTotal = 0;
  let shadowPixels = 0;
  let highlightPixels = 0;
  let transparentPixels = 0;

  for (let offset = 0; offset < pixels.length; offset += 4) {
    const luminance = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
    luminanceTotal += luminance;
    squaredLuminanceTotal += luminance * luminance;
    luminanceBins[Math.min(15, Math.floor(luminance / 16))]++;
    if (luminance <= 10) shadowPixels++;
    if (luminance >= 245) highlightPixels++;
    if (pixels[offset + 3] < 255) transparentPixels++;
  }

  const averageLuminance = luminanceTotal / pixelCount;
  const variance = Math.max(0, squaredLuminanceTotal / pixelCount - averageLuminance ** 2);

  return {
    averageLuminance,
    contrast: Math.sqrt(variance),
    shadowClippingPercent: (shadowPixels / pixelCount) * 100,
    highlightClippingPercent: (highlightPixels / pixelCount) * 100,
    transparentPixelPercent: (transparentPixels / pixelCount) * 100,
    tonalBins: luminanceBins.filter((count) => count > 0).length,
  };
}
