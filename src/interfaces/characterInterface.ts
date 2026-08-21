import { Document } from "mongoose";

export interface ITalentAttribute {
    key: string;
    values: string[];
}

export interface ITalent {
    name: string;
    type?: string; // Normal Attack, Elemental Skill, Elemental Burst, Passive
    desc: string;
    icon?: string;
    attributes?: ITalentAttribute[];
}

export interface IConstellation {
    level: number;
    name: string;
    desc: string;
    icon?: string;
}

export interface ICharacterStory {
    title: string;
    desc: string;
}

export interface IVoiceLine {
    title: string;
    desc: string;
    audios?: {
        en?: string;
        jp?: string;
        cn?: string;
        kr?: string;
    };
}

export interface ICharacterCV {
    en?: string;
    jp?: string;
    cn?: string;
    kr?: string;
}

export interface ICharacter extends Document {
    name: string;
    desc: string;
    rarity: number;
    vision: string;
    weapon: string;
    versionRelease?: number;
    birthday?: string;
    model?: string;
    title?: string[];
    constellation?: string;
    region?: string[];
    affiliation?: string[];
    cv?: ICharacterCV;
    images: {
        profile?: string;
        gacha?: string;
        card?: string;
        icon?: string;
        header?: string;
    };
    wikiUrl?: string;
    entryId?: string | number;
    talents?: ITalent[];
    constellations?: IConstellation[];
    stories?: ICharacterStory[];
    voiceLines?: IVoiceLine[];
    skin?: {
        title: string;
        profile: string;
        gacha: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}