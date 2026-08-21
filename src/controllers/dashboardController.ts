import { Request, Response } from "express";
import User from '../models/userModel.js';
import Character from "../models/characterModel.js";
import Weapon from "../models/weaponModel.js";
import Artifact from "../models/artifactModel.js";
import { validationResult } from "express-validator";
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { __dirname } from "../app.js";
import { logger } from "../helpers/logger.js";
import Setting from "../models/settingsModel.js";
import cloudinary from 'cloudinary';
import { compare, hash } from 'bcrypt';
import {
    scrapeCharacter,
    scrapeWeapon,
    scrapeArtifact,
    syncAllCharacters,
    syncAllWeapons,
    syncAllArtifacts,
    syncEntireUniverse
} from "../scraper/hoyowikiEngine.js";
import { getAllHoyowikiAvatars, getAllHoyowikiNamecards } from "../helpers/hoyoAssetFetcher.js";

const getDashboard = async (req: Request, res: Response) => {
    if (req.session && req.session.user) {

        try {
            const users = await User.find().select('-password -token -__v').lean();
            const characters = await Character.find().lean();
            const characterCount = await Character.countDocuments();
            const weapons = await Weapon.find().lean();
            const weaponCount = await Weapon.countDocuments();
            const artifacts = await Artifact.find().lean();
            const artifactCount = await Artifact.countDocuments();
            const settings = await Setting.findOne({ settingType: 'global' }).lean()
            const userId = req.session.uid;
            const loggedUser = await User.findById(userId).lean();
            if (!loggedUser) {
                logger.error(`User: ${req.session.user}, Error no logged user!`);
                res.status(500).render('500', {
                    title: "Internal Server Error!",
                });
            }
            const locals = {
                title: 'Dashboard',
                desc: 'Dashboard for FlameForge API',
                users: users,
                characters: characters,
                weapons: weapons,
                artifacts: artifacts,
                messages: req.flash(),
                user: req.session.user,
                role: req.session.role,
                loggedUser: loggedUser,
                characterCount,
                weaponCount,
                artifactCount,
                settings

            }
            return res.render('dashboard', locals);

        } catch (error) {
            logger.error(`User: ${req.session.user}, Error occured on dashboard page: ${error}`);
            console.log(error);
            return res.status(500).render('500', {
                title: "Internal Server Error!",
            });
        }
    }
    res.redirect('/sign-in');
}

const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sessionUid = req.session?.uid;
        const sessionRole = req.session?.role;

        // IDOR Prevention: Only account owner or admin can delete
        if (!sessionUid || (sessionUid !== id && sessionRole !== 'admin')) {
            logger.warn(`Security alert: User ${req.session?.user} (ID: ${sessionUid}) attempted unauthorized deletion of User ID: ${id}`);
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to delete this account.' });
            }
            req.flash('error', 'Unauthorized action!');
            return res.status(403).redirect('/dashboard');
        }

        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(404).json({ success: false, error: 'User does not exist or was already deleted.' });
            }
            req.flash('error', 'User does not exist!');
            return res.status(404).redirect('/dashboard');
        }

        logger.info(`User account @${deletedUser.username} (ID: ${id}) was deleted by ${req.session?.user}`);

        // If self-deletion, destroy session and clear cookie
        if (sessionUid === id) {
            req.session.destroy((err) => {
                if (err) logger.warn(`Session destruction error after account deletion: ${err}`);
                res.clearCookie('connect.sid');
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
                }
                return res.status(200).redirect('/sign-in');
            });
            return;
        }

        // If admin deleted another user
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
        }
        req.flash('success', 'Account Deleted Successfully!');
        return res.status(200).redirect('/dashboard');
    } catch (error) {
        logger.error(`Error deleting user account: ${error}`);
        console.error(error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Internal server error while deleting account.' });
        }
        return res.status(500).render('500', {
            title: "Internal Server Error!",
        });  
    }
};

const deleteUserByAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (req.session.uid === id) {
            req.flash('error', 'You cannot delete your own admin account from the directory!');
            return res.status(400).redirect('/dashboard');
        }
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            req.flash('error', 'User not found or already deleted!');
            return res.status(404).redirect('/dashboard');
        }
        logger.info(`Admin ${req.session.user} deleted user ${deletedUser.username}`);
        req.flash('success', `User @${deletedUser.username} was permanently deleted.`);
        return res.status(200).redirect('/dashboard');
    } catch (error) {
        logger.error(`Error deleting user by admin: ${error}`);
        req.flash('error', 'Failed to delete user.');
        return res.status(500).redirect('/dashboard');
    }
};

