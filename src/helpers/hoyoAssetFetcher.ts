import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface IAvatarAsset {
  name: string;
  icon: string;
  category?: string;
}

export interface INamecardAsset {
  id: string;
  name: string;
  icon: string;
}

const MANIFEST_PATH = path.join(__dirname, '../config/profileAssets.json');
const PFP_DIR = path.join(__dirname, '../../public/assets/images/profilePics');
const NAMECARD_DIR = path.join(__dirname, '../../public/assets/images/namecards');

const DEFAULT_AVATARS: IAvatarAsset[] = [
  { name: 'Diluc (Red Dead of Night)', icon: '/assets/images/pfp/diluc_skin.webp', category: 'Pyro' },
  { name: 'Diluc (Default)', icon: '/assets/images/pfp/diluc.webp', category: 'Pyro' },
  { name: 'Xiao', icon: '/assets/images/pfp/xiao.webp', category: 'Anemo' }
];

const DEFAULT_NAMECARDS: INamecardAsset[] = [
  { id: '6075', name: 'Diluc: Flames (Official Entry 6075)', icon: '/assets/images/namecards/diluc.webp' },
  { id: 'xiao', name: 'Xiao: Mask', icon: '/assets/images/namecards/xiao.webp' }
];

/**
 * Returns all locally stored character avatar PFPs.
 */
export async function getAllHoyowikiAvatars(): Promise<IAvatarAsset[]> {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
      const data = JSON.parse(content);
      if (data.avatars && data.avatars.length > 0) {
        return data.avatars.map((a: any) => ({
          name: a.name,
          icon: a.path || `/assets/images/profilePics/${a.file}`
        }));
      }
    }

    // Fallback: Scan directory directly
    if (fs.existsSync(PFP_DIR)) {
      const files = fs.readdirSync(PFP_DIR);
      const avatars = files
        .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
        .map(f => {
          const cleanName = f
            .replace(/\.[^.]+$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          return {
            name: cleanName,
            icon: `/assets/images/profilePics/${f}`
          };
        });
      if (avatars.length > 0) return avatars;
    }
    return DEFAULT_AVATARS;
  } catch (err) {
    return DEFAULT_AVATARS;
  }
}

/**
 * Returns all locally stored official namecard banners.
 */
export async function getAllHoyowikiNamecards(): Promise<INamecardAsset[]> {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
      const data = JSON.parse(content);
      if (data.namecards && data.namecards.length > 0) {
        return data.namecards.map((n: any) => ({
          id: n.id,
          name: n.name,
          icon: n.path || `/assets/images/namecards/${n.file}`
        }));
      }
    }

    // Fallback: Scan directory directly
    if (fs.existsSync(NAMECARD_DIR)) {
      const files = fs.readdirSync(NAMECARD_DIR);
      const namecards = files
        .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
        .map((f, idx) => {
          const cleanName = f
            .replace(/^namecard_\d+_/, '')
            .replace(/\.[^.]+$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          return {
            id: String(idx + 1),
            name: cleanName,
            icon: `/assets/images/namecards/${f}`
          };
        });
      if (namecards.length > 0) return namecards;
    }
    return DEFAULT_NAMECARDS;
  } catch (err) {
    return DEFAULT_NAMECARDS;
  }
}
