import cloudinary from 'cloudinary';
import Character from '../models/characterModel.js';
import Weapon from '../models/weaponModel.js';
import Artifact from '../models/artifactModel.js';
import { ITalent, IConstellation, ICharacterStory, IVoiceLine } from '../interfaces/characterInterface.js';
import { IWeaponStat } from '../interfaces/weaponInterface.js';
import { IArtifactPiece } from '../interfaces/artifactInterface.js';

const HOYO_BASE_API = 'https://sg-wiki-api-static.hoyolab.com/hoyowiki/genshin/wapi';

export interface ScrapeOptions {
  uploadImages?: boolean;
}

export interface ScrapeProgress {
  category: string;
  total: number;
  current: number;
  currentItem: string;
  success: number;
  failed: number;
}

export type ProgressCallback = (progress: ScrapeProgress) => void;

/**
 * Utility: Cleans HTML formatting into crisp, human-readable text.
 */
export function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Utility: Uploads an external image link to Cloudinary and returns secure URL.
 */
export async function uploadToCloudinary(url: string, folder: string, publicId?: string): Promise<string> {
  if (!url || !url.startsWith('http') || url.includes('res.cloudinary.com')) {
    return url;
  }
  try {
    const cleanPublicId = publicId
      ? publicId.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
      : `${folder}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const res = await cloudinary.v2.uploader.upload(url, {
      folder: `FlameForge/${folder}`,
      public_id: cleanPublicId,
      overwrite: true,
      resource_type: 'image'
    });
    return res.secure_url || res.url;
  } catch (err: any) {
    console.warn(`[Cloudinary] Upload failed for "${url}":`, err.message || err);
    return url;
  }
}

/**
 * Utility: Resilient HTTP fetch with timeout and retries.
 */
async function fetchHoyowiki(endpoint: string, options: RequestInit = {}, retries = 3): Promise<any> {
  const url = `${HOYO_BASE_API}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-rpc-language': 'en-us',
    'x-rpc-wiki_app': 'genshin',
    'Referer': 'https://wiki.hoyolab.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data: any = await res.json();
      if (data.retcode !== 0 && data.retcode !== '0') {
        throw new Error(`HoYoWiki API Error ${data.retcode}: ${data.message}`);
      }
      return data.data;
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 600));
    }
  }
}

/**
 * Utility: Run async tasks with controlled concurrency.
 */
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
 * 1. Fetch complete list of entries for a given menu_id.
 * Menu IDs: 2 = Characters, 4 = Weapons, 5 = Artifacts
 */
export async function getEntryList(menuId: number): Promise<Array<{ entry_page_id: string; name: string; icon_url: string }>> {
  const allEntries: Array<{ entry_page_id: string; name: string; icon_url: string }> = [];
  let pageNum = 1;
  const pageSize = 30;
  let total = 0;

  do {
    const data = await fetchHoyowiki('/get_entry_page_list', {
      method: 'POST',
      body: JSON.stringify({
        filters: [],
        menu_id: menuId,
        page_num: pageNum,
        page_size: pageSize,
        use_sort: true
      })
    });

    total = data?.total || 0;
    const list = data?.list || [];
    if (list.length === 0) break;

    for (const item of list) {
      allEntries.push({
        entry_page_id: String(item.entry_page_id),
        name: item.name?.trim(),
        icon_url: item.icon_url
      });
    }

    pageNum++;
  } while (allEntries.length < total);

  return allEntries;
}

/**
 * 2. Scrape Complete Character Entry
 */
