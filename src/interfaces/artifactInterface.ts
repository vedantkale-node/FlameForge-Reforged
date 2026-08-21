import { Document } from "mongoose";

export interface IArtifactPiece {
    title: string;
    piece: string;
    icon?: string;
    desc?: string;
}

export interface IArtifact extends Document {
    name: string;
    rarity?: number[];
    effect: {
        twoPc: string;
        fourPc: string;
        onePc?: string;
    };
    fullSet: {
        flower?: IArtifactPiece;
        sands?: IArtifactPiece;
        plume?: IArtifactPiece;
        circlet?: IArtifactPiece;
        goblet?: IArtifactPiece;
    };
    wikiUrl?: string;
    entryId?: string | number;
    createdAt?: Date;
    updatedAt?: Date;
}