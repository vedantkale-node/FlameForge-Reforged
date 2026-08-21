import { Schema, model, Model } from "mongoose";
import { IArtifact } from "../interfaces/artifactInterface.js";

const pieceSchema = new Schema({
    title: { type: String, default: '' },
    piece: { type: String, default: '' },
    icon: { type: String, default: '' },
    desc: { type: String, default: '' }
}, { _id: false });

const artifactSchema = new Schema<IArtifact>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    rarity: {
        type: [Number],
        default: [4, 5]
    },
    effect: {
        twoPc: { type: String, default: 'N/A' },
        fourPc: { type: String, default: 'N/A' },
        onePc: { type: String }
    },
    fullSet: {
        flower: pieceSchema,
        sands: pieceSchema,
        plume: pieceSchema,
        circlet: pieceSchema,
        goblet: pieceSchema
    },
    wikiUrl: {
        type: String
    },
    entryId: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

const Artifact: Model<IArtifact> = model<IArtifact>("Artifact", artifactSchema);

export default Artifact;