const updateUserBasic = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, role } = req.body;
        
        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
            req.flash('error', 'User not found!');
            return res.status(404).redirect('/dashboard');
        }

        if (firstName) userToUpdate.firstName = firstName.trim();
        if (lastName) userToUpdate.lastName = lastName.trim();
        if (role && ['admin', 'moderator', 'user'].includes(role)) {
            userToUpdate.role = role;
        }

        await userToUpdate.save();
        logger.info(`Admin ${req.session.user} updated basic info for user ${userToUpdate.username}`);
        req.flash('success', `Updated basic info for @${userToUpdate.username}!`);
        return res.status(200).redirect('/dashboard');
    } catch (error) {
        logger.error(`Error updating user basic info: ${error}`);
        req.flash('error', 'Failed to update user basic info.');
        return res.status(500).redirect('/dashboard');
    }
};

const uploadCharacterFile = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            req.flash('error', 'no files selected!');
            return res.status(301).redirect('/dashboard')
        }
            let uploadedData;
            try {
                uploadedData = JSON.parse(req.file.buffer.toString());
            } catch (jsonError) {
                req.flash('error', 'JSON Syntax Error!');
                return res.status(301).redirect('/dashboard');
            }
            for (const object of uploadedData) {
                const document = new Character(object);
                try {
                    await document.validate();
                } catch (validationError: any) {
                    const filedsToCheck = ['name', 'birthday', 'constellation', 'title', 'vision', 'affiliation', 'versionRelease', 'images', 'desc', 'wikiUrl', 'rarity', 'weapon', 'region', 'images.gacha', 'images.card', 'images.profile'];
                    filedsToCheck.forEach(field => {
                        if (validationError.errors[field]) {
                            req.flash('error', `Invalid ${field.charAt(0).toUpperCase() + field.slice(1)}!`);
                            return res.redirect('/dashboard');
                        }
                    })
                    req.flash('error', 'Please Provide Valid Data!');
                    return res.status(301).redirect('/dashboard');
                }
                const result = await document.save();
                if (!result) {
                    logger.error(`User: ${req.session.user}, Error occured while saving the character`);
                    req.flash('error', 'An Error Occured While Saving the Data!');
                    return res.status(301).redirect('/dashboard');
                }
            }
            req.flash("success", "Data uploaded successfully")
            res.status(301).redirect('/dashboard');
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while uploading character: ${error}`);
        console.log(error);
        if (error instanceof TypeError && error.message.includes('not iterable')) {
            req.flash('error', 'Please provide the file as an array by wrapping the JSON data in square brackets.')
            return res.redirect('/dashboard');
        }
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
};

const uploadImage = async (req: Request, res: Response) => {
    try {
        const url = req.body.characterImage?.trim();
        const uploadImageCategory = req.body.uploadType;
        
        if (!url) {
            req.flash('error', 'Image URL is required!');
            return res.redirect('/dashboard');
        }

        // Validate URL format and prevent SSRF to localhost or internal network IPs
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                req.flash('error', 'Only HTTP/HTTPS URLs are allowed for image upload.');
                return res.redirect('/dashboard');
            }
            const host = parsedUrl.hostname.toLowerCase();
            if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('169.254.') || host.endsWith('.local') || host === '::1') {
                logger.warn(`SSRF Blocked: User ${req.session.user} attempted to upload image from internal host ${host}`);
                req.flash('error', 'Uploading images from private/internal network addresses is prohibited.');
                return res.redirect('/dashboard');
            }
        } catch {
            req.flash('error', 'Invalid Image URL format provided!');
            return res.redirect('/dashboard');
        }

        if (!uploadImageCategory || !['character', 'weapon', 'artifact'].includes(uploadImageCategory)) {
            logger.warn(`User ${req.session.user} provided invalid category for image upload: ${uploadImageCategory}`);
            req.flash('error', 'Invalid category selected!');
            return res.redirect('/dashboard');
        }
        
        const folder = `FlameForge/${uploadImageCategory}s`;
        const publicId = `${uploadImageCategory}_${Date.now()}`;
        const options = {
            public_id: publicId,
            folder: folder,
            resource_type: 'image' as const
        };
        const result = await cloudinary.v2.uploader.upload(url, options);
        logger.info(`Moderator ${req.session.user} uploaded ${uploadImageCategory} image: ${result.secure_url}`);
        req.flash('success', 'Image Uploaded Successfully to Cloudinary!');
        req.flash('link', result.secure_url || result.url);
        return res.redirect('/dashboard');
    } catch (error: any) {    
        if (error.http_code == '404' || error.http_code) {
            logger.error(`User: ${req.session.user}, uploaded invalid image link: ${error}`);
            req.flash('error', 'Invalid Image Link or image could not be fetched by Cloudinary!');
            return res.redirect('/dashboard');
        }
        logger.error(`User: ${req.session.user}, Error occurred while uploading image: ${error}`);
        console.error(error);
        req.flash('error', 'Cloudinary upload failed. Please verify credentials and URL.');
        return res.redirect('/dashboard');
    }
};

const uploadWeaponFile = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            req.flash('error', 'no files selected!');
            return res.status(301).redirect('/dashboard')
        }
            let uploadedData;
            try {
                uploadedData = JSON.parse(req.file.buffer.toString());
            } catch (jsonError) {
                req.flash('error', 'JSON Syntax Error!');
                return res.status(301).redirect('/dashboard');
            }
            for (const object of uploadedData) {
                const document = new Weapon(object);
                try {
                    await document.validate();
                } catch (validationError: any) {
                    const filedsToCheck = ['name', 'desc', 'rarity', 'source', 'passive', 'versionRelease', 'region', 'family', 'wikiUrl', 'affix', 'baseAtk', 'baseSubStat', 'images', 'images.icon', 'images.original', 'images.awakened', 'images.gacha'];
                    filedsToCheck.forEach(field => {
                        if (validationError.errors[field]) {
                            req.flash('error', `Invalid ${field.charAt(0).toUpperCase() + field.slice(1)}!`);
                            return res.redirect('/dashboard');
                        }
                    })
                    req.flash('error', 'Please Provide Valid Data!');
                    return res.status(301).redirect('/dashboard');
                }
                const result = await document.save();
                if (!result) {
                    logger.error(`User: ${req.session.user}, Error occured while saving the weapon`);
                    req.flash('error', 'An Error Occured While Saving the Data!');
                    return res.status(301).redirect('/dashboard');
                }
            }
            req.flash("success", "Data uploaded successfully")
            res.status(301).redirect('/dashboard');
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while uploading weapon: ${error}`);
        if (error instanceof TypeError && error.message.includes('not iterable')) {
            req.flash('error', 'Please provide the file as an array by wrapping the JSON data in square brackets.')
            return res.redirect('/dashboard');
        }
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
};

