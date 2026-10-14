/**
 * Shrinks a photo in the browser before upload: at most `maxSide` px, JPEG.
 * Re-drawing on a canvas also drops EXIF metadata such as GPS position.
 * Formats the browser cannot decode (e.g. HEIC outside Safari) throw.
 */
export async function compressImage(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('not an image');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas unavailable');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('encode failed');
    const base = file.name.replace(/\.[^.]+$/, '') || 'anh';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
