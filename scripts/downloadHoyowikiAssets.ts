import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOYO_BASE_API = 'https://sg-wiki-api-static.hoyolab.com/hoyowiki/genshin/wapi';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'x-rpc-language': 'en-us',
  'x-rpc-wiki_app': 'genshin',
  'Referer': 'https://wiki.hoyolab.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

const PFP_DIR = path.join(__dirname, '../public/assets/images/profilePics');
const NAMECARD_DIR = path.join(__dirname, '../public/assets/images/namecards');
const ASSETS_JSON = path.join(__dirname, '../src/config/profileAssets.json');

// Ensure destination directories exist
fs.mkdirSync(PFP_DIR, { recursive: true });
fs.mkdirSync(NAMECARD_DIR, { recursive: true });
fs.mkdirSync(path.dirname(ASSETS_JSON), { recursive: true });

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err: any) {
    console.error(`Failed to download ${url}:`, err.message);
    return false;
  }
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err: any) {
        console.error(`Error processing item index ${idx}:`, err.message || err);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * 1. Fetch & Save Character PFPs
 */
async function fetchAndSaveAvatars() {
  console.log('--- Fetching Character PFPs from HoYoWiki (Menu 2) ---');
  const avatarsList: Array<{ name: string; path: string; file: string }> = [];

  // Add default Diluc skin & Xiao if present
  if (fs.existsSync(path.join(__dirname, '../public/assets/images/pfp/diluc_skin.webp'))) {
    fs.copyFileSync(
      path.join(__dirname, '../public/assets/images/pfp/diluc_skin.webp'),
      path.join(PFP_DIR, 'diluc_skin.webp')
    );
    avatarsList.push({
      name: 'Diluc (Red Dead of Night)',
      file: 'diluc_skin.webp',
      path: '/assets/images/profilePics/diluc_skin.webp'
    });
  }

  let pageNum = 1;
  const pageSize = 40;
  let total = 0;

  do {
    const res = await fetch(`${HOYO_BASE_API}/get_entry_page_list`, {
      method: 'POST',
      body: JSON.stringify({
        filters: [],
        menu_id: 2,
        page_num: pageNum,
        page_size: pageSize,
        use_sort: true
      }),
      headers: DEFAULT_HEADERS
    });

    if (!res.ok) break;
    const json: any = await res.json();
    total = json?.data?.total || 0;
    const list = json?.data?.list || [];
    if (list.length === 0) break;

    for (const item of list) {
      const name = item.name?.trim() || 'Character';
      const iconUrl = item.icon_url?.trim();
      if (!iconUrl) continue;

      // Skip animated alternating Traveler icons from HoYoWiki
      if (/traveler/i.test(name)) continue;

      const ext = path.extname(iconUrl.split('?')[0]) || '.png';
      const filename = `${sanitizeFilename(name)}${ext}`;
      const destPath = path.join(PFP_DIR, filename);

      let success = true;
      if (!fs.existsSync(destPath)) {
        success = await downloadImage(iconUrl, destPath);
      }

      if (success && fs.existsSync(destPath)) {
        avatarsList.push({
          name: name,
          file: filename,
          path: `/assets/images/profilePics/${filename}`
        });
      }
    }

    console.log(`Indexed avatars page ${pageNum}: ${avatarsList.length}/${total}`);
    pageNum++;
  } while (avatarsList.length < total && pageNum <= 4);

  // Add dedicated static Aether & Lumine icons
  const aetherUrl = 'https://static.wikia.nocookie.net/gensin-impact/images/d/d4/Aether_Avatar.png/revision/latest?cb=20260208041921';
  const lumineUrl = 'https://static.wikia.nocookie.net/gensin-impact/images/8/80/Lumine_Avatar.png/revision/latest?cb=20260208041944';

  const aetherDest = path.join(PFP_DIR, 'traveler_aether.png');
  const lumineDest = path.join(PFP_DIR, 'traveler_lumine.png');

  if (!fs.existsSync(aetherDest)) await downloadImage(aetherUrl, aetherDest);
  if (!fs.existsSync(lumineDest)) await downloadImage(lumineUrl, lumineDest);

  if (fs.existsSync(aetherDest)) {
    avatarsList.unshift({
      name: 'Traveler (Aether)',
      file: 'traveler_aether.png',
      path: '/assets/images/profilePics/traveler_aether.png'
    });
  }

  if (fs.existsSync(lumineDest)) {
    avatarsList.unshift({
      name: 'Traveler (Lumine)',
      file: 'traveler_lumine.png',
      path: '/assets/images/profilePics/traveler_lumine.png'
    });
  }

  return avatarsList;
}

/**
 * 2. Fetch & Save ACTUAL FULL NAMECARD BANNERS from HoYoWiki (Menu 35 -> Entry Page Gallery)
 */
async function fetchAndSaveNamecards() {
  console.log('--- Fetching Actual Full Namecard Banners from HoYoWiki (Menu 35 -> Entry Gallery) ---');
  const allEntries: Array<{ entry_page_id: string; name: string; icon_url: string }> = [];

  let pageNum = 1;
  const pageSize = 40;
  let total = 0;

  do {
    const res = await fetch(`${HOYO_BASE_API}/get_entry_page_list`, {
      method: 'POST',
      body: JSON.stringify({
        filters: [],
        menu_id: 35,
        page_num: pageNum,
        page_size: pageSize,
        use_sort: true
      }),
      headers: DEFAULT_HEADERS
    });

    if (!res.ok) break;
    const json: any = await res.json();
    total = json?.data?.total || 0;
    const list = json?.data?.list || [];
    if (list.length === 0) break;

    for (const item of list) {
      allEntries.push({
        entry_page_id: String(item.entry_page_id),
        name: item.name?.trim() || 'Namecard',
        icon_url: item.icon_url?.trim() || ''
      });
    }

    pageNum++;
  } while (allEntries.length < total && pageNum <= 9);

  console.log(`Found ${allEntries.length} namecard entries. Downloading actual full gallery banners...`);

  const namecardsList: Array<{ id: string; name: string; path: string; file: string }> = [];

  // Add default Diluc Flames namecard if present
  if (fs.existsSync(path.join(NAMECARD_DIR, 'diluc.webp'))) {
    namecardsList.push({
      id: '6075',
      name: 'Diluc: Flames (Dawn Winery)',
      file: 'diluc.webp',
      path: '/assets/images/namecards/diluc.webp'
    });
  }

  // Fetch full entry pages with 10 concurrency
  await runWithConcurrency(allEntries, 10, async (entry, idx) => {
    try {
      const entryRes = await fetch(`${HOYO_BASE_API}/entry_page?entry_page_id=${entry.entry_page_id}`, {
        headers: DEFAULT_HEADERS
      });
      if (!entryRes.ok) return;
      const entryData = await entryRes.json();
      const page = entryData?.data?.page;
      
      let actualBannerUrl = '';

      // Extract full namecard banner from Gallery module
      for (const mod of page?.modules || []) {
        if ((mod.name || '').toLowerCase() === 'gallery') {
          for (const comp of mod.components || []) {
            if (comp.data) {
              try {
                const parsed = JSON.parse(comp.data);
                if (parsed.list && parsed.list.length > 0) {
                  actualBannerUrl = parsed.list[0].img || parsed.list[0].url || '';
                } else if (parsed.pic) {
                  actualBannerUrl = parsed.pic;
                }
              } catch (e) {}
            }
          }
        }
      }

      // Fallback to thumbnail only if gallery was not found
      if (!actualBannerUrl) {
        actualBannerUrl = entry.icon_url;
      }

      if (!actualBannerUrl) return;

      const ext = path.extname(actualBannerUrl.split('?')[0]) || '.png';
      const filename = `banner_${entry.entry_page_id}_${sanitizeFilename(entry.name)}${ext}`;
      const destPath = path.join(NAMECARD_DIR, filename);

      let success = true;
      if (!fs.existsSync(destPath)) {
        success = await downloadImage(actualBannerUrl, destPath);
      }

      if (success && fs.existsSync(destPath)) {
        namecardsList.push({
          id: entry.entry_page_id,
          name: entry.name,
          file: filename,
          path: `/assets/images/namecards/${filename}`
        });
      }

      if ((idx + 1) % 25 === 0 || idx + 1 === allEntries.length) {
        console.log(`Processed banners: ${idx + 1}/${allEntries.length}`);
      }
    } catch (err: any) {
      console.error(`Error processing namecard ${entry.entry_page_id} (${entry.name}):`, err.message);
    }
  });

  return namecardsList;
}

async function main() {
  const avatars = await fetchAndSaveAvatars();
  const namecards = await fetchAndSaveNamecards();

  const manifest = {
    generatedAt: new Date().toISOString(),
    avatarsCount: avatars.length,
    namecardsCount: namecards.length,
    avatars,
    namecards
  };

  fs.writeFileSync(ASSETS_JSON, JSON.stringify(manifest, null, 2));
  console.log(`\nSuccessfully downloaded ${avatars.length} avatars and ${namecards.length} actual full-width namecard banners to local assets!`);
  console.log(`Manifest written to: ${ASSETS_JSON}`);
}

main().catch(console.error);
