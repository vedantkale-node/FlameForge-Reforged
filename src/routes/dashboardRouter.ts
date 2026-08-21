import { checkAuth, checkAuthAdmin, checkAuthModerator } from "../app.js";
import { Router } from "express";
import {
    getDashboard,
    uploadCharacterFile,
    uploadWeaponFile,
    logoutUser,
    deleteCharacter,
    deleteWeapon,
    deleteArtifact,
    uploadArtifactFile,
    editCharacter,
    editWeapon,
    saveCharacter,
    saveWeapon,
    downloadCharacters,
    downloadWeapons,
    downloadArtifacts,
    editArtifact,
    saveArtifact,
    deleteUser,
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
} from '../controllers/dashboardController.js';
import multer, { memoryStorage } from 'multer';
import { body } from 'express-validator';
import { formLimiter, imageUploadLimiter, limiter, scraperLimiter } from "../helpers/limiter.js";

const router : Router = Router();

const validateCharacter = [
    body('name').trim().notEmpty().withMessage('Character Name is required'),
    body('rarity').notEmpty().withMessage('Rarity is required'),
    body('vision').notEmpty().withMessage('Vision is required'),
    body('weapon').notEmpty().withMessage('Weapon is required'),
];

const validateWeapon = [
    body('name').trim().notEmpty().withMessage('Weapon name is required'),
    body('rarity').notEmpty().withMessage('Rarity is required'),
    body('family').notEmpty().withMessage('Weapon Family is required'),
];

const validateArtifact = [
    body('name').trim().notEmpty().withMessage('Artifact name is required'),
    body('twoPc').trim().notEmpty().withMessage('2-Piece bonus effect is required'),
    body('fourPc').trim().notEmpty().withMessage('4-Piece bonus effect is required'),
];

const upload = multer({
    storage: memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/json' || file.originalname.toLowerCase().endsWith('.json')) {
            cb(null, true);
        } else {
            cb(new Error('Only valid .json files are allowed!'));
        }
    }
});

router.get('/', limiter, checkAuth, getDashboard);
router.post('/upload/characters', formLimiter, checkAuthAdmin, upload.single('jsonCharacterFile'), uploadCharacterFile);
router.post('/upload/weapons', formLimiter, checkAuthAdmin, upload.single('jsonWeaponFile'), uploadWeaponFile);
router.post('/upload/artifacts', formLimiter, checkAuthAdmin, upload.single('jsonArtifactFile'), uploadArtifactFile);

router.post('/character/delete/:id', formLimiter, checkAuthAdmin, deleteCharacter)
router.post('/weapon/delete/:id', formLimiter, checkAuthAdmin, deleteWeapon)
router.post('/artifact/delete/:id', formLimiter, checkAuthAdmin, deleteArtifact)

router.get('/character/edit/:id', limiter, checkAuthAdmin, editCharacter);
router.post('/character/edit/:id', limiter, checkAuthAdmin, validateCharacter, saveCharacter);

router.get('/weapon/edit/:id', limiter, checkAuthAdmin, editWeapon);
router.post('/weapon/edit/:id', limiter, checkAuthAdmin, validateWeapon, saveWeapon);

router.get('/artifact/edit/:id', limiter, checkAuthAdmin, editArtifact);
router.post('/artifact/edit/:id', limiter, checkAuthAdmin, validateArtifact, saveArtifact);

router.get('/characters/download', formLimiter, checkAuthAdmin, downloadCharacters);
router.get('/weapons/download', formLimiter, checkAuthAdmin, downloadWeapons);
router.get('/artifacts/download', formLimiter, checkAuthAdmin, downloadArtifacts);

router.post('/upload/image/', imageUploadLimiter, checkAuthModerator, uploadImage);

router.post('/scraper/preview', scraperLimiter, checkAuthModerator, previewScraperData);
router.post('/scraper/sync-single', scraperLimiter, checkAuthModerator, syncSingleScraperData);
router.post('/scraper/sync-category', scraperLimiter, checkAuthAdmin, syncCategoryScraperData);
router.get('/entity-detail/:category/:id', limiter, checkAuth, getEntityDetail);

router.get('/profile', limiter, checkAuth, getProfilePage);
router.post('/profile', formLimiter, checkAuth, updateProfile);

router.get('/api/avatars', limiter, checkAuth, getAvatarsApi);
router.get('/api/namecards', limiter, checkAuth, getNamecardsApi);

router.post('/user/delete/:id', formLimiter, checkAuthAdmin, deleteUserByAdmin);
router.post('/user/edit-basic/:id', formLimiter, checkAuthAdmin, updateUserBasic);

router.get('/logout', formLimiter, checkAuth, logoutUser);
router.delete('/delete/:id', formLimiter, checkAuth, deleteUser);

export default router;
