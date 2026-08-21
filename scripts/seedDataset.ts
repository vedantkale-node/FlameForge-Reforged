import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Character from '../src/models/characterModel.js';
import Weapon from '../src/models/weaponModel.js';
import Artifact from '../src/models/artifactModel.js';
import { config } from 'dotenv';
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const scraperDataDir = path.join(rootDir, 'Scraper', 'data');

const loadJsonFiles = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  const allData: any[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        allData.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        allData.push(parsed);
      }
    } catch (err: any) {
      console.warn(`Could not parse ${file}:`, err.message);
    }
  }
  return allData;
};

const seedDataset = async () => {
  try {
    const mongoUri = process.env.DB || 'mongodb://127.0.0.1:27017/FlameForge';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    console.log('Reading scraped dataset from Scraper/data...');

    // Characters
    const characters = loadJsonFiles(path.join(scraperDataDir, 'character'));
    console.log(`Found ${characters.length} characters.`);
    if (characters.length > 0) {
      await Character.deleteMany({});
      await Character.insertMany(characters);
      console.log(`✅ Successfully seeded ${characters.length} Characters into MongoDB!`);
    }

    // Weapons
    const weapons = loadJsonFiles(path.join(scraperDataDir, 'weapon'));
    console.log(`Found ${weapons.length} weapons.`);
    if (weapons.length > 0) {
      await Weapon.deleteMany({});
      await Weapon.insertMany(weapons);
      console.log(`✅ Successfully seeded ${weapons.length} Weapons into MongoDB!`);
    }

    // Artifacts
    const artifacts = loadJsonFiles(path.join(scraperDataDir, 'artifacts'));
    console.log(`Found ${artifacts.length} artifacts.`);
    if (artifacts.length > 0) {
      await Artifact.deleteMany({});
      await Artifact.insertMany(artifacts);
      console.log(`✅ Successfully seeded ${artifacts.length} Artifacts into MongoDB!`);
    }

    console.log('\n🎉 Full Teyvat database seeding complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error during dataset seeding:', err);
    process.exit(1);
  }
};

seedDataset();
