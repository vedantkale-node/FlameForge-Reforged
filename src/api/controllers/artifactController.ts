import { Request, Response } from "express";
import Artifact from "../../models/artifactModel.js";
import { apiLogger } from "../../helpers/logger.js";

const MINIMAL_PROJECTION = '-_id -__v -cdata -fullSet.sands -fullSet.plume -fullSet.circlet -fullSet.goblet -fullSet.flower.piece -fullSet.flower.title -fullSet.flower.desc';
const FULL_PROJECTION = '-_id -__v -cdata';

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

const getSingleArtifact = async (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const { name, infoSize } = req.query;
        const isFull = infoSize === 'full';

        if (name && typeof name === 'string' && name.trim()) {
            const nameRegex = createNameRegex(name);
            const projection = isFull ? FULL_PROJECTION : MINIMAL_PROJECTION;
            const artifact = await Artifact.findOne({ name: nameRegex }).select(projection);

            if (!artifact) {
                return res.status(404).json({ success: false, error: `Artifact "${name}" not found` });
            }

            apiLogger.verbose('API call successful', {
                endpoint: `/api/artifact?name=${encodeURIComponent(name)}${isFull ? '&infoSize=full' : ''}`,
                method: 'GET',
                ip: ip
            });
            return res.json(artifact);
        }

        // Random artifact sample if no name specified
        const projectionObj: Record<string, number> = isFull
            ? { __v: 0, _id: 0, cdata: 0 }
            : {
                __v: 0, _id: 0, cdata: 0,
                'fullSet.sands': 0, 'fullSet.plume': 0, 'fullSet.circlet': 0,
                'fullSet.goblet': 0, 'fullSet.flower.piece': 0, 'fullSet.flower.title': 0, 'fullSet.flower.desc': 0
            };

        const randomData = await Artifact.aggregate([
            { $sample: { size: 1 } },
            { $project: projectionObj }
        ]);

        if (!randomData || randomData.length === 0) {
            return res.status(404).json({ success: false, error: 'No artifacts available' });
        }

        apiLogger.verbose('API call successful', {
            endpoint: `/api/artifact${isFull ? '?infoSize=full' : ''}`,
            method: 'GET',
            ip: ip
        });
        return res.json(randomData[0]);

    } catch (error: any) {
        apiLogger.error('API call error', {
            endpoint: `/api/artifact`,
            method: 'GET',
            ip: ip,
            error: error.message
        });
        console.error('Artifact API Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getAllArtifacts = async (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const { infoSize } = req.query;
        const isFull = infoSize === 'full';
        const projection = isFull ? FULL_PROJECTION : MINIMAL_PROJECTION;

        const artifacts = await Artifact.find().select(projection);

        apiLogger.verbose('API call successful', {
            endpoint: req.originalUrl,
            method: 'GET',
            ip: ip
        });
        return res.json(artifacts);

    } catch (error: any) {
        apiLogger.error('API call error', {
            endpoint: `/api/artifacts`,
            method: 'GET',
            ip: ip,
            error: error.message
        });
        console.error('Artifacts API Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export { getAllArtifacts, getSingleArtifact };