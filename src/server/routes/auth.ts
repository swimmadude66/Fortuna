import {Router} from 'express';
import * as uuid from 'uuid/v4';
import {throwError} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';
import {Config} from '../models/config';
import {AuthService} from '../services/auth';

const COOKIE_OPTIONS = {
    path: '/',
    httpOnly: true,
    signed: true,
    sameSite: true,
};

module.exports = (APP_CONFIG: Config) => {
    const router = Router();
    const db = APP_CONFIG.db;
    const sessionManager = APP_CONFIG.sessionManager;
    const authService = new AuthService();
    const workspaceService = APP_CONFIG.workspaceService;

    router.post('/signup', (req, res) => {
        const body = req.body;
        if (!body || !body.Email || !body.Password) {
            return res.status(400).send('Email and Password are required fields');
        } else {
            const salt = uuid().replace(/-/ig, '');
            authService.hashPassword(`${salt}|${body.Password}`)
            .pipe(
                map(result => result.hash),
                switchMap(hash => db.query('Insert into `users` (`Email`, `Salt`, `PassHash`, `Active`) VALUES(?, ?, ?, 1);', [body.Email, salt, hash])),
                // catchError(detect 400 or 500 here)
                switchMap(result => {
                    const userId = result.insertId;
                    return workspaceService.createWorkspace(result.insertId, 'Personal Workspace').pipe(map(_ => userId));
                }),
                switchMap(userId => sessionManager.createSession(userId, JSON.stringify(res.useragent)))
            )
            .subscribe(
                result => {
                    res.cookie(APP_CONFIG.cookie_name, result.SessionKey, {...COOKIE_OPTIONS, expires: new Date(result.Expires * 1000), secure: req.secure});
                    return res.status(204).send();
                },
                err => {
                    console.error(err);
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
            db.query('Select `PassHash`, `UserId`, `Salt` from `users` where `Active`=1 AND `Email`=? LIMIT 1;', [body.Email])
            .pipe(
                map((users: any[]) => {
                    let user = {UserId: -100, Email: 'fakeUser', PassHash: '12345', Salt: '12345', Active: true}; // use a fake user which will fail to avoid timing differences indicating existence of real users.
                    if (users.length > 0) {
                        user = users[0]
                    }
                    return user;
                }),
                switchMap(user => authService.validatePassword(user, body.Password)
                    .pipe(
                        switchMap(isValid => {
                            if (isValid) {
                                return sessionManager.createSession(user.UserId, JSON.stringify(res.useragent));
                            } else {
                                return throwError('Incorrect username or password');
                            }
                        })
                    )
                )
            ).subscribe(
                result => {
                    res.cookie(APP_CONFIG.cookie_name, result.SessionKey, {...COOKIE_OPTIONS, expires: new Date(result.Expires * 1000), secure: req.secure});
                    return res.send();
                },
                err => {
                    if (err === 'Incorrect username or password') {
                        return res.status(400).send('Incorrect username or password');
                    } else {
                        console.error(err);
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
                console.error(err);
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
                    console.error(err);
                    res.send(true);
                }
            );
        } else {
           return res.send(false);
        }
    });

    return router;
}
