export function cropRect(width, height, ratio, zoom, x, y) {
  const w = Math.min(width, height * ratio) / zoom
  const h = w / ratio
  return { x: Math.max(0, Math.min(1, x)) * (width - w), y: Math.max(0, Math.min(1, y)) * (height - h), width: w, height: h }
}
