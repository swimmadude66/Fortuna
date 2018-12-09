import {Router} from 'express';
import {Config} from '../models/config';
import {UserSession} from '../models/auth';
import {ExperimentOutcome} from '../models/experiment';

module.exports = (APP_CONFIG: Config) => {
    const router = Router();
    const logger = APP_CONFIG.logger;
    const workspaceService = APP_CONFIG.workspaceService;
    const experimentService = APP_CONFIG.experimentService;

    /** Determine user Auth **/
    router.use('/:workspaceId', (req, res, next) => {
        const userSession: UserSession = res.locals.usersession;
        if (!userSession) {
            return res.status(401).send('Not Authenticated');
        } else {
            workspaceService.getRole(+req.params.workspaceId, userSession.UserId)
            .subscribe(roleInfo => {
                if (!roleInfo.isMember) {
                    return res.status(403).send('Not Authorized to access this workspace');
                } else {
                    res.locals.isAdmin = roleInfo.isAdmin;
                    return next();
                }
            });
        }
    });

    /** Get a list of experiments in the workspace **/
    router.get('/:workspaceId', (req, res, next) => {
        experimentService.getExperiments(+req.params.workspaceId)
        .subscribe(
            experiments => res.send(experiments),
            err => {
                logger.logError(err);
                return res.status(500).send('Could not get experiments');
            }
        )
    });

    /** Get experiment details **/
    router.get('/:workspaceId/:experimentId', (req, res, next) => {
        experimentService.getExperiment(+req.params.experimentId)
        .subscribe(
            experiments => res.send(experiments),
            err => {
                logger.logError(err);
                return res.status(500).send('Could not get experiments');
            }
        )
    });

    /** Create an experiment **/
    router.post('/:workspaceId', (req, res, next) => {
        const isAdmin: boolean = res.locals.isAdmin;
        if (!isAdmin) {
            return res.status(403).send('Insufficient Permissions for this request');
        }
        const body = req.body;
        if (!body || !body.Name) {
            return res.status(400).send('Name is a required parameter');
        }
        experimentService.createExperiment(+req.params.workspaceId, body.Name, body.Description)
        .subscribe(
            exp => res.send(exp),
            err => {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).send('An experiment with that name already exists in the workspace');
                } else {
                    logger.logError(err);
                    return res.status(500).send('Could not create experiment');
                }
            }
        )
    });

    /** Add an outcome to an experiment **/
    router.post('/:workspaceId/:experimentId/outcomes', (req, res, next) => {
        const isAdmin: boolean = res.locals.isAdmin;
        if (!isAdmin) {
            return res.status(403).send('Insufficient Permissions for this request');
        }
        const body: ExperimentOutcome = req.body;
        if (!body || !('Value' in body) || !('Weight' in body)) {
            return res.status(400).send('Value and Weight are required parameters');
        }
        experimentService.addOutcome(+req.params.experimentId, body.Value, body.Weight, body.Description)
        .subscribe(
            outcome => res.send(outcome),
            err => {
                logger.logError(err);
                return res.status(500).send('Could not add outcome');
            }
        )
    });

    return router;
}