const uploadArtifactFile = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            req.flash('error', 'no files selected!');
            return res.status(301).redirect('/dashboard')
        }
            let uploadedData;
            try {
                uploadedData = JSON.parse(req.file.buffer.toString());
            } catch (jsonError) {
                req.flash('error', 'JSON Syntax Error!');
                return res.status(301).redirect('/dashboard');
            }
            for (const object of uploadedData) {
                const document = new Artifact(object);
                try {
                    await document.validate();
                } catch (validationError: any) {
                    const filedsToCheck = ['name', 'effect', 'effect.twoPc', 'effect.fourPc', 'fullSet', 'fullSet.flower', 'fullSet.flower.title', 'fullSet.flower.piece', 'fullSet.flower.icon', 'fullSet.sands', 'fullSet.sands.title', 'fullSet.sands.piece', 'fullSet.sands.icon', 'fullSet.plume', 'fullSet.plume.title', 'fullSet.plume.piece', 'fullSet.plume.icon', 'fullSet.circlet', 'fullSet.circlet.title', 'fullSet.circlet.piece', 'fullSet.circlet.icon', 'fullSet.goblet', 'fullSet.goblet.title', 'fullSet.goblet.piece', 'fullSet.goblet.icon'];
                    filedsToCheck.forEach(field => {
                        if (validationError.errors[field]) {
                            req.flash('error', `Invalid ${field.charAt(0).toUpperCase() + field.slice(1)}!`);
                            return res.redirect('/dashboard');
                        }
                    })
                    req.flash('error', 'Please Provide Valid Data!');
                    return res.status(301).redirect('/dashboard');
                }
                const result = await document.save();
                if (!result) {
                    logger.error(`User: ${req.session.user}, Error occured while saving the artifact`);
                    req.flash('error', 'An Error Occured While Saving the Data!');
                    return res.status(301).redirect('/dashboard');
                }
            }
            req.flash("success", "Data uploaded successfully")
            res.status(301).redirect('/dashboard');
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while uploading artifact page: ${error}`);
        if (error instanceof TypeError && error.message.includes('not iterable')) {
            req.flash('error', 'Please provide the file as an array by wrapping the JSON data in square brackets.')
            return res.redirect('/dashboard');
        }
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
};

const logoutUser = (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
        logger.error(`User: ${req.session.user}, Error occured on editing artifact page: ${err}`);
        console.log(err);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
        }
        else {
            res.status(301).redirect('/sign-in');
        }
    });
}

const editCharacter = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const character = await Character.findById(id).select('-__v').lean();
            if (!character) {
                req.flash('error', 'Invalid Character id or Character not found!');
                return res.status(301).redirect('/');
            }
            const characterName = character.name;
            const locals = {
                title: characterName,
                character: character,
                messages: req.flash()
            }
            res.render('editCharacter', locals);
        }
        else {
            logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
            return res.status(401).render('401', {
            title: "Unauthorized",
            });
        }
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured on editing character page: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const editWeapon = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const weapon = await Weapon.findById(id).select('-__v').lean();
            if (!weapon) {
                req.flash('error', 'Invalid Weapon id or Weapon not found!');
                return res.status(301).redirect('/');
            }
            const weaponName = weapon.name;
            const locals = {
                title: weaponName,
                weapon: weapon,
                messages: req.flash()
            }
            res.render('editWeapon', locals);
        }
        else {
            logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
            return res.status(401).render('401', {
            title: "Unauthorized",
            });
        }
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured on editing weapon page: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const editArtifact = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const artifact = await Artifact.findById(id).select('-__v').lean();
            if (!artifact) {
                req.flash('error', 'Invalid Artifact id or Artifact not found!');
                return res.status(301).redirect('/');
            }
            const artifactName = artifact.name;
            const locals = {
                title: artifactName,
                artifact: artifact,
                messages: req.flash()
            }
            res.render('editArtifact', locals);
        }
        else {
            logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
            return res.status(401).render('401', {
            title: "Unauthorized",
            });
        }
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured on editing artifact page: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const saveCharacter = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const errorOne = errors.array()[0].msg;
                req.flash('error', errorOne);
                return res.redirect(`/dashboard/character/edit/${id}`);
            }

            const existingCharacter = await Character.findById(id);
            if (!existingCharacter) {
                req.flash('error', 'Character not found!');
                return res.status(404).redirect('/dashboard');
            }

            const {
                name, birthday, vr, model, rarity, desc, vision, weapon,
                region, imgProfile, imgCard, imgGacha, wikiUrl, constellation,
                title, affiliation, cv_en, cv_jp, cv_cn, cv_kr
            } = req.body;

            if (name) existingCharacter.name = name.trim();
            if (birthday !== undefined) existingCharacter.birthday = birthday.trim();
            if (desc !== undefined) existingCharacter.desc = desc.trim();
            if (rarity) existingCharacter.rarity = parseInt(rarity, 10) || 5;
            if (vision) existingCharacter.vision = vision.trim();
            if (weapon) existingCharacter.weapon = weapon.trim();
            if (model !== undefined) existingCharacter.model = model.trim();
            if (constellation !== undefined) existingCharacter.constellation = constellation.trim();
            if (wikiUrl !== undefined) existingCharacter.wikiUrl = wikiUrl.trim();
            if (vr !== undefined) existingCharacter.versionRelease = parseFloat(vr) || 1.0;

            if (title !== undefined) {
                existingCharacter.title = Array.isArray(title) ? title : (title ? title.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
            }
            if (affiliation !== undefined) {
                existingCharacter.affiliation = Array.isArray(affiliation) ? affiliation : (affiliation ? affiliation.split(',').map((a: string) => a.trim()).filter(Boolean) : []);
            }
            if (region !== undefined) {
                existingCharacter.region = Array.isArray(region) ? region : (region ? region.split(',').map((r: string) => r.trim()).filter(Boolean) : []);
            }

            if (!existingCharacter.cv) existingCharacter.cv = {};
            if (cv_en !== undefined) existingCharacter.cv.en = cv_en.trim();
            if (cv_jp !== undefined) existingCharacter.cv.jp = cv_jp.trim();
            if (cv_cn !== undefined) existingCharacter.cv.cn = cv_cn.trim();
            if (cv_kr !== undefined) existingCharacter.cv.kr = cv_kr.trim();

            if (!existingCharacter.images) existingCharacter.images = {};
            if (imgProfile) existingCharacter.images.profile = imgProfile.trim();
            if (imgGacha) existingCharacter.images.gacha = imgGacha.trim();
            if (imgCard) existingCharacter.images.card = imgCard.trim();

            await existingCharacter.save();
            logger.info(`Admin ${req.session.user} updated character ${existingCharacter.name}`);
            req.flash('success', `Character "${existingCharacter.name}" updated successfully!`);
            return res.redirect('/dashboard');
        } else {
            return res.status(401).render('401', { title: "Unauthorized" });
        }
    } catch (error) {
        logger.error(`Error saving character: ${error}`);
        req.flash('error', 'Error occurred while saving character.');
        return res.redirect('/dashboard');
    }
};

const saveWeapon = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session && req.session.role === 'admin') {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const errorOne = errors.array()[0].msg;
                req.flash('error', errorOne);
                return res.redirect(`/dashboard/weapon/edit/${id}`);
            }

            const existingWeapon = await Weapon.findById(id);
            if (!existingWeapon) {
                req.flash('error', 'Weapon not found!');
                return res.status(404).redirect('/dashboard');
            }

            const {
                name, vr, baseAtk, subStatType, baseSubStat, source,
                desc, affix, passive, region, family, icon, original,
                gacha, awakened, wikiUrl, rarity
            } = req.body;

            if (name) existingWeapon.name = name.trim();
            if (family) existingWeapon.family = family.trim();
            if (rarity) existingWeapon.rarity = parseInt(rarity, 10) || 4;
            if (baseAtk !== undefined) existingWeapon.baseAtk = parseFloat(baseAtk) || 0;
            if (subStatType !== undefined) existingWeapon.subStatType = subStatType.trim();
            if (baseSubStat !== undefined) existingWeapon.baseSubStat = baseSubStat.trim();
            if (affix !== undefined) existingWeapon.affix = affix.trim();
            if (passive !== undefined) existingWeapon.passive = passive.trim();
            if (region !== undefined) existingWeapon.region = region.trim();
            if (desc !== undefined) existingWeapon.desc = desc.trim();
            if (wikiUrl !== undefined) existingWeapon.wikiUrl = wikiUrl.trim();
            if (vr !== undefined) existingWeapon.versionRelease = parseFloat(vr) || 1.0;

            if (source !== undefined) {
                existingWeapon.source = Array.isArray(source) ? source : (source ? source.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
            }

            if (!existingWeapon.images) existingWeapon.images = {};
            if (icon) existingWeapon.images.icon = icon.trim();
            if (original) existingWeapon.images.original = original.trim();
            if (awakened) existingWeapon.images.awakened = awakened.trim();
            if (gacha) existingWeapon.images.gacha = gacha.trim();

            await existingWeapon.save();
            logger.info(`Admin ${req.session.user} updated weapon ${existingWeapon.name}`);
            req.flash('success', `Weapon "${existingWeapon.name}" updated successfully!`);
            return res.redirect('/dashboard');
        } else {
            return res.status(401).render('401', { title: "Unauthorized" });
        }
    } catch (error) {
        logger.error(`Error saving weapon: ${error}`);
        req.flash('error', 'Error occurred while saving weapon.');
        return res.redirect('/dashboard');
    }
};

const saveArtifact = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const errorOne = errors.array()[0].msg;
                req.flash('error', errorOne);
                return res.redirect(`/dashboard/artifact/edit/${id}`);
            }

            const existingArtifact = await Artifact.findById(id);
            if (!existingArtifact) {
                req.flash('error', 'Artifact set not found!');
                return res.status(404).redirect('/dashboard');
            }

            const {
                name, wikiUrl, twoPc, fourPc,
                flowerTitle, flowerPiece, flowerIcon,
                plumeTitle, plumePiece, plumeIcon,
                sandsTitle, sandsPiece, sandsIcon,
                gobletTitle, gobletPiece, gobletIcon,
                circletTitle, circletPiece, circletIcon
            } = req.body;

            if (name) existingArtifact.name = name.trim();
            if (wikiUrl !== undefined) existingArtifact.wikiUrl = wikiUrl.trim();

            if (!existingArtifact.effect) existingArtifact.effect = { twoPc: '', fourPc: '' };
            if (twoPc !== undefined) existingArtifact.effect.twoPc = twoPc.trim();
            if (fourPc !== undefined) existingArtifact.effect.fourPc = fourPc.trim();

            if (!existingArtifact.fullSet) existingArtifact.fullSet = {};
            if (!existingArtifact.fullSet.flower) existingArtifact.fullSet.flower = { title: '', piece: '', icon: '', desc: '' };
            if (!existingArtifact.fullSet.plume) existingArtifact.fullSet.plume = { title: '', piece: '', icon: '', desc: '' };
            if (!existingArtifact.fullSet.sands) existingArtifact.fullSet.sands = { title: '', piece: '', icon: '', desc: '' };
            if (!existingArtifact.fullSet.goblet) existingArtifact.fullSet.goblet = { title: '', piece: '', icon: '', desc: '' };
            if (!existingArtifact.fullSet.circlet) existingArtifact.fullSet.circlet = { title: '', piece: '', icon: '', desc: '' };

            if (flowerTitle !== undefined) existingArtifact.fullSet.flower.title = flowerTitle.trim();
            if (flowerPiece !== undefined) existingArtifact.fullSet.flower.piece = flowerPiece.trim();
            if (flowerIcon !== undefined) existingArtifact.fullSet.flower.icon = flowerIcon.trim();

            if (plumeTitle !== undefined) existingArtifact.fullSet.plume.title = plumeTitle.trim();
            if (plumePiece !== undefined) existingArtifact.fullSet.plume.piece = plumePiece.trim();
            if (plumeIcon !== undefined) existingArtifact.fullSet.plume.icon = plumeIcon.trim();

            if (sandsTitle !== undefined) existingArtifact.fullSet.sands.title = sandsTitle.trim();
            if (sandsPiece !== undefined) existingArtifact.fullSet.sands.piece = sandsPiece.trim();
            if (sandsIcon !== undefined) existingArtifact.fullSet.sands.icon = sandsIcon.trim();

            if (gobletTitle !== undefined) existingArtifact.fullSet.goblet.title = gobletTitle.trim();
            if (gobletPiece !== undefined) existingArtifact.fullSet.goblet.piece = gobletPiece.trim();
            if (gobletIcon !== undefined) existingArtifact.fullSet.goblet.icon = gobletIcon.trim();

            if (circletTitle !== undefined) existingArtifact.fullSet.circlet.title = circletTitle.trim();
            if (circletPiece !== undefined) existingArtifact.fullSet.circlet.piece = circletPiece.trim();
            if (circletIcon !== undefined) existingArtifact.fullSet.circlet.icon = circletIcon.trim();

            await existingArtifact.save();
            logger.info(`Admin ${req.session.user} updated artifact ${existingArtifact.name}`);
            req.flash('success', `Artifact set "${existingArtifact.name}" updated successfully!`);
            return res.redirect('/dashboard');
        } else {
            return res.status(401).render('401', { title: "Unauthorized" });
        }
    } catch (error) {
        logger.error(`Error saving artifact: ${error}`);
        req.flash('error', 'Error occurred while saving artifact.');
        return res.redirect('/dashboard');
    }
};

const deleteCharacter = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const deletedCharacter = await Character.findByIdAndRemove(id);
            if (!deletedCharacter) {
                return res.status(404).render('404', {
                    title: "Not Found!",
                });
            }
                req.flash('success', 'Character Deleted Successfully');
                return res.status(301).redirect('/dashboard');
        }
        logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
        return res.status(401).render('401', {
            title: "Unauthorized",
        });
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while deleting the character: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const deleteWeapon = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const deletedWeapon = await Weapon.findByIdAndRemove(id);
            if (!deletedWeapon) {
                return res.status(500).render('404', {
                    title: "Not Found!",
                });
            }
                req.flash('success', 'Weapon Deleted Successfully');
                return res.status(301).redirect('/dashboard');
        }
        logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
        return res.status(401).render('401', {
            title: "Unauthorized",
        });
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while deleting the weapons: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const deleteArtifact = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.session.user && req.session.role === 'admin') {
            const deletedArtifact = await Artifact.findByIdAndRemove(id);
            if(!deletedArtifact) {
                return res.status(404).render('404', {
                    title: "Not Found!",
                });
            }
                req.flash('success', 'Artifact Deleted Successfully');
                return res.status(301).redirect('/dashboard');
        }
        logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
        return res.status(401).render('401', {
            title: "Unauthorized",
        });
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while deleting the artifact: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const downloadCharacters = async (req: Request, res: Response) => {
    try {
        if (req.session.user && req.session.role === 'admin') {

            const characters = await Character.find().select('-_id -__v');
            if (!characters) {
                return res.status(404).render('404', {
                    title: "Not Found!"
                }); 
            }
            const filename = `character_data_${Date.now()}.json`;
            const filePath = join(__dirname, '..', 'downloads', filename);

            writeFileSync(filePath, JSON.stringify(characters, null, 2));

            res.download(filePath, filename, (err) => {
                logger.silly(`User ${req.session.user} as ${req.session.role} exported characters`)
                unlinkSync(filePath);
                if (err) {
                    console.log(err);
                    res.status(500).render('500', {
                        title: "Internal Server Error!"
                    });
                }
            })
        }
        else {
            logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
            return res.status(401).render('401', {
                title: "Unauthorized"
            });
        }
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while exporting artifacts: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!"
        });
    }
}

const downloadWeapons = async (req: Request, res: Response) => {
    try {
        if (req.session.user && req.session.role === 'admin') {

            const weapons = await Weapon.find().select('-_id -__v');
            if (!weapons) {
                return res.status(404).render('404', {
                    title: "Not Found!"
                }); 
            }
            const filename = `weapon_data_${Date.now()}.json`;
            const filePath = join(__dirname, '..', 'downloads', filename);

            writeFileSync(filePath, JSON.stringify(weapons, null, 2));

            res.download(filePath, filename, (err) => {
                logger.silly(`User ${req.session.user} as ${req.session.role} exported weapons`)
                unlinkSync(filePath);
                if (err) {
                    console.log(err);
                    res.status(500).render('500', {
                        title: "Internal Server Error!"
                    });
                }
            });
        }
        else {
            logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
            return res.status(401).render('401', {
                title: "Unauthorized"
            });
        }
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while exporting weapons: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!"
        });
    }
}

const downloadArtifacts = async (req: Request, res: Response) => {
    try {
        if (req.session.user && req.session.role === 'admin') {
            const artifacts = await Artifact.find().select('-_id -__v');
            if (!artifacts) {
                return res.status(404).render('404', {
                    title: "Not Found!"
                }); 
            }
            const filename = `artifact_data_${Date.now()}.json`;
            const filePath = join(__dirname, '..', 'downloads', filename);

            writeFileSync(filePath, JSON.stringify(artifacts, null, 2));

            res.download(filePath, filename, (err) => {
                logger.silly(`User: ${req.session.user} as ${req.session.role} exported artifacts`)
                unlinkSync(filePath);
                if (err) {
                    console.log(err);
                    res.status(500).render('500', {
                        title: "Internal Server Error!"
                    });
                }
            });
        }
        else {
            logger.silly(`User: ${req.session.user}, Attempt unauthorized access to ${req.url}`);
            return res.status(401).render('401', {
                title: "Unauthorized"
            });
        }
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while exporting artifacts: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!"
        });
    }
}

const previewScraperData = async (req: Request, res: Response) => {
    try {
        const { urlOrId, category } = req.body;
        if (!urlOrId) {
            return res.status(400).json({ success: false, error: 'Please provide a HoYoWiki URL or Entry ID' });
        }
        const match = String(urlOrId).match(/\d+/);
        const entryId = match ? match[0] : String(urlOrId).trim();

        let data: any = null;
        if (category === 'weapon') {
            data = await scrapeWeapon(entryId);
        } else if (category === 'artifact') {
            data = await scrapeArtifact(entryId);
        } else {
            data = await scrapeCharacter(entryId);
        }

        return res.json({ success: true, data });
    } catch (err: any) {
        logger.error(`Scraper preview error: ${err.message}`);
        const statusCode = err.message?.includes('Category Mismatch') ? 400 : 500;
        return res.status(statusCode).json({ success: false, error: err.message || 'Failed to scrape entry from HoYoWiki' });
    }
};

const syncSingleScraperData = async (req: Request, res: Response) => {
    try {
        const { urlOrId, category, uploadToCloudinary: doUpload } = req.body;
        if (!urlOrId) {
            return res.status(400).json({ success: false, error: 'Please provide a HoYoWiki URL or Entry ID' });
        }
        const match = String(urlOrId).match(/\d+/);
        const entryId = match ? match[0] : String(urlOrId).trim();
        const options = { uploadImages: Boolean(doUpload) };

        let result: any = null;
        if (category === 'weapon') {
            const weaponData = await scrapeWeapon(entryId, options);
            const exists = await Weapon.findOne({ name: weaponData.name });
            if (exists) {
                return res.status(400).json({
                    success: false,
                    error: `"${weaponData.name}" already exists in the database!`
                });
            }
            result = await Weapon.create(weaponData);
        } else if (category === 'artifact') {
            const artifactData = await scrapeArtifact(entryId, options);
            const exists = await Artifact.findOne({ name: artifactData.name });
            if (exists) {
                return res.status(400).json({
                    success: false,
                    error: `"${artifactData.name}" already exists in the database!`
                });
            }
            result = await Artifact.create(artifactData);
        } else {
            const charData = await scrapeCharacter(entryId, options);
            const exists = await Character.findOne({ name: charData.name });
            if (exists) {
                return res.status(400).json({
                    success: false,
                    error: `"${charData.name}" already exists in the database!`
                });
            }
            result = await Character.create(charData);
        }

        logger.info(`User ${req.session.user} synced ${category} "${result.name}" from HoYoWiki`);
        return res.json({ success: true, message: `Successfully synced "${result.name}" to MongoDB!`, data: result });
    } catch (err: any) {
        logger.error(`Scraper sync error: ${err.message}`);
        const statusCode = (err.message?.includes('Category Mismatch') || err.message?.includes('already exists')) ? 400 : 500;
        return res.status(statusCode).json({ success: false, error: err.message || 'Failed to sync entry to database' });
    }
};

// Concurrency Lock for Scraper Batch Operations
let isScraperSyncActive = false;
let activeSyncCategory = '';
let syncStartedAt: number | null = null;

const syncCategoryScraperData = async (req: Request, res: Response) => {
    const { category, uploadToCloudinary: doUpload } = req.body;

    // Check lock with 15-minute auto-expiry safety
    if (isScraperSyncActive && syncStartedAt && Date.now() - syncStartedAt < 15 * 60 * 1000) {
        logger.warn(`Rejected concurrent scraper sync: category "${category}" requested while "${activeSyncCategory}" is running.`);
        return res.status(409).json({
            success: false,
            error: `A synchronization job for "${activeSyncCategory}" is already actively running. Please wait for it to complete.`
        });
    }

    isScraperSyncActive = true;
    activeSyncCategory = category || 'universe';
    syncStartedAt = Date.now();

    try {
        const options = { uploadImages: Boolean(doUpload) };
        let count = 0;

        if (category === 'characters') {
            count = await syncAllCharacters(undefined, options);
        } else if (category === 'weapons') {
            count = await syncAllWeapons(undefined, options);
        } else if (category === 'artifacts') {
            count = await syncAllArtifacts(undefined, options);
        } else if (category === 'all') {
            const uni = await syncEntireUniverse(options);
            return res.json({
                success: true,
                message: `Successfully synchronized entire universe! (${uni.characters} Characters, ${uni.weapons} Weapons, ${uni.artifacts} Artifacts)`,
                counts: uni
            });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid scraper category specified.' });
        }

        return res.json({
            success: true,
            message: `Successfully synchronized ${count} ${category} from HoYoWiki to database!`,
            count
        });
    } catch (err: any) {
        logger.error(`Scraper category sync error: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message || 'Failed to sync category from HoYoWiki' });
    } finally {
        isScraperSyncActive = false;
        activeSyncCategory = '';
        syncStartedAt = null;
    }
};

