import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let ffmpegPath: string | null = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  ffmpegPath = null;
}

/**
 * Checks if a buffer begins with Ogg container magic bytes 'OggS'
 */
export function isOggContainer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x4f && // O
    buffer[1] === 0x67 && // g
    buffer[2] === 0x67 && // g
    buffer[3] === 0x53    // S
  );
}

/**
 * Converts any audio file (WebM, WAV, MP3, etc.) to WhatsApp-compliant Ogg Opus format.
 * WhatsApp requires:
 * - Ogg container starting with 'OggS'
 * - Opus audio codec
 * - 48000 Hz sample rate
 * - Mono (1 channel) for voice notes
 */
export async function convertToOggOpus(inputFilePath: string): Promise<string> {
  if (!fs.existsSync(inputFilePath)) {
    return inputFilePath;
  }

  // 1. Sanitize file: Check if WebM (EBML) or Ogg magic bytes appear at an offset > 0
  try {
    let buf = await fs.promises.readFile(inputFilePath);
    if (!isOggContainer(buf)) {
      const webmIndex = buf.indexOf(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      if (webmIndex > 0) {
        console.log(`[AudioConverter] Stripped ${webmIndex} corrupt leading bytes before WebM EBML header in ${path.basename(inputFilePath)}`);
        buf = buf.slice(webmIndex);
        await fs.promises.writeFile(inputFilePath, buf);
      } else {
        const oggIndex = buf.indexOf(Buffer.from([0x4f, 0x67, 0x67, 0x53]));
        if (oggIndex > 0) {
          console.log(`[AudioConverter] Stripped ${oggIndex} corrupt leading bytes before OggS header in ${path.basename(inputFilePath)}`);
          buf = buf.slice(oggIndex);
          await fs.promises.writeFile(inputFilePath, buf);
        }
      }
    }
  } catch (cleanErr) {
    console.warn('[AudioConverter] Error during header sanitization:', cleanErr);
  }

  // If already an authentic Ogg container, no conversion needed
  try {
    const head = Buffer.alloc(4);
    const fd = await fs.promises.open(inputFilePath, 'r');
    await fd.read(head, 0, 4, 0);
    await fd.close();
    if (isOggContainer(head)) {
      return inputFilePath;
    }
  } catch (_) {}

  if (!ffmpegPath) {
    console.warn('[AudioConverter] ffmpeg-static not available, returning original file');
    return inputFilePath;
  }

  const dir = path.dirname(inputFilePath);
  const ext = path.extname(inputFilePath);
  const base = path.basename(inputFilePath, ext);
  const outputFilePath = path.join(dir, `${base}_whatsapp.ogg`);

  try {
    await execFileAsync(ffmpegPath, [
      '-y',
      '-i', inputFilePath,
      '-c:a', 'libopus',
      '-b:a', '32k',
      '-ac', '1',
      '-ar', '48000',
      '-application', 'voip',
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      outputFilePath,
    ]);

    if (fs.existsSync(outputFilePath)) {
      const finalDestination = path.join(dir, `${base}.ogg`);
      if (finalDestination !== inputFilePath) {
        await fs.promises.unlink(inputFilePath).catch(() => {});
      }
      await fs.promises.rename(outputFilePath, finalDestination);
      return finalDestination;
    }
  } catch (err: any) {
    console.error(`[AudioConverter] Failed to convert ${inputFilePath} to Ogg Opus:`, err?.message || String(err));
  }

  return inputFilePath;
}
