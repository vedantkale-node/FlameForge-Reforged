import { Request, Response } from "express";
import User from '../models/userModel.js';
import Setting from '../models/settingsModel.js';
import { validationResult } from 'express-validator';
import { logger } from "../helpers/logger.js";
import { compare } from 'bcrypt';

const loginPage = async (req: Request, res: Response) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    let registrationEnabled = false;
    try {
        const setting = await Setting.findOne({ settingType: 'global' });
        if (setting && setting.registerRoute === true) {
            registrationEnabled = true;
        }
    } catch (e) {
        logger.error(`Error checking register setting: ${e}`);
    }

    res.render('login', {
        title: 'Login',
        registrationEnabled,
    }); 
}

const loginUser = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    const { email, password } = req.body;
    if (!errors.isEmpty()) {
        const errorOne = errors.array()[0].msg;
        req.flash('error', errorOne);
        return res.redirect('/sign-in');
    }
    try {
        const cleanEmail = (email || '').trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            req.flash('error', 'User does not exist!');
            return res.redirect('/sign-in');
        }
        const validPassword = await compare(password, user.password);
        if (!validPassword) {
            req.flash('error', 'Wrong Username or Password!');
            return res.redirect('/sign-in');
        }
        if (user.verified === false) {
            return res.redirect('/verify');
        }
        req.session.user = user.username;
        req.session.role = user.role;
        req.session.uid = user._id.toString();
        return res.redirect('/dashboard');
    }
    catch (error) {
        logger.error(`User: ${req.session.user}, Error occured while logging in: ${error}`);
        console.log(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

export { loginPage , loginUser };