import {Router} from 'express';
import {switchMap, map} from 'rxjs/operators';
import {Config} from '../models/config';
import {AuthService} from '../services/auth';
import {User} from '../models/auth';

const COOKIE_OPTIONS = {
    path: '/',
    httpOnly: true,
    signed: true,
    sameSite: true,
};

module.exports = (APP_CONFIG: Config) => {
    const router = Router();
    const logger = APP_CONFIG.logger;
    const sessionManager = APP_CONFIG.sessionManager;
    const authService = APP_CONFIG.authService;
    const workspaceService = APP_CONFIG.workspaceService;

    router.post('/signup', (req, res) => {
        const body = req.body;
        if (!body || !body.Email || !body.Password) {
            return res.status(400).send('Email and Password are required fields');
        } else {
            authService.signup(body.Email, body.Password)
            .pipe(
                switchMap(user => sessionManager.createSession(user, JSON.stringify(res.useragent))),
                map(userSession => {
                    res.cookie(APP_CONFIG.cookie_name, userSession.SessionKey, {...COOKIE_OPTIONS, expires: new Date(userSession.Expires * 1000), secure: req.secure});
                    return userSession;
                }),
                switchMap(userSession => workspaceService.createWorkspace(userSession.UserId, body.Email, true)
                .pipe(
                    map(workspace => {
                        const user: User = {
                            UserId: userSession.UserId,
                            Email: userSession.Email,
                            WorkspaceIds: [workspace.WorkspaceId]
                        };
                        return user;
                    })
                ))
            )
            .subscribe(
                user => {
                    return res.status(200).send(user);
                },
                err => {
                    logger.logError(err);
                    res.status(400).send('Could not complete signup');
                }
            );
        }
    });

    router.post('/login', (req, res) => {
        const body = req.body;
        if (!body || !body.Email || !body.Password) {
            return res.status(400).send('Email and Password are required fields');
        } else {
            authService.login(body.Email, body.Password)
            .pipe(
                switchMap(user => sessionManager.createSession(user, JSON.stringify(res.useragent)).pipe(
                    map(userSession => {
                        res.cookie(APP_CONFIG.cookie_name, userSession.SessionKey, {...COOKIE_OPTIONS, expires: new Date(userSession.Expires * 1000), secure: req.secure});
                        const cleanUser: User = {
                            UserId: user.UserId,
                            Email: user.Email,
                            WorkspaceIds: user.WorkspaceIds
                        };
                        return cleanUser;
                    })
                ))
            )
            .subscribe(
                result => {
                    return res.send(result);
                },
                err => {
                    if (err === 'Incorrect username or password') {
                        return res.status(400).send('Incorrect username or password');
                    } else {
                        logger.logError(err);
                        return res.status(500).send('Could not login at this time');
                    }
                }
            )
        }
    });

    router.get('/valid', (req, res) => {
        return res.send(!!res.locals.usersession);
    });

    router.get('/sessions', (req, res) => {
        if (!res.locals.usersession || !res.locals.usersession.UserId) {
            return res.send([]);
        }
        sessionManager.getActiveSessions(res.locals.usersession.UserId)
        .subscribe(
            sessions => res.send(sessions),
            err => {
                logger.logError(err);
                res.status(500).send('Cannot fetch active sessions');
            }
        )
    });

    router.delete('/sessions/:sessionKey', (req, res) => {
        const sessionKey = req.params['sessionKey'];
        if (res.locals.usersession && res.locals.usersession.UserId && res.locals.usersession.SessionKey) {
            sessionManager.deactivateSession(res.locals.usersession.UserId, sessionKey)
            .subscribe(
                success => {
                    if (success) {
                        if (res.locals.usersession.SessionKey === sessionKey) {
                            res.clearCookie(APP_CONFIG.cookie_name, {...COOKIE_OPTIONS, secure: req.secure});
                        }
                        return res.send(success);
                    } else {
                        return res.status(400).send('Could not find that session');
                    }
                }  
            )
        }
    });

    router.post('/logout', (req, res) => {
        if (res.locals.usersession && res.locals.usersession.SessionKey && res.locals.usersession.UserId) {
            res.clearCookie(APP_CONFIG.cookie_name, {...COOKIE_OPTIONS, secure: req.secure});
            sessionManager.deactivateSession(res.locals.usersession.UserId, res.locals.usersession.SessionKey)
            .subscribe(
                _ => res.send(true),
                err => {
                    logger.logError(err);
                    res.send(true);
                }
            );
        } else {
           return res.send(false);
        }
    });

    return router;
}
