import {from, Observable, of, throwError} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {createHash} from 'crypto';
import * as uuid from 'uuid/v4';
import * as argon2 from 'argon2';
import {User} from '../models/auth';
import {DatabaseService} from './db';

export class AuthService {

    constructor(
        private _db: DatabaseService
    ) {}

    signup(email: string, password: string): Observable<User> {
        const salt = uuid().replace(/-/ig, '');
        return this.hashPassword(`${salt}|${password}`)
        .pipe(
            map(result => result.hash),
            switchMap(hash => this._db.query<void>('Insert into `users` (`Email`, `Salt`, `PassHash`, `Active`) VALUES(?, ?, ?, 1);', [email, salt, hash])),
            map(result => {
                const userId = result.insertId;
                const user: User = {
                    UserId: userId,
                    Email: email
                };
                return user;
            })
        );
    }

    login(email: string, password: string): Observable<User> {
        const q = 'Select u.`PassHash`, u.`UserId`, u.`Salt`, wu.`WorkspaceId`' 
        + ' from `users` u JOIN `workspace_users` wu on wu.`UserId` = u.`UserId`'
        + ' where u.`Active`=1 AND u.`Email`=?;';
        return this._db.query<(User & {WorkspaceId: number})[]>(q, [email])
        .pipe(
            map(users => {
                let user: User = {UserId: -100, Email: 'fakeUser', PassHash: '12345', Salt: '12345'}; // use a fake user which will fail to avoid timing differences indicating existence of real users.
                if (users.length > 0) {
                    const groupedUsers = users.reduce((prev: {[key: number]: User & {WorkspaceId: number}}, curr: User & {WorkspaceId: number}) => {
                        if (!(curr.UserId in prev)) {
                            prev[curr.UserId] = {...curr, Email: email, WorkspaceId: undefined};
                        }
                        const p = prev[curr.UserId];
                        if (!p.WorkspaceIds) {
                            p.WorkspaceIds = [];
                        }
                        p.WorkspaceIds.push(curr.WorkspaceId);
                        return prev;
                    }, {});
                    user = groupedUsers[Object.keys(groupedUsers)[0]]
                }
                return user;
            }),
            switchMap(user => this.validatePassword(user, password)
                .pipe(
                    switchMap(isValid => {
                        if (isValid) {
                            return of(user);
                        } else {
                            return throwError('Incorrect username or password');
                        }
                    })
                )
            )
        );
    }

    hashPassword(password: string): Observable<{algo: string, hash: string}> {
        return this.argonHash(password)
        .pipe(
            map(hash => {
                return {algo: 'argon2', hash};
            }),
            catchError(e => {
                const shaHash = this.sha512Hash(password);
                return of({algo: 'sha512', hash: shaHash});
            })
        );
    }

    argonHash(password: string): Observable<string> {
        return from(argon2.hash(password));
    }

    sha512Hash(password: string): string {
        const shaHash = createHash('sha512').update(password).digest('base64');
        return shaHash;
    }

    validatePassword(user: User, password: string): Observable<boolean> {
        return from(argon2.verify(user.PassHash, `${user.Salt}|${password}`))
        .pipe(
            catchError(e => of(false))
        );
    }
}
