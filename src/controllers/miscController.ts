import { Request, Response } from "express";
import Report from '../models/reportModel.js';
import { logger } from '../helpers/logger.js';
import { validationResult } from "express-validator";
import sendEmail from "../helpers/mailer.js";
import Setting from "../models/settingsModel.js";

const reportPage = (req: Request, res: Response) => {
    res.render('report', {
        title: 'Report Portal',
    });
};

const aboutPage = (req: Request, res: Response) => {
    res.render('about', {
        title: 'About FlameForge Reforged & System Architecture',
        user: req.session ? req.session.user : null,
        role: req.session ? req.session.role : null,
    });
};

function escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const sendReport = async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);
        const { name, email, errorUrl, message } = req.body;
        if (!errors.isEmpty()) {
            const errorOne = errors.array()[0].msg;
            req.flash('error', errorOne);
            return res.redirect('/misc/report');
        }

        const newReport = new Report({
            name: (name || '').trim(),
            email: (email || '').trim().toLowerCase(),
            url: (errorUrl || '').trim(),
            message: (message || '').trim(),
            createdAt: Date.now()
        });

        try {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.MY_EMAIL || process.env.SERVER_EMAIL || 'vedantsapalkar99@gmail.com';
            const cleanName = escapeHtml(name || '');
            const cleanEmail = escapeHtml(email || '');
            const cleanUrl = escapeHtml(errorUrl || '');
            const cleanMessage = escapeHtml(message || '');

            const mailTitle = `[FlameForge Report] Bug reported on: ${cleanUrl}`;
            const mailBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #e6edf3; padding: 20px; border-radius: 12px; border: 1px solid #30363d;">
                    <h2 style="color: #f85149; margin-top: 0;">FlameForge Incident Report</h2>
                    <p style="margin: 6px 0;"><strong>Reporter:</strong> ${cleanName} &lt;${cleanEmail}&gt;</p>
                    <p style="margin: 6px 0;"><strong>Reported URL:</strong> <a href="${cleanUrl}" style="color: #58a6ff;">${cleanUrl}</a></p>
                    <p style="margin: 12px 0 6px 0;"><strong>Details / Error Info:</strong></p>
                    <div style="background: #161b22; padding: 12px; border-radius: 8px; border: 1px solid #30363d; white-space: pre-wrap; font-size: 13px;">${cleanMessage}</div>
                </div>
            `;
            await sendEmail(adminEmail, mailTitle, mailBody);
        } catch (error) {
            logger.warn(`Email report notification error (non-fatal): ${error}`);
        }
        await newReport.save();
        req.flash('success', 'Report Sent Successfully! Our team has been notified.');
        return res.redirect('/misc/report');
    } catch (error) {
        logger.error(`Error occurred while submitting report: ${error}`);
        console.error(error);
        res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
};

const modifySettings = async (req: Request, res: Response) => {
    try {
        let switchState = req.body.registerRoute === 'on' || req.body.registerRoute === true || req.body.registerRoute === 'true';
        await Setting.updateOne({ settingType: 'global' }, { $set: { registerRoute: switchState }}, { upsert: true });
        logger.silly(`User: ${req.session.user}, changed settings`);
        req.flash('success', 'Settings Saved Successfully!');
        return res.redirect('/dashboard');
    } catch (error) {
        logger.error(`User: ${req.session.user}, Error occured on dashboard page: ${error}`);
        console.log(error);
        return res.status(500).render('500', {
            title: "Internal Server Error!",
        });
    }
}

export { reportPage, aboutPage, sendReport, modifySettings };