export async function scrapeCharacter(entryId: string | number, options?: ScrapeOptions): Promise<any> {
  const data = await fetchHoyowiki(`/entry_page?entry_page_id=${entryId}`);
  const page = data?.page;
  if (!page) throw new Error(`No page data found for character entry ${entryId}`);

  // Safeguard: Ensure entry is strictly a Character (menu_id === 2)
  if (page.menu_id && Number(page.menu_id) !== 2) {
    const categoryName = page.menu_name || `Menu ${page.menu_id}`;
    throw new Error(`Category Mismatch!\n"${page.name || entryId}" is a ${categoryName}, not a Character.`);
  }

  const name = page.name?.trim();
  const desc = cleanHtml(page.desc || '');
  const icon = page.icon_url || page.header_img || '';
  const wikiUrl = `https://wiki.hoyolab.com/pc/genshin/entry/${entryId}`;

  // Parsed containers
  let rarity = 4;
  let vision = 'N/A';
  let weapon = 'Sword';
  let versionRelease = 1.0;
  let birthday = 'N/A';
  let constellation = 'N/A';
  let titles: string[] = [];
  let regions: string[] = [];
  let affiliations: string[] = [];
  let cv: { en?: string; jp?: string; cn?: string; kr?: string } = {};
  const images: { profile?: string; gacha?: string; card?: string; icon?: string; header?: string } = { icon, profile: icon };
  const talents: ITalent[] = [];
  const constellations: IConstellation[] = [];
  const stories: ICharacterStory[] = [];
  const voiceLines: IVoiceLine[] = [];
  const cdata: string[] = [];

  const modules = page.modules || [];

  for (const mod of modules) {
    const modName = (mod.name || '').toLowerCase();
    const components = mod.components || [];

    for (const comp of components) {
      let compData: any = null;
      if (comp.data) {
        try {
          compData = JSON.parse(comp.data);
        } catch {
          compData = comp.data;
        }
      }

      // 1. Attributes & Base Info
      if (comp.component_id === 'baseInfo' && compData?.list) {
        for (const item of compData.list) {
          const key = (item.key || '').toLowerCase().trim();
          const val = cleanHtml(item.value?.[0] || item.val || '');

          if (key === 'vision' || key === 'element') vision = val;
          if (key === 'weapon' || key === 'weapon type') weapon = val;
          if (key === 'birthday') birthday = val;
          if (key === 'constellation') constellation = val;
          if (key === 'title') titles = val.split(/[,/]/).map((s: string) => s.trim()).filter(Boolean);
          if (key === 'region' || key === 'nation') regions = val.split(/[,/]/).map((s: string) => s.trim()).filter(Boolean);
          if (key === 'affiliation') affiliations = val.split(/[,/]/).map((s: string) => s.trim()).filter(Boolean);
          if (key === 'version released' || key === 'version release') {
            const v = parseFloat(val);
            if (!isNaN(v)) versionRelease = v;
          }
          if (key === 'rarity' || key.includes('star')) {
            const r = parseInt(val, 10);
            if (!isNaN(r)) rarity = r;
          }
          if (key === 'chinese va') cv.cn = val;
          if (key === 'english va') cv.en = val;
          if (key === 'japanese va') cv.jp = val;
          if (key === 'korean va') cv.kr = val;
        }
      }

      // 2. Gallery Media
      if (comp.component_id === 'gallery_character' && compData) {
        if (typeof compData.pic === 'string') images.header = compData.pic;
        else if (Array.isArray(compData.pic) && compData.pic[0]?.url) images.header = compData.pic[0].url;

        if (Array.isArray(compData.list)) {
          for (const item of compData.list) {
            const itemKey = (item.key || '').toLowerCase();
            // Full body splash / outfit
            if (itemKey.includes('outfit') && item.img) images.gacha = item.img;
            else if (itemKey === 'avatar' && item.img) images.gacha = images.gacha || item.img;
            // Constellation / card art
            if (itemKey === 'constellation' && item.img) images.card = item.img;
          }
        }
      }

      // 3. Talents
      if (comp.component_id === 'talent' && compData?.list) {
        for (const t of compData.list) {
          const attributes = (t.attributes || []).map((attr: any) => ({
            key: attr.key || '',
            values: attr.values || []
          }));

          talents.push({
            name: t.title || t.name || '',
            type: t.type || '',
            desc: cleanHtml(t.desc || ''),
            icon: t.icon_url || t.talent_img || t.talent_imgs?.[0]?.url || '',
            attributes
          });
        }
      }

      // 4. Constellations
      if (comp.component_id === 'summaryList' && modName.includes('constellation') && compData?.list) {
        compData.list.forEach((c: any, index: number) => {
          constellations.push({
            level: index + 1,
            name: c.name || c.title || `C${index + 1}`,
            desc: cleanHtml(c.desc || ''),
            icon: c.icon_url || c.img_url || ''
          });
        });
      }

      // 5. Stories
      if (comp.component_id === 'story' && compData?.list) {
        for (const s of compData.list) {
          stories.push({
            title: s.title || '',
            desc: cleanHtml(s.desc || '')
          });
        }
      }

      // 6. Voice Lines
      if (comp.component_id === 'voice' && compData?.list) {
        for (const v of compData.list) {
          const audios: { en?: string; jp?: string; cn?: string; kr?: string } = {};
          if (Array.isArray(v.audios)) {
            for (const a of v.audios) {
              const lang = (a.name || '').toLowerCase();
              if (lang.includes('en')) audios.en = a.url;
              if (lang.includes('jp') || lang.includes('ja')) audios.jp = a.url;
              if (lang.includes('cn') || lang.includes('zh')) audios.cn = a.url;
              if (lang.includes('kr') || lang.includes('ko')) audios.kr = a.url;
            }
          }
          voiceLines.push({
            title: v.title || '',
            desc: cleanHtml(v.desc || ''),
            audios
          });
        }
      }
    }
  }

  // Deduce rarity from filter tags if not found
  if (page.filter_values?.character_rarity?.values?.[0]) {
    const rMatch = page.filter_values.character_rarity.values[0].match(/\d/);
    if (rMatch) rarity = parseInt(rMatch[0], 10);
  }

  // Deduce vision & weapon from filter tags
  if (vision === 'N/A' && page.filter_values?.character_vision?.values?.[0]) {
    vision = page.filter_values.character_vision.values[0];
  }
  if (weapon === 'Sword' && page.filter_values?.character_weapon?.values?.[0]) {
    weapon = page.filter_values.character_weapon.values[0];
  }

  // Fallback images
  if (!images.profile) images.profile = images.icon;
  if (!images.gacha) images.gacha = images.profile;
  if (!images.card) images.card = images.gacha;

  // Cloudinary image upload pipeline (optional)
  if (options?.uploadImages) {
    if (images.icon) images.icon = await uploadToCloudinary(images.icon, 'characters', `${name}_icon`);
    if (images.profile) images.profile = await uploadToCloudinary(images.profile, 'characters', `${name}_profile`);
    if (images.gacha) images.gacha = await uploadToCloudinary(images.gacha, 'characters', `${name}_gacha`);
    if (images.card) images.card = await uploadToCloudinary(images.card, 'characters', `${name}_card`);
    if (images.header) images.header = await uploadToCloudinary(images.header, 'characters', `${name}_header`);
  }

  return {
    name,
    desc,
    rarity,
    vision,
    weapon,
    versionRelease,
    birthday,
    title: titles.length ? titles : [name],
    constellation,
    region: regions.length ? regions : ['Teyvat'],
    affiliation: affiliations.length ? affiliations : ['Teyvat'],
    cv,
    images,
    wikiUrl,
    entryId,
    talents,
    constellations,
    stories,
    voiceLines
  };
}

