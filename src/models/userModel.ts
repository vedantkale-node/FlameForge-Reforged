import { Schema, model } from "mongoose";
import { IUser } from '../interfaces/userInterface.js';

const userSchema = new Schema<IUser>({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "moderator", "user"],
        default: "user"
    },
    verified: {
        type: Boolean,
        default: false,
    },
    token: {
        type: String,
        required: true,
    },
    isTokenUsed: {
        type: Boolean,
        default: false,
    },
    profilePic: {
        type: String,
        default: '/assets/images/pfp/diluc_skin.webp'
    },
    namecard: {
        type: String,
        default: '/assets/images/namecards/diluc.webp'
    },
    signature: {
        type: String,
        default: 'The Dark Side of Dawn'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

const User = model("User", userSchema);

export default User;
