import { Schema, model, Model } from "mongoose";
import { IWeapon } from "../interfaces/weaponInterface.js";

const weaponSchema = new Schema<IWeapon>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    desc: {
        type: String,
        default: 'N/A'
    },
    rarity: {
        type: Number,
        default: 4
    },
    source: {
        type: [String],
        default: []
    },
    baseAtk: {
        type: Number,
        default: 0
    },
    subStatType: {
        type: String,
        default: 'N/A'
    },
    baseSubStat: {
        type: Schema.Types.Mixed,
        default: 'N/A'
    },
    affix: {
        type: String,
        default: 'N/A'
    },
    passive: {
        type: String,
        default: 'N/A'
    },
    versionRelease: {
        type: Schema.Types.Mixed,
        default: 1.0
    },
    region: {
        type: String,
        default: 'N/A'
    },
    family: {
        type: String,
        default: 'Sword'
    },
    images: {
        icon: { type: String },
        original: { type: String },
        awakened: { type: String },
        gacha: { type: String }
    },
    wikiUrl: {
        type: String
    },
    entryId: {
        type: Schema.Types.Mixed
    },
    statsTable: [{
        level: { type: String },
        baseAtk: { type: Schema.Types.Mixed },
        subStat: { type: Schema.Types.Mixed }
    }]
}, {
    timestamps: true
});

const Weapon: Model<IWeapon> = model<IWeapon>("Weapon", weaponSchema);

export default Weapon;