/**
 * 3. Scrape Complete Weapon Entry
 */
export async function scrapeWeapon(entryId: string | number, options?: ScrapeOptions): Promise<any> {
  const data = await fetchHoyowiki(`/entry_page?entry_page_id=${entryId}`);
  const page = data?.page;
  if (!page) throw new Error(`No page data found for weapon entry ${entryId}`);

  // Safeguard: Ensure entry is strictly a Weapon (menu_id === 4)
  if (page.menu_id && Number(page.menu_id) !== 4) {
    const categoryName = page.menu_name || `Menu ${page.menu_id}`;
    throw new Error(`Category Mismatch!\n"${page.name || entryId}" is a ${categoryName}, not a Weapon.`);
  }

  const name = page.name?.trim();
  const desc = cleanHtml(page.desc || '');
  const icon = page.icon_url || page.header_img || '';
  const wikiUrl = `https://wiki.hoyolab.com/pc/genshin/entry/${entryId}`;

  let rarity = 4;
  let family = 'Sword';
  let baseAtk = 0;
  let subStatType = 'N/A';
  let baseSubStat: string | number = 'N/A';
  let affix = 'N/A';
  let passive = 'N/A';
  let versionRelease = 1.0;
  let region = 'Teyvat';
  const source: string[] = [];
  const images: { icon?: string; original?: string; awakened?: string; gacha?: string } = { icon };
  const statsTable: IWeaponStat[] = [];

  const modules = page.modules || [];

  for (const mod of modules) {
    const components = mod.components || [];

    for (const comp of components) {
      let compData: any = null;
      if (comp.data) {
        try {
          compData = JSON.parse(comp.data);
        } catch {
          compData = comp.data;
        }
      }

      if (comp.component_id === 'baseInfo' && compData?.list) {
        for (const item of compData.list) {
          const key = (item.key || '').toLowerCase().trim();
          const val = cleanHtml(item.value?.[0] || item.val || '');

          if (key === 'weapon type' || key === 'type') family = val;
          if (key === 'rarity' || key.includes('star')) {
            const r = parseInt(val, 10);
            if (!isNaN(r)) rarity = r;
          }
          if (key === 'source' || key === 'how to obtain') source.push(val);
          if (key === 'base atk' || key === 'base attack') {
            const atk = parseFloat(val);
            if (!isNaN(atk)) baseAtk = atk;
          }
          if (key === 'secondary stat' || key === 'substat type') subStatType = val;
          if (key === 'secondary stat value' || key === 'substat') baseSubStat = val;
          if (key === 'affix' || key === 'passive name') affix = val;
          if (key === 'passive' || key === 'passive effect') passive = val;
          if (key === 'version released' || key === 'version release') {
            const v = parseFloat(val);
            if (!isNaN(v)) versionRelease = v;
          }
          if (key === 'region') region = val;
        }
      }

      // Stats table component if available
      if (comp.component_id === 'attribute_table' && compData?.list) {
        for (const row of compData.list) {
          statsTable.push({
            level: row.level || row.key || '',
            baseAtk: row.baseAtk || row.atk || 0,
            subStat: row.subStat || row.secondary || ''
          });
        }
      }
    }
  }

  // Fallbacks from filter tags
  if (page.filter_values?.weapon_rarity?.values?.[0]) {
    const rMatch = page.filter_values.weapon_rarity.values[0].match(/\d/);
    if (rMatch) rarity = parseInt(rMatch[0], 10);
  }
  if (page.filter_values?.weapon_type?.values?.[0]) {
    family = page.filter_values.weapon_type.values[0];
  }

  if (!images.original) images.original = icon;
  if (!images.awakened) images.awakened = icon;
  if (!images.gacha) images.gacha = icon;

  // Cloudinary image upload pipeline (optional)
  if (options?.uploadImages) {
    if (images.icon) images.icon = await uploadToCloudinary(images.icon, 'weapons', `${name}_icon`);
    if (images.original) images.original = await uploadToCloudinary(images.original, 'weapons', `${name}_original`);
    if (images.awakened) images.awakened = await uploadToCloudinary(images.awakened, 'weapons', `${name}_awakened`);
    if (images.gacha) images.gacha = await uploadToCloudinary(images.gacha, 'weapons', `${name}_gacha`);
  }

  return {
    name,
    desc,
    rarity,
    family,
    source: source.length ? source : ['Wish'],
    baseAtk,
    subStatType,
    baseSubStat,
    affix,
    passive,
    versionRelease,
    region,
    images,
    wikiUrl,
    entryId,
    statsTable
  };
}

