import { Document } from "mongoose";

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    role: string;
    verified: boolean;
    token: string;
    isTokenUsed: boolean;
    profilePic: string;
    namecard?: string;
    signature?: string;
    createdAt: Date;
    updatedAt: Date;
}