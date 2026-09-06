import fs from "fs";
import path from "path";
import sharp from "sharp";

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.resolve(process.cwd(), "public/icons");

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Create a high-res SVG icon with nice brand styling
function createIconSvg(size) {
  const padding = Math.round(size * 0.15);
  const innerSize = size - padding * 2;
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.42);
  const subFontSize = Math.round(size * 0.12);

  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#227DE8" />
          <stop offset="100%" stop-color="#1456A8" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#brandGrad)" />
      <!-- Stylized "C" monogram -->
      <text
        x="50%"
        y="${size * 0.58}"
        font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        font-weight="800"
        font-size="${fontSize}"
        fill="#FFFFFF"
        text-anchor="middle"
        dominant-baseline="central"
      >C</text>
      <text
        x="50%"
        y="${size * 0.82}"
        font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        font-weight="600"
        font-size="${subFontSize}"
        letter-spacing="${Math.round(size * 0.02)}px"
        fill="rgba(255, 255, 255, 0.9)"
        text-anchor="middle"
      >CRM</text>
    </svg>
  `);
}

async function run() {
  for (const size of SIZES) {
    const svgBuffer = createIconSvg(size);
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated icon: ${outputPath}`);
  }
}

run().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