/**
 * 4. Scrape Complete Artifact Entry
 */
export async function scrapeArtifact(entryId: string | number, options?: ScrapeOptions): Promise<any> {
  const data = await fetchHoyowiki(`/entry_page?entry_page_id=${entryId}`);
  const page = data?.page;
  if (!page) throw new Error(`No page data found for artifact entry ${entryId}`);

  // Safeguard: Ensure entry is strictly an Artifact Set (menu_id === 5)
  if (page.menu_id && Number(page.menu_id) !== 5) {
    const categoryName = page.menu_name || `Menu ${page.menu_id}`;
    throw new Error(`Category Mismatch!\n"${page.name || entryId}" is a ${categoryName}, not an Artifact.`);
  }

  const name = page.name?.trim();
  const wikiUrl = `https://wiki.hoyolab.com/pc/genshin/entry/${entryId}`;
  const setIcon = page.icon_url || page.header_img || '';

  let rarity: number[] = [4, 5];
  let twoPc = 'N/A';
  let fourPc = 'N/A';
  let onePc: string | undefined = undefined;

  const fullSet: {
    flower?: IArtifactPiece;
    sands?: IArtifactPiece;
    plume?: IArtifactPiece;
    circlet?: IArtifactPiece;
    goblet?: IArtifactPiece;
  } = {};

  const modules = page.modules || [];

  for (const mod of modules) {
    const components = mod.components || [];

    for (const comp of components) {
      let compData: any = null;
      if (comp.data) {
        try {
          compData = JSON.parse(comp.data);
        } catch {
          compData = comp.data;
        }
      }

      // 1. Reliquary Set Effects
      if (comp.component_id === 'reliquary_set_effect' && compData) {
        if (compData.two_set_effect) twoPc = cleanHtml(compData.two_set_effect);
        if (compData.four_set_effect) fourPc = cleanHtml(compData.four_set_effect);
        if (compData.one_set_effect) onePc = cleanHtml(compData.one_set_effect);
      }

      // 2. Base Info (Fallback for rarity & effects)
      if (comp.component_id === 'baseInfo' && compData?.list) {
        for (const item of compData.list) {
          const key = (item.key || '').toLowerCase().trim();
          const val = cleanHtml(item.value?.[0] || item.val || '');

          if (twoPc === 'N/A' && (key === '2-piece set' || key === '2pc' || key.includes('2-piece'))) twoPc = val;
          if (fourPc === 'N/A' && (key === '4-piece set' || key === '4pc' || key.includes('4-piece'))) fourPc = val;
          if (!onePc && (key === '1-piece set' || key === '1pc' || key.includes('1-piece'))) onePc = val;
          if (key === 'rarity' || key.includes('star')) {
            const rarities = val.match(/\d/g);
            if (rarities) rarity = rarities.map(Number);
          }
        }
      }

      // 3. Artifact Pieces (Object Structure)
      if (comp.component_id === 'artifact_list' && compData && typeof compData === 'object' && !Array.isArray(compData)) {
        if (compData.flower_of_life) {
          fullSet.flower = {
            title: compData.flower_of_life.title || `${name} Flower`,
            piece: 'Flower of Life',
            icon: compData.flower_of_life.icon_url || compData.flower_of_life.img_url || setIcon,
            desc: cleanHtml(compData.flower_of_life.desc || '')
          };
        }
        if (compData.plume_of_death) {
          fullSet.plume = {
            title: compData.plume_of_death.title || `${name} Plume`,
            piece: 'Plume of Death',
            icon: compData.plume_of_death.icon_url || compData.plume_of_death.img_url || setIcon,
            desc: cleanHtml(compData.plume_of_death.desc || '')
          };
        }
        if (compData.sands_of_eon) {
          fullSet.sands = {
            title: compData.sands_of_eon.title || `${name} Sands`,
            piece: 'Sands of Eon',
            icon: compData.sands_of_eon.icon_url || compData.sands_of_eon.img_url || setIcon,
            desc: cleanHtml(compData.sands_of_eon.desc || '')
          };
        }
        if (compData.goblet_of_eonothem) {
          fullSet.goblet = {
            title: compData.goblet_of_eonothem.title || `${name} Goblet`,
            piece: 'Goblet of Eonothem',
            icon: compData.goblet_of_eonothem.icon_url || compData.goblet_of_eonothem.img_url || setIcon,
            desc: cleanHtml(compData.goblet_of_eonothem.desc || '')
          };
        }
        if (compData.circlet_of_logos) {
          fullSet.circlet = {
            title: compData.circlet_of_logos.title || `${name} Circlet`,
            piece: 'Circlet of Logos',
            icon: compData.circlet_of_logos.icon_url || compData.circlet_of_logos.img_url || setIcon,
            desc: cleanHtml(compData.circlet_of_logos.desc || '')
          };
        }
      }

      // 4. Artifact Pieces (Array Fallback)
      if ((comp.component_id === 'artifact_list' || comp.component_id === 'summaryList') && compData?.list) {
        const list = compData.list;
        for (const p of list) {
          const pieceName = (p.position || p.piece || p.type || p.name || '').toLowerCase();
          const pieceObj: IArtifactPiece = {
            title: p.name || p.title || '',
            piece: p.position || p.piece || '',
            icon: p.icon_url || p.img_url || p.imgSrc || setIcon,
            desc: cleanHtml(p.desc || p.artifactDesc || '')
          };

          if (pieceName.includes('flower') || pieceName.includes('life')) fullSet.flower = pieceObj;
          else if (pieceName.includes('plume') || pieceName.includes('death') || pieceName.includes('feather')) fullSet.plume = pieceObj;
          else if (pieceName.includes('sands') || pieceName.includes('eon') || pieceName.includes('time')) fullSet.sands = pieceObj;
          else if (pieceName.includes('goblet') || pieceName.includes('eonothem') || pieceName.includes('cup')) fullSet.goblet = pieceObj;
          else if (pieceName.includes('circlet') || pieceName.includes('logos') || pieceName.includes('crown') || pieceName.includes('head')) fullSet.circlet = pieceObj;
        }
      }
    }
  }

  // Ensure flower icon always exists for set display
  if (!fullSet.flower) {
    fullSet.flower = {
      title: `${name} Set Icon`,
      piece: 'Flower of Life',
      icon: setIcon,
      desc: ''
    };
  } else if (!fullSet.flower.icon) {
    fullSet.flower.icon = setIcon;
  }

  // Deduce rarity from filter values if missing
  if (page.filter_values?.reliquary_rarity?.values) {
    const r = page.filter_values.reliquary_rarity.values.map((v: string) => {
      const match = v.match(/\d/);
      return match ? Number(match[0]) : null;
    }).filter(Boolean);
    if (r.length) rarity = r;
  }

  // Cloudinary image upload pipeline (optional)
  if (options?.uploadImages) {
    if (fullSet.flower?.icon) fullSet.flower.icon = await uploadToCloudinary(fullSet.flower.icon, 'artifacts', `${name}_flower`);
    if (fullSet.plume?.icon) fullSet.plume.icon = await uploadToCloudinary(fullSet.plume.icon, 'artifacts', `${name}_plume`);
    if (fullSet.sands?.icon) fullSet.sands.icon = await uploadToCloudinary(fullSet.sands.icon, 'artifacts', `${name}_sands`);
    if (fullSet.goblet?.icon) fullSet.goblet.icon = await uploadToCloudinary(fullSet.goblet.icon, 'artifacts', `${name}_goblet`);
    if (fullSet.circlet?.icon) fullSet.circlet.icon = await uploadToCloudinary(fullSet.circlet.icon, 'artifacts', `${name}_circlet`);
  }

  return {
    name,
    rarity,
    effect: {
      twoPc,
      fourPc,
      ...(onePc ? { onePc } : {})
    },
    fullSet,
    wikiUrl,
    entryId
  };
}

