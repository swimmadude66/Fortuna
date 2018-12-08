import {from, Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {createHash} from 'crypto';
import * as argon2 from 'argon2';
import {User} from '../models/auth';

export class AuthService {

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
