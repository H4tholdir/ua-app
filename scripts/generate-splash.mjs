import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

mkdirSync(resolve(root, 'public/splash'), { recursive: true })

// Background color: warm panna #DDD8D3
const BG = { r: 221, g: 216, b: 211, alpha: 1 }

// Key iOS splash screen sizes (width × height, device pixel ratio 1)
const SIZES = [
  { w: 640,  h: 1136, name: 'iphone5'      },  // iPhone SE 1st gen
  { w: 750,  h: 1334, name: 'iphone8'      },  // iPhone 6/7/8
  { w: 1125, h: 2436, name: 'iphoneX'      },  // iPhone X/11/12/13
  { w: 1242, h: 2208, name: 'iphonePlus'   },  // iPhone 8 Plus
  { w: 1170, h: 2532, name: 'iphone12'     },  // iPhone 12/13/14
  { w: 1179, h: 2556, name: 'iphone14pro'  },  // iPhone 14 Pro
  { w: 1284, h: 2778, name: 'iphone14plus' },  // iPhone 14 Plus/Pro Max
]

const ICON_SIZE = 120 // Logo size in splash

for (const { w, h, name } of SIZES) {
  // Create solid background
  const bg = await sharp({
    create: { width: w, height: h, channels: 4, background: BG }
  }).png().toBuffer()

  // Resize icon to 120px
  const icon = await sharp(resolve(root, 'public/icons/icon-512.png'))
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // Compose: background + centered icon
  const outPath = resolve(root, `public/splash/apple-splash-${w}-${h}.png`)
  await sharp(bg)
    .composite([{
      input: icon,
      top: Math.floor((h - ICON_SIZE) / 2) - 40,
      left: Math.floor((w - ICON_SIZE) / 2),
    }])
    .png()
    .toFile(outPath)

  console.log(`✓ ${name}: ${w}×${h} → ${outPath.split('/').pop()}`)
}

console.log('\n✅ Splash screens generated in public/splash/')
