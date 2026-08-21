import rateLimit, { Options } from "express-rate-limit";
import * as requestIp from 'request-ip';
import { Request, Response, NextFunction } from "express";

/**
 * Enterprise-grade client IP resolver with proxy and header chain inspection.
 */
export function getRealClientIp(req: Request): string {
    // Cloudflare Connecting IP
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
        return cfIp.trim();
    }

    // Standard proxy forwarded chain (first entry is original client)
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        const firstIp = forwarded.split(',')[0].trim();
        if (firstIp) return firstIp;
    }

    // NGINX / Reverse Proxy real IP
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
        return realIp.trim();
    }

    // request-ip fallback
    const clientIp = requestIp.getClientIp(req);
    if (clientIp) {
        // Normalize IPv6 localhost aliases
        if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
            return '127.0.0.1';
        }
        return clientIp;
    }

    return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Creates a professional, context-aware 429 response handler.
 */
function createRateLimitHandler(customMessage: string) {
    return (req: Request, res: Response, _next: NextFunction, options: Options) => {
        const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
        const isJson = req.xhr ||
            req.path.startsWith('/api') ||
            req.path.includes('/scraper/') ||
            req.path.includes('/upload/') ||
            (req.headers.accept && req.headers.accept.includes('application/json'));

        if (isJson) {
            return res.status(429).json({
                success: false,
                status: 429,
                error: 'Rate Limit Exceeded',
                message: customMessage,
                retryAfterSeconds,
                timestamp: new Date().toISOString()
            });
        }

        // Browser navigation / form submission
        if (req.flash) {
            req.flash('error', customMessage);
        }
        return res.status(429).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>429 Too Many Requests | FlameForge</title>
                <style>
                    body {
                        background-color: #0d1117;
                        color: #c9d1d9;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .box {
                        background-color: #161b22;
                        border: 1px solid #30363d;
                        border-radius: 16px;
                        padding: 32px;
                        max-width: 480px;
                        text-align: center;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                    }
                    h1 { color: #f85149; font-size: 24px; margin-bottom: 12px; }
                    p { font-size: 14px; color: #8b949e; line-height: 1.6; margin-bottom: 20px; }
                    .btn {
                        display: inline-block;
                        padding: 10px 20px;
                        background: #da3633;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 13px;
                        transition: background 0.2s;
                    }
                    .btn:hover { background: #b62324; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>429 - Too Many Requests</h1>
                    <p>${customMessage}</p>
                    <a href="/dashboard" class="btn">Return to Dashboard</a>
                </div>
            </body>
            </html>
        `);
    };
}

/**
 * 1. General Navigation & Page Limiter: 500 requests / 15 mins
 */
export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => getRealClientIp(req),
    skip: (req: Request) => req.method === 'OPTIONS',
    handler: createRateLimitHandler('Too many page requests from this IP. Please slow down and try again in 15 minutes.')
});

/**
 * 2. Public REST API Limiter: 600 requests / 15 mins (~40 req/min)
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => getRealClientIp(req),
    skip: (req: Request) => req.method === 'OPTIONS',
    handler: createRateLimitHandler('API rate limit exceeded. Maximum 600 requests per 15 minutes.')
});

/**
 * 3. Authentication & Security Limiter: 15 attempts / 15 mins (skips successful attempts)
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => getRealClientIp(req),
    skip: (req: Request) => req.method === 'OPTIONS',
    handler: createRateLimitHandler('Too many failed authentication attempts. For security reasons, please try again in 15 minutes.')
});

/**
 * 4. General Form & Admin Action Limiter: 120 submissions / 5 mins
 */
export const formLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => getRealClientIp(req),
    skip: (req: Request) => req.method === 'OPTIONS',
    handler: createRateLimitHandler('Action rate limit exceeded. Please wait a moment before submitting again.')
});

/**
 * 5. HoYoWiki Scraper Operations Limiter: 30 requests / 1 min
 */
export const scraperLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => getRealClientIp(req),
    skip: (req: Request) => req.method === 'OPTIONS',
    handler: createRateLimitHandler('Scraper rate limit exceeded. Maximum 30 scraper requests per minute.')
});

/**
 * 6. Cloudinary Image Upload Limiter: 60 uploads / 15 mins
 */
export const imageUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => getRealClientIp(req),
    skip: (req: Request) => req.method === 'OPTIONS',
    handler: createRateLimitHandler('Image upload rate limit exceeded. Maximum 60 uploads per 15 minutes.')
});