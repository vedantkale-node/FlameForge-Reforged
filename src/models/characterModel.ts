import { Schema, model, Model } from 'mongoose';
import { ICharacter } from '../interfaces/characterInterface.js';

const talentSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String },
    desc: { type: String, default: '' },
    icon: { type: String },
    attributes: [{
        key: { type: String },
        values: [{ type: String }]
    }]
}, { _id: false });

const constellationSchema = new Schema({
    level: { type: Number, required: true },
    name: { type: String, required: true },
    desc: { type: String, default: '' },
    icon: { type: String }
}, { _id: false });

const storySchema = new Schema({
    title: { type: String, required: true },
    desc: { type: String, required: true }
}, { _id: false });

const voiceLineSchema = new Schema({
    title: { type: String, required: true },
    desc: { type: String, default: '' },
    audios: {
        en: { type: String },
        jp: { type: String },
        cn: { type: String },
        kr: { type: String }
    }
}, { _id: false });

const characterSchema = new Schema<ICharacter>({
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
    vision: {
        type: String,
        default: 'N/A'
    },
    weapon: {
        type: String,
        default: 'Sword'
    },
    versionRelease: {
        type: Number,
        default: 1.0
    },
    birthday: {
        type: String,
        default: 'N/A'
    },
    model: {
        type: String,
        default: 'N/A'
    },
    title: {
        type: [String],
        default: []
    },
    constellation: {
        type: String,
        default: 'N/A'
    },
    region: {
        type: [String],
        default: []
    },
    affiliation: {
        type: [String],
        default: []
    },
    cv: {
        en: { type: String },
        jp: { type: String },
        cn: { type: String },
        kr: { type: String }
    },
    images: {
        profile: { type: String },
        gacha: { type: String },
        card: { type: String },
        icon: { type: String },
        header: { type: String }
    },
    wikiUrl: {
        type: String
    },
    entryId: {
        type: Schema.Types.Mixed
    },
    talents: [talentSchema],
    constellations: [constellationSchema],
    stories: [storySchema],
    voiceLines: [voiceLineSchema],
    skin: {
        title: { type: String },
        profile: { type: String },
        gacha: { type: String }
    }
}, {
    timestamps: true
});

const Character: Model<ICharacter> = model<ICharacter>('Character', characterSchema);

export default Character;
