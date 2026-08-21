import { config } from 'dotenv';
config();
import express, { Express, NextFunction, Request, Response } from 'express';
import connectDB from './config/database.js';
import loginRouter from './routes/loginRouter.js';
import registerRouter from './routes/registerRouter.js';
import dashboardRouter from "./routes/dashboardRouter.js";
import miscRouter from './routes/miscRouter.js';
import apiRouter from './api/routes/apiRouter.js';
import { logger } from './helpers/logger.js';
import { create } from 'express-handlebars';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import session from 'express-session';
import flash from 'connect-flash';
import { eq, neq, or, and, isStaff } from './helpers/helper.js';
import cors from 'cors';
import helmet from 'helmet';
import cloudinary from 'cloudinary';
import { routeLogger } from './helpers/logger.js';
import MongoStore from 'connect-mongo';
import { aboutPage } from './controllers/miscController.js';
import { limiter, getRealClientIp } from './helpers/limiter.js';
connectDB();

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
const app: Express = express();
app.set('trust proxy', 1);

const viewsPath = join(__dirname, "../views");
const layoutPath = join(__dirname, "../views/layouts");
const partialsPath = join(__dirname, "../views/partials");
const secretString = randomBytes(20).toString('hex');
const secret = process.env.SECRET || secretString;
const oneDay = 1000 * 60 * 60 * 24;
const isProduction = process.env.NODE_ENV === 'production';

const hbs = create({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: layoutPath,
    partialsDir: partialsPath,
    helpers: {
        eq,
        neq,
        or,
        and,
        isStaff
    }
});
let sessionStore;
if (process.env.NODE_ENV === 'production' && process.env.DB) {
    try {
        sessionStore = MongoStore.create({
            mongoUrl: process.env.DB,
            touchAfter: 24 * 3600,
            mongoOptions: {
                serverSelectionTimeoutMS: 5000
            }
        });
        sessionStore.on('error', (err: any) => {
            console.warn('Session MongoStore error:', err.message || err);
        });
    } catch (err: any) {
        console.warn('MongoStore init error:', err.message || err);
    }
}

const sessions = session({
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: oneDay
    },
    ...(sessionStore ? { store: sessionStore } : {})
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessions);
app.use(flash());
app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.messages = req.flash();
    next();
});
app.use(cors({
    origin: process.env.NODE_ENV === 'production' && process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN : true,
    credentials: true
}))
app.use(express.static(join(__dirname, '../public')));
app.use(express.static('public'));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'code.jquery.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com'],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com'],
            fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'res.cloudinary.com', 'https:', 'unpkg.com'],
            connectSrc: ["'self'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com', 'unpkg.com', 'cdn.jsdelivr.net', 'https://cdn.jsdelivr.net'],
        }
    },
    crossOriginResourcePolicy: false
}));
app.use((req, res, next) => {
    res.setHeader('Permissions-policy', '');
    next();
});

app.use((req: Request, _res: Response, next: NextFunction) => {
    const clientIp = getRealClientIp(req);
    logger.info(`[${req.method}] ${req.originalUrl || req.url} - IP: ${clientIp}`);
    next();
});

app.set('views', viewsPath);
app.use('/sign-in', loginRouter);
app.use('/login', loginRouter);
app.use('/sign-up', registerRouter);
app.use('/register', registerRouter);
app.use('/dashboard', dashboardRouter);
app.use('/about', miscRouter);
app.use('/misc', miscRouter);
app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);
app.use('/v1', apiRouter);

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export function checkAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.user) {
        next();
    }
    else {
        if (req.xhr || req.headers.accept?.includes('application/json') || req.path.includes('/scraper/')) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Please log in.' });
        }
        res.redirect('/sign-in');
    }
}

export function checkAuthAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.role === 'admin') {
        next();
    }
    else {
        if (req.xhr || req.headers.accept?.includes('application/json') || req.path.includes('/scraper/')) {
            return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
        }
        res.redirect('/dashboard');
    }
}

export function checkAuthModerator(req: Request, res: Response, next: NextFunction) {
    if (req.session && (req.session.role === 'admin' || req.session.role === 'moderator')) {
        next();
    }
    else {
        if (req.xhr || req.headers.accept?.includes('application/json') || req.path.includes('/scraper/')) {
            return res.status(403).json({ success: false, error: 'Unauthorized: Moderator or Admin privileges required.' });
        }
        res.redirect('/dashboard');
    }
}

app.get('/', (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    res.render('swagger', {
        layout: false,
        title: "Swagger API Docs | FlameForge Reforged"
    });
    routeLogger.verbose('route call successful', {
        endpoint: `/`,
        method: 'GET',
        ip: ip
    });
});

app.get('/report', (req: Request, res: Response) => {
    res.render('report', {
        title: "Report Portal",
    });
});

app.get('/about', limiter, aboutPage);

app.get('/swagger', (req: Request, res: Response) => {
    res.redirect('/');
});

app.get('/docs', (req: Request, res: Response) => {
    res.redirect('/');
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
    res.sendFile(join(__dirname, '../public/assets/favicon/favicon.ico'));
});

app.get('/site.webmanifest', (_req: Request, res: Response) => {
    res.sendFile(join(__dirname, '../public/assets/favicon/site.webmanifest'));
});

app.get('*', (req: Request, res: Response) => {
    res.render('404', {
        title: '404! Not Found!'
    });
});

// Global 500 Error Handler Middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    logger.error(`Unhandled Server Error on ${req.method} ${req.originalUrl}: ${err.stack || err.message || err}`);
    console.error('Unhandled Application Error:', err);

    if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api') || req.path.includes('/scraper/')) {
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : (err.message || 'Unknown Error')
        });
    }

    return res.status(500).render('500', {
        title: '500! Internal Server Error'
    });
});

export { app };