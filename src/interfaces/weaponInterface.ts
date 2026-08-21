import { Document } from "mongoose";

export interface IWeaponStat {
    level: string;
    baseAtk: string | number;
    subStat?: string | number;
}

export interface IWeapon extends Document {
    name: string;
    desc: string;
    rarity: number;
    source?: string[];
    baseAtk?: number;
    subStatType?: string;
    baseSubStat?: string | number;
    affix?: string;
    passive?: string;
    versionRelease?: number | string;
    region?: string;
    family?: string;
    images: {
        icon?: string;
        original?: string;
        awakened?: string;
        gacha?: string;
    };
    wikiUrl?: string;
    entryId?: string | number;
    statsTable?: IWeaponStat[];
    createdAt?: Date;
    updatedAt?: Date;
}