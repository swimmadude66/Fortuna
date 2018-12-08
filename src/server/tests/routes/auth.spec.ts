import * as request from 'supertest';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

describe('/auth', () => {

    let app;
    before(() => {
        app = express();
        app.use(cookieParser('test_secret'));
        app.use(bodyParser.json({limit: '100mb'}));
        app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
        app.use((req, res, next) => {
            if (res.locals.auth) {
                return next();
            }
            if (!req.cookies || !req.cookies['test_cookie']) { // cookies, not signed, for easier testing
                res.locals.auth = null;
                return next();
            }
            const authToken: string = req.cookies['test_cookie'];
            res.locals.auth = authToken;
            return next();
        });
        app.use('/api/auth', require('../../routes/auth')({cookie_name: 'test_cookie'}));
        app.use((req, res) => res.status(404).send('not a valid endpoint'));
    });

    it('should check if a session is valid', (done) => {
        request(app)
        .get('/api/auth/valid')
        .expect(200, 'false', done);
    });
});
