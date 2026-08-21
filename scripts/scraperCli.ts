import mongoose from 'mongoose';
import { config } from 'dotenv';
import {
  scrapeCharacter,
  scrapeWeapon,
  scrapeArtifact,
  syncAllCharacters,
  syncAllWeapons,
  syncAllArtifacts,
  syncEntireUniverse
} from '../src/scraper/hoyowikiEngine.js';

config();

const mongoUri = process.env.DB || 'mongodb://127.0.0.1:27017/FlameForge';

async function main() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');

  if (args.length === 0 || help) {
    console.log(`
FlameForge High-Speed HoYoWiki Scraper CLI
==========================================
Usage:
  npx tsx scripts/scraperCli.ts [options]

Options:
  --all                   Sync all Characters (128), Weapons (245), and Artifacts (63)
  --characters            Sync all Characters to MongoDB
  --weapons               Sync all Weapons to MongoDB
  --artifacts             Sync all Artifacts to MongoDB
  --entry <id_or_url>     Scrape and display JSON for a specific HoYoWiki entry ID or URL
  --sample                Scrape and preview Diluc (Entry 43) with complete talents & constellations

Example:
  npx tsx scripts/scraperCli.ts --characters
  npx tsx scripts/scraperCli.ts --entry 43
  npx tsx scripts/scraperCli.ts --all
    `);
    process.exit(0);
  }

  // Single Entry Preview Mode (No DB connection needed)
  if (args.includes('--sample') || args.includes('--entry')) {
    let entryId = '43';
    const entryIdx = args.indexOf('--entry');
    if (entryIdx !== -1 && args[entryIdx + 1]) {
      const raw = args[entryIdx + 1];
      const match = raw.match(/\d+/);
      entryId = match ? match[0] : raw;
    }

    console.log(`\n🔍 Fetching and parsing HoYoWiki entry ID ${entryId}...`);
    const char = await scrapeCharacter(entryId);
    console.log('\n================ PARSED CHARACTER PREVIEW ================');
    console.log('Name:          ', char.name);
    console.log('Rarity:        ', `${char.rarity}★`);
    console.log('Vision:        ', char.vision);
    console.log('Weapon:        ', char.weapon);
    console.log('Region:        ', char.region.join(', '));
    console.log('Affiliation:   ', char.affiliation.join(', '));
    console.log('Constellation: ', char.constellation);
    console.log('Birthday:      ', char.birthday);
    console.log('Voice Actors:  ', JSON.stringify(char.cv));
    console.log('Images:        ', JSON.stringify(char.images, null, 2));
    console.log('Talents Count: ', char.talents.length);
    if (char.talents.length > 0) {
      console.log('Talents List:  ', char.talents.map((t: any) => `[${t.name}]`).join(', '));
    }
    console.log('Constellations:', char.constellations.map((c: any) => `[C${c.level}: ${c.name}]`).join(', '));
    console.log('Stories Count: ', char.stories.length);
    console.log('Voice Lines:   ', char.voiceLines.length);
    console.log('===========================================================\n');
    process.exit(0);
  }

  // Database Sync Operations
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  const startTime = Date.now();

  if (args.includes('--all')) {
    await syncEntireUniverse();
  } else if (args.includes('--characters')) {
    const total = await syncAllCharacters(p => {
      process.stdout.write(`\r[Characters] ${p.current}/${p.total} (${p.currentItem}) - Success: ${p.success}`);
    });
    console.log(`\n✅ Synced ${total} Characters to MongoDB!`);
  } else if (args.includes('--weapons')) {
    const total = await syncAllWeapons(p => {
      process.stdout.write(`\r[Weapons] ${p.current}/${p.total} (${p.currentItem}) - Success: ${p.success}`);
    });
    console.log(`\n✅ Synced ${total} Weapons to MongoDB!`);
  } else if (args.includes('--artifacts')) {
    const total = await syncAllArtifacts(p => {
      process.stdout.write(`\r[Artifacts] ${p.current}/${p.total} (${p.currentItem}) - Success: ${p.success}`);
    });
    console.log(`\n✅ Synced ${total} Artifacts to MongoDB!`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`⏱️ Completed in ${durationSec} seconds.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
