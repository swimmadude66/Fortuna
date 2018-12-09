import {Router} from 'express';
import {Config} from '../models/config';

module.exports = (APP_CONFIG: Config) => {
    const router = Router();
    const db = APP_CONFIG.db;
    const workspaceService = APP_CONFIG.workspaceService;

   

    return router;
}
