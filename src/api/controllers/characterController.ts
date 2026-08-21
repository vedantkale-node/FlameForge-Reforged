import { Request, Response } from "express";
import Character from "../../models/characterModel.js";
import { apiLogger } from "../../helpers/logger.js";

const MINIMAL_PROJECTION = '-_id -__v -talents -constellations -stories -voiceLines -versionRelease -birthday -title -images.card -images.gacha -wikiUrl -affiliation -constellation';
const FULL_PROJECTION = '-_id -__v';

function escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createNameRegex(rawName: string): RegExp {
    if (typeof rawName !== 'string') return /^$/i;
    const clean = rawName.trim().replace(/['’]/g, '');
    const parts = clean.split(/[-_ \s]+/);
    const pattern = parts.map(p => {
        const escaped = escapeRegex(p);
        return escaped.replace(/s$/i, "['’]?s?");
    }).join("[-_ '’]*");
    return new RegExp(`^${pattern}$`, 'i');
}

const getSingleCharacter = async (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const { name, infoSize } = req.query;
        const isFull = infoSize === 'full';

        if (name && typeof name === 'string' && name.trim()) {
            const nameRegex = createNameRegex(name);
            const projection = isFull ? FULL_PROJECTION : MINIMAL_PROJECTION;
            const character = await Character.findOne({ name: nameRegex }).select(projection);

            if (!character) {
                return res.status(404).json({ success: false, error: `Character "${name}" not found` });
            }

            apiLogger.verbose('API call successful', {
                endpoint: `/api/character?name=${encodeURIComponent(name)}${isFull ? '&infoSize=full' : ''}`,
                method: 'GET',
                ip: ip
            });
            return res.json(character);
        }

        // Random character sample if no name specified
        const projectionObj: Record<string, number> = isFull
            ? { __v: 0, _id: 0 }
            : {
                __v: 0, _id: 0, talents: 0, constellations: 0, stories: 0, voiceLines: 0,
                versionRelease: 0, birthday: 0, title: 0, 'images.card': 0, 'images.gacha': 0,
                wikiUrl: 0, affiliation: 0, constellation: 0
            };

        const randomData = await Character.aggregate([
            { $sample: { size: 1 } },
            { $project: projectionObj }
        ]);

        if (!randomData || randomData.length === 0) {
            return res.status(404).json({ success: false, error: 'No characters available' });
        }

        apiLogger.verbose('API call successful', {
            endpoint: `/api/character${isFull ? '?infoSize=full' : ''}`,
            method: 'GET',
            ip: ip
        });
        return res.json(randomData[0]);

    } catch (error: any) {
        apiLogger.error('API call error', {
            endpoint: `/api/character`,
            method: 'GET',
            ip: ip,
            error: error.message
        });
        console.error('Character API Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getAllCharacters = async (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const { vision, region, rarity, weapon, infoSize } = req.query;
        const isFull = infoSize === 'full';
        const projection = isFull ? FULL_PROJECTION : MINIMAL_PROJECTION;
        const filter: any = {};

        if (typeof vision === 'string' && vision.trim()) {
            filter.vision = new RegExp(`^${escapeRegex(vision.trim())}$`, 'i');
        }
        if (typeof region === 'string' && region.trim()) {
            filter.region = new RegExp(`^${escapeRegex(region.trim().replace(/-/g, ' '))}$`, 'i');
        }
        if (rarity && !isNaN(Number(rarity))) {
            filter.rarity = Number(rarity);
        }
        if (typeof weapon === 'string' && weapon.trim()) {
            filter.weapon = new RegExp(`^${escapeRegex(weapon.trim())}$`, 'i');
        }

        const characters = await Character.find(filter).select(projection);

        apiLogger.verbose('API call successful', {
            endpoint: req.originalUrl,
            method: 'GET',
            ip: ip
        });
        return res.json(characters);

    } catch (error: any) {
        apiLogger.error('API call error', {
            endpoint: `/api/characters`,
            method: 'GET',
            ip: ip,
            error: error.message
        });
        console.error('Characters API Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export { getAllCharacters, getSingleCharacter };