const getEntityDetail = async (req: Request, res: Response) => {
    try {
        const { category, id } = req.params;
        let data: any = null;
        if (category === 'character') {
            data = await Character.findById(id).lean();
        } else if (category === 'weapon') {
            data = await Weapon.findById(id).lean();
        } else if (category === 'artifact') {
            data = await Artifact.findById(id).lean();
        }

        if (!data) {
            return res.status(404).json({ success: false, error: 'Entity not found in database' });
        }
        return res.json({ success: true, data });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message || 'Failed to fetch entity details' });
    }
};

const getAvatarsApi = async (req: Request, res: Response) => {
    try {
        const avatars = await getAllHoyowikiAvatars();
        return res.json({ success: true, count: avatars.length, data: avatars });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

const getNamecardsApi = async (req: Request, res: Response) => {
    try {
        const namecards = await getAllHoyowikiNamecards();
        return res.json({ success: true, count: namecards.length, data: namecards });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

const getProfilePage = async (req: Request, res: Response) => {
    try {
        const userId = req.session.uid;
        const loggedUser = await User.findById(userId).lean();
        if (!loggedUser) {
            req.flash('error', 'User not found');
            return res.redirect('/sign-in');
        }

        const avatars = await getAllHoyowikiAvatars();
        const namecards = await getAllHoyowikiNamecards();

        return res.render('profile', {
            title: 'Edit Profile - FlameForge Reforged',
            loggedUser,
            user: req.session.user,
            role: req.session.role,
            avatars,
            namecards,
            messages: req.flash()
        });
    } catch (error) {
        logger.error(`Error loading profile page: ${error}`);
        return res.status(500).render('500', { title: 'Internal Server Error!' });
    }
};

const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.session.uid;
        const { firstName, lastName, email, username, currentPassword, newPassword, confirmPassword, profilePic, namecard, signature } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/sign-in');
        }

        const cleanEmail = email ? email.trim().toLowerCase() : undefined;
        const cleanUsername = username ? username.trim().toLowerCase() : undefined;
        const cleanFirstName = firstName ? firstName.trim() : undefined;
        const cleanLastName = lastName ? lastName.trim() : undefined;
        const cleanSignature = signature !== undefined ? String(signature).trim().slice(0, 150) : undefined;

        // Validate duplicates
        if (cleanEmail && cleanEmail !== user.email) {
            const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
            if (emailExists) {
                req.flash('error', 'Email already taken by another account!');
                return res.redirect('/dashboard/profile');
            }
            user.email = cleanEmail;
        }

        if (cleanUsername && cleanUsername !== user.username) {
            const usernameExists = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
            if (usernameExists) {
                req.flash('error', 'Username already taken!');
                return res.redirect('/dashboard/profile');
            }
            user.username = cleanUsername;
            req.session.user = cleanUsername;
        }

        if (cleanFirstName) user.firstName = cleanFirstName;
        if (cleanLastName) user.lastName = cleanLastName;
        if (profilePic) user.profilePic = profilePic.trim();
        if (namecard) user.namecard = namecard.trim();
        if (cleanSignature !== undefined) user.signature = cleanSignature;

        // Handle Password Update if requested
        if (newPassword && newPassword.trim() !== '') {
            if (!currentPassword) {
                req.flash('error', 'Please enter your current password to set a new password.');
                return res.redirect('/dashboard/profile');
            }
            const isMatch = await compare(currentPassword, user.password);
            if (!isMatch) {
                req.flash('error', 'Current password is incorrect.');
                return res.redirect('/dashboard/profile');
            }
            if (newPassword.length < 6) {
                req.flash('error', 'New password must be at least 6 characters.');
                return res.redirect('/dashboard/profile');
            }
            if (confirmPassword && newPassword !== confirmPassword) {
                req.flash('error', 'New passwords do not match.');
                return res.redirect('/dashboard/profile');
            }
            const hashed = await hash(newPassword, 10);
            user.password = hashed;
        }

        user.updatedAt = new Date();
        await user.save();

        req.flash('success', 'Profile updated successfully!');
        return res.redirect('/dashboard/profile');
    } catch (error) {
        logger.error(`Error updating profile: ${error}`);
        req.flash('error', 'An error occurred while updating your profile.');
        return res.redirect('/dashboard/profile');
    }
};

export {
    getDashboard,
    deleteUser,
    uploadCharacterFile,
    uploadWeaponFile,
    uploadArtifactFile,
    editCharacter,
    editWeapon,
    editArtifact,
    logoutUser,
    deleteCharacter,
    deleteWeapon,
    deleteArtifact,
    saveCharacter,
    saveWeapon,
    downloadCharacters,
    downloadWeapons,
    downloadArtifacts,
    saveArtifact,
    uploadImage,
    previewScraperData,
    syncSingleScraperData,
    syncCategoryScraperData,
    getEntityDetail,
    getProfilePage,
    updateProfile,
    getAvatarsApi,
    getNamecardsApi,
    deleteUserByAdmin,
    updateUserBasic
};