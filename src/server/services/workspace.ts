import {Observable, throwError} from 'rxjs';
import {switchMap, catchError} from 'rxjs/operators';
import {DatabaseService} from './db';

export class WorkspaceService {

    constructor(
        private _db: DatabaseService
    ) {}

    createWorkspace(ownerId: number, workspaceName: string): Observable<any> {
        return this._db.getConnection()
        .pipe(
            switchMap(conn =>this._db.beginTransaction(conn).pipe(
                switchMap(_ => this._db.connectionQuery(conn, 'Insert into `workspaces` (`Name`) VALUES (?);', [workspaceName])),
                switchMap(result => this._db.connectionQuery(conn, 'Insert into `workspace_users` (`WorkspaceId`, `UserId`, `Role`) VALUES (?, ?, \'Admin\');', [result.insertId, ownerId])),
                switchMap(_ => this._db.connectionCommit(conn)),
                catchError(err => this._db.connectionRollback(conn).pipe(switchMap(_ => throwError(err))))
            ))
        );
    }

    addUser(workspaceId: number, userId: number): Observable<any> {
        // TODO: only allow if the caller is an `Admin` of the workspace
        return this._db.query('Insert into `workspace_users` (`WorkspaceId`, `UserId`) VALUES (?,?);', [workspaceId, userId]);
    }

    removeUser(workspaceId: number, userId: number): Observable<any> {
        // TODO: only allow if the caller is an `Admin` of the workspace
        return this._db.query('Delete from `workspace_users` WHERE `WorkspaceId`=? AND `UserId`=?;', [workspaceId, userId]);
    }
}
