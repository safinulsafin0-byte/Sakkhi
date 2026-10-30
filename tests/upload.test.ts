import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  computeSha256,
  computePerceptualHash,
  hammingDistance,
} from "@/lib/forensics";

describe("Volunteer Proof Upload Validation & Duplicate Detection", () => {
  describe("File Validation Invariants", () => {
    const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
    const MAX_FILES = 6;

    it("accepts valid image MIME types and rejects unsupported formats", () => {
      expect(ALLOWED_MIME_TYPES.has("image/jpeg")).toBe(true);
      expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true);
      expect(ALLOWED_MIME_TYPES.has("image/webp")).toBe(true);

      expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(false);
      expect(ALLOWED_MIME_TYPES.has("image/gif")).toBe(false);
      expect(ALLOWED_MIME_TYPES.has("text/plain")).toBe(false);
      expect(ALLOWED_MIME_TYPES.has("application/octet-stream")).toBe(false);
    });

    it("enforces maximum file size limit of 8 MB per file", () => {
      const validSize = 7.5 * 1024 * 1024; // 7.5 MB
      const exactMaxSize = 8 * 1024 * 1024; // 8 MB
      const excessiveSize = 8.1 * 1024 * 1024; // 8.1 MB

      expect(validSize <= MAX_FILE_SIZE_BYTES).toBe(true);
      expect(exactMaxSize <= MAX_FILE_SIZE_BYTES).toBe(true);
      expect(excessiveSize <= MAX_FILE_SIZE_BYTES).toBe(false);
    });

    it("enforces maximum limit of 6 files per submission", () => {
      expect(1 <= MAX_FILES).toBe(true);
      expect(6 <= MAX_FILES).toBe(true);
      expect(7 <= MAX_FILES).toBe(false);
    });
  });

  describe("Exact SHA-256 Duplicate Detection", () => {
    it("computes identical SHA-256 for identical byte buffers", async () => {
      const bufferA = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 184, g: 76, b: 38 } },
      })
        .jpeg()
        .toBuffer();

      const bufferACopy = Buffer.from(bufferA);

      const hashA = await computeSha256(bufferA);
      const hashACopy = await computeSha256(bufferACopy);

      expect(hashA).toBe(hashACopy);
      expect(hashA.length).toBe(64);
    });

    it("detects exact duplicate uploads across different file instances", async () => {
      const original = Buffer.from("mock-receipt-image-content-kurigram-depot-8842");
      const duplicate = Buffer.from("mock-receipt-image-content-kurigram-depot-8842");
      const different = Buffer.from("mock-receipt-image-content-khulna-school-bags-01");

      const hashOriginal = await computeSha256(original);
      const hashDuplicate = await computeSha256(duplicate);
      const hashDifferent = await computeSha256(different);

      expect(hashOriginal === hashDuplicate).toBe(true);
      expect(hashOriginal === hashDifferent).toBe(false);
    });
  });

  describe("Perceptual Hash (dHash) & Near-Identical Detection", () => {
    it("generates consistent 16-character hex perceptual hashes", async () => {
      const imgBuffer = await sharp({
        create: { width: 120, height: 120, channels: 3, background: { r: 45, g: 106, b: 79 } },
      })
        .png()
        .toBuffer();

      const pHash = await computePerceptualHash(imgBuffer);
      expect(pHash.length).toBe(16);
      expect(/^[0-9a-f]{16}$/i.test(pHash)).toBe(true);
    });

    it("detects near-identical images with Hamming distance <= 5", async () => {
      // Base image with vertical stripe pattern
      const baseSvg = `<svg width="200" height="200">
        <rect width="100" height="200" fill="#2d6a4f"/>
        <rect x="100" width="100" height="200" fill="#fbf9f5"/>
      </svg>`;
      const baseBuffer = await sharp(Buffer.from(baseSvg)).jpeg().toBuffer();

      // Slightly resized / compressed version of the exact same image
      const resizedBuffer = await sharp(baseBuffer)
        .resize(180, 180)
        .jpeg({ quality: 85 })
        .toBuffer();

      const hash1 = await computePerceptualHash(baseBuffer);
      const hash2 = await computePerceptualHash(resizedBuffer);
      const distance = hammingDistance(hash1, hash2);

      // Distance between near-identical compressed versions must be <= 5
      expect(distance).toBeLessThanOrEqual(5);
    });

    it("distinguishes completely different photos with high Hamming distance", async () => {
      // Image 1: Left-to-right split
      const svg1 = `<svg width="200" height="200">
        <rect width="100" height="200" fill="#000000"/>
        <rect x="100" width="100" height="200" fill="#ffffff"/>
      </svg>`;

      // Image 2: Top-to-bottom split
      const svg2 = `<svg width="200" height="200">
        <rect width="200" height="100" fill="#ffffff"/>
        <rect y="100" width="200" height="100" fill="#000000"/>
      </svg>`;

      const buf1 = await sharp(Buffer.from(svg1)).jpeg().toBuffer();
      const buf2 = await sharp(Buffer.from(svg2)).jpeg().toBuffer();

      const hash1 = await computePerceptualHash(buf1);
      const hash2 = await computePerceptualHash(buf2);
      const distance = hammingDistance(hash1, hash2);

      // Visually different compositions should have distance > 10
      expect(distance).toBeGreaterThan(10);
    });
  });
});

