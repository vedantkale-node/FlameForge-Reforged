import { Request, Response } from "express";
import User from '../models/userModel.js';
import { validationResult } from 'express-validator';
import { hash } from 'bcrypt';
import sendEmail from "../helpers/mailer.js";
import { randomBytes } from 'crypto';
import Setting from "../models/settingsModel.js";
import { logger } from "../helpers/logger.js";

const saltRounds : number = 10;

const generateToken = () => {
    return randomBytes(20).toString('hex');
}

const registerPage = async (req: Request, res: Response) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    try {
        let allSett = await Setting.findOne({ settingType: 'global' });
        if (!allSett) {
            allSett = await Setting.create({ settingType: 'global', registerRoute: false });
        }
        if (allSett.registerRoute === false) {
            return res.status(401).render('401', {
                title: "Registration Disabled",
                heading: "Account Creation Disabled",
                message: "Account creation is currently disabled by the system administrator."
            });
        }
        logger.silly(`${req.ip} requested Registration Page`);
        return res.status(200).render('register', {
            title: "FlameForge Sign Up",
        });
    } catch (error) {
        logger.error(`Error occurred on register page: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const addUser = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    const { firstName, lastName, email, username, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanFirstName = (firstName || '').trim();
    const cleanLastName = (lastName || '').trim();

    const verificationToken : string = generateToken();
    const verificationLink : string = `${req.protocol}://${req.get('host')}/sign-up/verify?token=${verificationToken}`;
    
    if (!errors.isEmpty()) {
        const errorOne = errors.array()[0].msg;
        req.flash('error', errorOne);
        return res.redirect(`/sign-up`);
    }
    try {
        let allSett = await Setting.findOne({ settingType: 'global' });
        if (!allSett) {
            allSett = await Setting.create({ settingType: 'global', registerRoute: false });
        }
        if (allSett.registerRoute === false) {
            return res.status(401).render('401', {
                title: "Registration Disabled",
                heading: "Account Creation Disabled",
                message: "Account creation is currently disabled by the system administrator."
            });
        }

        const user = await User.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });
        if (user) {
            if (user.email === cleanEmail) {
                req.flash('error', 'Email Already Exists!');
                return res.redirect('/sign-up');
            }
            if (user.username === cleanUsername) {
                req.flash('error', 'Username Already Exists!');
                return res.redirect('/sign-up');
            }
        }
        
function escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

        try {
            const subject : string = 'FlameForge Email Verification';
            const escapedUsername = escapeHtml(cleanUsername);
            const mailBody : string = `
                <p>Thank you ${escapedUsername} for signing up. Please click the link below to verify your email address:</p>
                <p><a href="${verificationLink}">Verify Email</a></p>
                <p>If you didn't sign up for this service, you can safely ignore this email.</p>
                <p>Best regards,<br>FlameForge Team</p>`;
            await sendEmail(cleanEmail, subject, mailBody);
        }
        catch (mailErr) {
            logger.warn(`Mailer error (non-fatal): ${mailErr}`);
        }

        const hashedPassword : string = await hash(password, saltRounds);
        const newUser = new User({
            firstName: cleanFirstName,
            lastName: cleanLastName,
            email: cleanEmail,
            username: cleanUsername,
            password: hashedPassword,
            token: verificationToken,
            verified: true, // Default to verified or let them verify via token
        });
        await newUser.save();
        req.flash('success', 'Account created successfully! Please sign in.');
        return res.redirect('/sign-in');
    }
    catch (error) {
        logger.error(`Error occurred in addUser: ${error}`);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

const verifyUser = async (req: Request, res: Response) => {
    const { token } = req.query;
    try {
        const user = await User.findOne({
            token,
            isTokenUsed: false,
        });
        if (!user) {
            return res.status(404).render('404', {
                title: "Not Found!",
            });
        }
        user.verified = true;
        user.isTokenUsed = true;
        user.token = generateToken();
        await user.save();
        return res.status(200).render('emailVerified', {
            email: user.email
        }); 
    }
    catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while verifying the user!`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

export { registerPage, addUser, verifyUser }