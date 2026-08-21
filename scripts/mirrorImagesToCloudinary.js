import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';

function createLimiter(concurrency = 4) {
    let active = 0;
    const queue = [];
    const next = () => {
        if (queue.length === 0 || active >= concurrency) return;
        active++;
        const { fn, resolve, reject } = queue.shift();
        fn().then(resolve, reject).finally(() => {
            active--;
            next();
        });
    };
    return (fn) => new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
    });
}

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const DB_URI = process.env.DB || 'mongodb://127.0.0.1:27017/FlameForge';

function isExternalUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
    if (trimmed.includes('res.cloudinary.com')) return false;
    return true;
}

function cleanId(str) {
    return (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

async function uploadImage(url, folder, publicId) {
    if (!isExternalUrl(url)) return url;
    try {
        const res = await cloudinary.v2.uploader.upload(url, {
            folder: `FlameForge/${folder}`,
            public_id: cleanId(publicId),
            overwrite: true,
            resource_type: 'image',
        });
        return res.secure_url || res.url;
    } catch (err) {
        console.warn(`⚠️ [Cloudinary] Failed "${publicId}": ${err.message || err}`);
        return url;
    }
}

async function main() {
    console.log('🚀 Connecting to MongoDB:', DB_URI);
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB.');

    const limit = createLimiter(4);
    const db = mongoose.connection.db;

    // 1. Mirror Character Images
    console.log('\n🎴 --- Mirroring Character Images to Cloudinary ---');
    const characterCollection = db.collection('characters');
    const characters = await characterCollection.find({}).toArray();
    console.log(`Found ${characters.length} characters in database.`);

    let charCount = 0;
    const charTasks = characters.map(char => limit(async () => {
        let changed = false;
        const charName = char.name || 'character';

        // Core images
        if (char.images) {
            if (isExternalUrl(char.images.icon)) {
                char.images.icon = await uploadImage(char.images.icon, 'characters', `${charName}_icon`);
                changed = true;
            }
            if (isExternalUrl(char.images.profile)) {
                char.images.profile = await uploadImage(char.images.profile, 'characters', `${charName}_profile`);
                changed = true;
            }
            if (isExternalUrl(char.images.gacha)) {
                char.images.gacha = await uploadImage(char.images.gacha, 'characters', `${charName}_gacha`);
                changed = true;
            }
            if (isExternalUrl(char.images.card)) {
                char.images.card = await uploadImage(char.images.card, 'characters', `${charName}_card`);
                changed = true;
            }
            if (isExternalUrl(char.images.header)) {
                char.images.header = await uploadImage(char.images.header, 'characters', `${charName}_header`);
                changed = true;
            }
        }

        // Talents
        if (Array.isArray(char.talents)) {
            for (let i = 0; i < char.talents.length; i++) {
                const t = char.talents[i];
                if (t && isExternalUrl(t.icon)) {
                    t.icon = await uploadImage(t.icon, 'talents', `${charName}_talent_${i + 1}_${t.name}`);
                    changed = true;
                }
            }
        }

        // Constellations
        if (Array.isArray(char.constellations)) {
            for (let i = 0; i < char.constellations.length; i++) {
                const c = char.constellations[i];
                if (c && isExternalUrl(c.icon)) {
                    c.icon = await uploadImage(c.icon, 'constellations', `${charName}_c${c.level || i + 1}_${c.name}`);
                    changed = true;
                }
            }
        }

        if (changed) {
            await characterCollection.updateOne(
                { _id: char._id },
                { $set: { images: char.images, talents: char.talents, constellations: char.constellations } }
            );
            charCount++;
            console.log(`[Characters] (${charCount}) Mirrored: ${charName}`);
        }
    }));

    await Promise.all(charTasks);
    console.log(`✅ Characters mirroring complete! Updated ${charCount} character records.`);

    // 2. Mirror Weapon Images
    console.log('\n⚔️ --- Mirroring Weapon Images to Cloudinary ---');
    const weaponCollection = db.collection('weapons');
    const weapons = await weaponCollection.find({}).toArray();
    console.log(`Found ${weapons.length} weapons in database.`);

    let weapCount = 0;
    const weapTasks = weapons.map(weap => limit(async () => {
        let changed = false;
        const weapName = weap.name || 'weapon';

        if (weap.images) {
            if (isExternalUrl(weap.images.icon)) {
                weap.images.icon = await uploadImage(weap.images.icon, 'weapons', `${weapName}_icon`);
                changed = true;
            }
            if (isExternalUrl(weap.images.original)) {
                weap.images.original = await uploadImage(weap.images.original, 'weapons', `${weapName}_original`);
                changed = true;
            }
            if (isExternalUrl(weap.images.awakened)) {
                weap.images.awakened = await uploadImage(weap.images.awakened, 'weapons', `${weapName}_awakened`);
                changed = true;
            }
            if (isExternalUrl(weap.images.gacha)) {
                weap.images.gacha = await uploadImage(weap.images.gacha, 'weapons', `${weapName}_gacha`);
                changed = true;
            }
        }

        if (changed) {
            await weaponCollection.updateOne(
                { _id: weap._id },
                { $set: { images: weap.images } }
            );
            weapCount++;
            console.log(`[Weapons] (${weapCount}) Mirrored: ${weapName}`);
        }
    }));

    await Promise.all(weapTasks);
    console.log(`✅ Weapons mirroring complete! Updated ${weapCount} weapon records.`);

    // 3. Mirror Artifact Images
    console.log('\n🏺 --- Mirroring Artifact Images to Cloudinary ---');
    const artifactCollection = db.collection('artifacts');
    const artifacts = await artifactCollection.find({}).toArray();
    console.log(`Found ${artifacts.length} artifacts in database.`);

    let artCount = 0;
    const artTasks = artifacts.map(art => limit(async () => {
        let changed = false;
        const artName = art.name || 'artifact';

        if (art.fullSet) {
            const pieces = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
            for (const piece of pieces) {
                if (art.fullSet[piece] && isExternalUrl(art.fullSet[piece].icon)) {
                    art.fullSet[piece].icon = await uploadImage(art.fullSet[piece].icon, 'artifacts', `${artName}_${piece}`);
                    changed = true;
                }
            }
        }

        if (changed) {
            await artifactCollection.updateOne(
                { _id: art._id },
                { $set: { fullSet: art.fullSet } }
            );
            artCount++;
            console.log(`[Artifacts] (${artCount}) Mirrored: ${artName}`);
        }
    }));

    await Promise.all(artTasks);
    console.log(`✅ Artifacts mirroring complete! Updated ${artCount} artifact records.`);

    console.log('\n🎉 ALL HOYOWIKI ASSETS MIRRORED TO CLOUDINARY SUCCESSFULLY!');
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error during Cloudinary mirroring:', err);
    process.exit(1);
});
