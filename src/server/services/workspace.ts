import {Observable, throwError} from 'rxjs';
import {switchMap, catchError, map} from 'rxjs/operators';
import {DatabaseService} from './db';
import {User} from '../models/auth';
import {Workspace} from '../models/workspace';

export class WorkspaceService {

    constructor(
        private _db: DatabaseService
    ) {}

    createWorkspace(ownerId: number, name: string, isPersonal: boolean = false): Observable<Workspace> {
        const prefix = isPersonal ? 'PERSONAL' : 'PUBLIC';
        const workspaceName = `${prefix}_${name}`;
        return this._db.getConnection()
        .pipe(
            switchMap(conn =>this._db.beginTransaction(conn).pipe(
                switchMap(_ => this._db.connectionQuery<void>(conn, 'Insert into `workspaces` (`Name`) VALUES (?);', [workspaceName])),
                switchMap(result => {
                    const workspace: Workspace = {
                        WorkspaceId: result.insertId,
                        Name: workspaceName,
                        Users: [{UserId: ownerId, Email: '', Role: 'Admin'}],
                        Experiments: []
                    };
                    return this._db.connectionQuery<void>(conn, 'Insert into `workspace_users` (`WorkspaceId`, `UserId`, `Role`) VALUES (?, ?, \'Admin\');', [workspace.WorkspaceId, ownerId])
                    .pipe(map(_ => workspace));
                }),
                switchMap(workspace => this._db.connectionCommit(conn).pipe(map(_ => workspace))),
                catchError(err => this._db.connectionRollback(conn).pipe(switchMap(_ => throwError(err))))
            ))
        );
    }

    getUsers(workspaceId: number): Observable<User[]> {
        const q = 'Select u.`UserId`, u.`Email`, wu.`Role` FROM `workspace_users` wu JOIN `users` u on u.`UserId`=wu.`UserId` WHERE wu.`WorkspaceId` = ? AND u.`Active` <> 0;';
        return this._db.query<User[]>(q, [workspaceId]);
    }

    getRole(workspaceId: number, userId: number): Observable<{isMember: boolean, isAdmin: boolean}> {
        const q = 'Select `Role` FROM `workspace_users` WHERE `WorkspaceId` = ? AND `UserId`=? LIMIT 1;';
        return this._db.query<{Role: 'Member'|'Admin'}[]>(q, [workspaceId, userId])
        .pipe(
            map(results => {
                if (!results || results.length < 1) {
                    return {isMember: false, isAdmin: false};
                } else {
                    const role = results[0];
                    return {
                        isMember: true,
                        isAdmin: role.Role === 'Admin'
                    };
                }
            })
        );
    }

    addUser(workspaceId: number, userId: number): Observable<any> {
        // TODO: only allow if the caller is an `Admin` of the workspace
        return this._db.query<void>('Insert into `workspace_users` (`WorkspaceId`, `UserId`) VALUES (?,?);', [workspaceId, userId]);
    }

    removeUser(workspaceId: number, userId: number): Observable<any> {
        // TODO: only allow if the caller is an `Admin` of the workspace
        return this._db.query<void>('Delete from `workspace_users` WHERE `WorkspaceId`=? AND `UserId`=?;', [workspaceId, userId]);
    }
}