/**
 * 5. Batch Sync All Characters
 */
export async function syncAllCharacters(onProgress?: ProgressCallback, options?: ScrapeOptions): Promise<number> {
  console.log('Fetching all character entries from HoYoWiki...');
  const entries = await getEntryList(2);
  console.log(`Found ${entries.length} characters on HoYoWiki. Scraping with concurrency...`);

  let successCount = 0;
  let failedCount = 0;

  await runWithConcurrency(entries, 4, async (entry, idx) => {
    try {
      const charData = await scrapeCharacter(entry.entry_page_id, options);
      await Character.findOneAndUpdate(
        { name: charData.name },
        charData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      successCount++;
      if (onProgress) {
        onProgress({
          category: 'Characters',
          total: entries.length,
          current: idx + 1,
          currentItem: entry.name,
          success: successCount,
          failed: failedCount
        });
      }
    } catch (err: any) {
      failedCount++;
      console.error(`Failed to scrape character "${entry.name}" (ID: ${entry.entry_page_id}):`, err.message || err);
    }
  });

  return successCount;
}

/**
 * 6. Batch Sync All Weapons
 */
export async function syncAllWeapons(onProgress?: ProgressCallback, options?: ScrapeOptions): Promise<number> {
  console.log('Fetching all weapon entries from HoYoWiki...');
  const entries = await getEntryList(4);
  console.log(`Found ${entries.length} weapons on HoYoWiki. Scraping with concurrency...`);

  let successCount = 0;
  let failedCount = 0;

  await runWithConcurrency(entries, 5, async (entry, idx) => {
    try {
      const weaponData = await scrapeWeapon(entry.entry_page_id, options);
      await Weapon.findOneAndUpdate(
        { name: weaponData.name },
        weaponData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      successCount++;
      if (onProgress) {
        onProgress({
          category: 'Weapons',
          total: entries.length,
          current: idx + 1,
          currentItem: entry.name,
          success: successCount,
          failed: failedCount
        });
      }
    } catch (err: any) {
      failedCount++;
      console.error(`Failed to scrape weapon "${entry.name}" (ID: ${entry.entry_page_id}):`, err.message || err);
    }
  });

  return successCount;
}

/**
 * 7. Batch Sync All Artifacts
 */
export async function syncAllArtifacts(onProgress?: ProgressCallback, options?: ScrapeOptions): Promise<number> {
  console.log('Fetching all artifact entries from HoYoWiki...');
  const entries = await getEntryList(5);
  console.log(`Found ${entries.length} artifacts on HoYoWiki. Scraping with concurrency...`);

  let successCount = 0;
  let failedCount = 0;

  await runWithConcurrency(entries, 5, async (entry, idx) => {
    try {
      const artifactData = await scrapeArtifact(entry.entry_page_id, options);
      await Artifact.findOneAndUpdate(
        { name: artifactData.name },
        artifactData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      successCount++;
      if (onProgress) {
        onProgress({
          category: 'Artifacts',
          total: entries.length,
          current: idx + 1,
          currentItem: entry.name,
          success: successCount,
          failed: failedCount
        });
      }
    } catch (err: any) {
      failedCount++;
      console.error(`Failed to scrape artifact "${entry.name}" (ID: ${entry.entry_page_id}):`, err.message || err);
    }
  });

  return successCount;
}

/**
 * 8. Sync Entire Universe
 */
export async function syncEntireUniverse(options?: ScrapeOptions): Promise<{ characters: number; weapons: number; artifacts: number }> {
  console.log('🚀 Starting Full Teyvat Universe Scrape Sync...\n');
  const chars = await syncAllCharacters(p => {
    process.stdout.write(`\r[Characters] ${p.current}/${p.total} (${p.currentItem}) - Success: ${p.success}`);
  }, options);
  console.log(`\n✅ Completed Characters Sync (${chars} records)!\n`);

  const weaps = await syncAllWeapons(p => {
    process.stdout.write(`\r[Weapons] ${p.current}/${p.total} (${p.currentItem}) - Success: ${p.success}`);
  }, options);
  console.log(`\n✅ Completed Weapons Sync (${weaps} records)!\n`);

  const arts = await syncAllArtifacts(p => {
    process.stdout.write(`\r[Artifacts] ${p.current}/${p.total} (${p.currentItem}) - Success: ${p.success}`);
  }, options);
  console.log(`\n✅ Completed Artifacts Sync (${arts} records)!\n`);

  console.log('🎉 Universe Synchronization Successfully Finished!');
  return { characters: chars, weapons: weaps, artifacts: arts };
}
