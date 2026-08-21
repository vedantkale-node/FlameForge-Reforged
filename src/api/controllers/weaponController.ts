import { Request, Response } from "express";
import Weapon from "../../models/weaponModel.js";
import { apiLogger } from "../../helpers/logger.js";

const MINIMAL_PROJECTION = '-_id -__v -statsTable -images.original -images.awakened -images.gacha -source -baseSubStat -affix -passive -versionRelease -region -wikiUrl';
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

const getSingleWeapon = async (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const { name, infoSize } = req.query;
        const isFull = infoSize === 'full';

        if (name && typeof name === 'string' && name.trim()) {
            const nameRegex = createNameRegex(name);
            const projection = isFull ? FULL_PROJECTION : MINIMAL_PROJECTION;
            const weapon = await Weapon.findOne({ name: nameRegex }).select(projection);

            if (!weapon) {
                return res.status(404).json({ success: false, error: `Weapon "${name}" not found` });
            }

            apiLogger.verbose('API call successful', {
                endpoint: `/api/weapon?name=${encodeURIComponent(name)}${isFull ? '&infoSize=full' : ''}`,
                method: 'GET',
                ip: ip
            });
            return res.json(weapon);
        }

        // Random weapon sample if no name specified
        const projectionObj: Record<string, number> = isFull
            ? { __v: 0, _id: 0 }
            : {
                __v: 0, _id: 0, statsTable: 0,
                'images.original': 0, 'images.awakened': 0, 'images.gacha': 0,
                source: 0, baseSubStat: 0, affix: 0, passive: 0, versionRelease: 0,
                region: 0, wikiUrl: 0
            };

        const randomData = await Weapon.aggregate([
            { $sample: { size: 1 } },
            { $project: projectionObj }
        ]);

        if (!randomData || randomData.length === 0) {
            return res.status(404).json({ success: false, error: 'No weapons available' });
        }

        apiLogger.verbose('API call successful', {
            endpoint: `/api/weapon${isFull ? '?infoSize=full' : ''}`,
            method: 'GET',
            ip: ip
        });
        return res.json(randomData[0]);

    } catch (error: any) {
        apiLogger.error('API call error', {
            endpoint: `/api/weapon`,
            method: 'GET',
            ip: ip,
            error: error.message
        });
        console.error('Weapon API Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getAllWeapons = async (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const { rarity, family, type, infoSize } = req.query;
        const isFull = infoSize === 'full';
        const projection = isFull ? FULL_PROJECTION : MINIMAL_PROJECTION;
        const filter: any = {};

        const weaponTypeOrFamily = ((family || type) as string);
        if (typeof weaponTypeOrFamily === 'string' && weaponTypeOrFamily.trim()) {
            filter.family = new RegExp(`^${escapeRegex(weaponTypeOrFamily.trim())}$`, 'i');
        }
        if (rarity && !isNaN(Number(rarity))) {
            filter.rarity = Number(rarity);
        }

        const weapons = await Weapon.find(filter).select(projection);

        apiLogger.verbose('API call successful', {
            endpoint: req.originalUrl,
            method: 'GET',
            ip: ip
        });
        return res.json(weapons);

    } catch (error: any) {
        apiLogger.error('API call error', {
            endpoint: `/api/weapons`,
            method: 'GET',
            ip: ip,
            error: error.message
        });
        console.error('Weapons API Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export { getAllWeapons, getSingleWeapon };