import exifr from "exifr";
import sharp from "sharp";
import crypto from "crypto";

export interface ForensicResult {
  sha256Hash: string;
  perceptualHash: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  exif?: Record<string, unknown>;
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
  cameraModel?: string;
  software?: string;
  captureDate?: Date;
  isBlurry?: boolean;
  blurScore?: number;
}

/**
 * Sniffs the true MIME type from the file's binary magic bytes.
 * Strictly accepts only JPEG, PNG, or WebP. Returns null if invalid or tampered.
 */
export function sniffImageMimeType(
  buffer: Buffer
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF (bytes 0..3) + WEBP (bytes 8..11)
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  return null;
}

export async function computeSha256(buffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Computes a 64-bit difference hash (dHash) represented as a 16-character hex string.
 * Resizes the image to 9x8 grayscale, comparing adjacent pixels per row.
 */
export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let binary = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      binary += left > right ? "1" : "0";
    }
  }

  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = parseInt(binary.substring(i, i + 4), 2);
    hex += nibble.toString(16);
  }
  return hex;
}

/**
 * Calculates the Hamming distance (number of differing bits) between two 16-char hex hashes.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 64;
  }
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    let xor = n1 ^ n2;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

/**
 * Measures image sharpness via Laplacian edge variance.
 * Low variance (< 100) indicates an out-of-focus, blurry photo.
 */
export async function isImageBlurry(
  buffer: Buffer,
  threshold = 100
): Promise<{ isBlurry: boolean; blurScore: number }> {
  try {
    const laplacianKernel = {
      width: 3,
      height: 3,
      kernel: [
        0, 1, 0,
        1, -4, 1,
        0, 1, 0,
      ],
    };

    // Downscale for consistent variance calculation and performance
    const edgeData = await sharp(buffer)
      .greyscale()
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .convolve(laplacianKernel)
      .raw()
      .toBuffer();

    let sum = 0;
    const len = edgeData.length;
    for (let i = 0; i < len; i++) {
      sum += edgeData[i];
    }
    const mean = sum / len;

    let varianceSum = 0;
    for (let i = 0; i < len; i++) {
      const diff = edgeData[i] - mean;
      varianceSum += diff * diff;
    }
    const variance = varianceSum / len;

    return {
      isBlurry: variance < threshold,
      blurScore: Math.round(variance * 100) / 100,
    };
  } catch {
    return { isBlurry: false, blurScore: 999 };
  }
}

/**
 * Resizes very large images with sharp before sending to AI verifiers
 * to conserve tokens and prevent network timeouts.
 */
export async function optimizeImageForAi(
  buffer: Buffer,
  maxDimension = 1568
): Promise<{ buffer: Buffer; wasResized: boolean }> {
  try {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width > maxDimension || height > maxDimension) {
      const resizedBuffer = await sharp(buffer)
        .resize(maxDimension, maxDimension, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return { buffer: resizedBuffer, wasResized: true };
    }

    return { buffer, wasResized: false };
  } catch {
    return { buffer, wasResized: false };
  }
}

export async function inspectMedia(buffer: Buffer): Promise<ForensicResult> {
  const sha256Hash = await computeSha256(buffer);
  const perceptualHash = await computePerceptualHash(buffer);
  const metadata = await sharp(buffer).metadata();
  const exif = await exifr.parse(buffer, {
    tiff: true,
    exif: true,
    gps: true,
    iptc: true,
    xmp: true,
  });

  const latitude = exif?.latitude;
  const longitude = exif?.longitude;
  const hasGps = typeof latitude === "number" && typeof longitude === "number";

  const blurInfo = await isImageBlurry(buffer);

  return {
    sha256Hash,
    perceptualHash,
    mimeType: metadata.format ? `image/${metadata.format}` : "application/octet-stream",
    sizeBytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    exif: exif || undefined,
    hasGps,
    latitude,
    longitude,
    cameraModel: exif?.Model || exif?.Make,
    software: exif?.Software,
    captureDate: exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal) : undefined,
    isBlurry: blurInfo.isBlurry,
    blurScore: blurInfo.blurScore,
  };
}
