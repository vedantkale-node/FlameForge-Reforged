import { Router, Request, Response } from "express";
import { getMain } from "../controllers/apiController.js";
import { getSingleCharacter, getAllCharacters } from "../controllers/characterController.js";
import { getAllWeapons, getSingleWeapon } from "../controllers/weaponController.js";
import { getAllArtifacts, getSingleArtifact } from "../controllers/artifactController.js";
import { apiLimiter } from "../../helpers/limiter.js";
import { openApiSpec } from "../openapi.js";

const router = Router();

router.route('/')
    .get(apiLimiter, getMain);

router.route('/openapi.json')
    .get(apiLimiter, (req: Request, res: Response) => {
        res.json(openApiSpec);
    });

// Characters Routes (/api/characters & /api/v1/characters)
router.route(['/characters', '/v1/characters'])
    .get(apiLimiter, getAllCharacters);

router.route(['/character', '/v1/character'])
    .get(apiLimiter, getSingleCharacter);

// Weapons Routes (/api/weapons & /api/v1/weapons)
router.route(['/weapon', '/v1/weapon'])
    .get(apiLimiter, getSingleWeapon);

router.route(['/weapons', '/v1/weapons'])
    .get(apiLimiter, getAllWeapons);

// Artifacts Routes (/api/artifacts & /api/v1/artifacts)
router.route(['/artifact', '/v1/artifact'])
    .get(apiLimiter, getSingleArtifact);

router.route(['/artifacts', '/v1/artifacts'])
    .get(apiLimiter, getAllArtifacts);

export default router;
