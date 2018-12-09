import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {DatabaseService} from './db';
import {Experiment} from '../models/experiment';

export class ExperimentService {

    constructor(
        private _db: DatabaseService
    ) {
    }

    createExperiment(workspaceId: number, name: string, description?: string): Observable<Experiment> {
        const q = 'Insert into `experiments` (`WorkspaceId`, `Name`, `Description`) VALUES (?, ?, ?);';
        return this._db.query<Experiment>(q, [workspaceId, name, description]).pipe(
            map(result => {
                const exp: Experiment = {
                    ExperimentId: result.insertId,
                    Name: name,
                    Description: description,
                    WorkspaceId: workspaceId,
                };
                return exp;
            })
        );
    }

    getExperiments(workspaceId: number): Observable<Experiment[]> {
        const q = 'Select * FROM `experiments` Where `WorkspaceId`=?;';
        return this._db.query<Experiment[]>(q, [workspaceId])
        .pipe(
            tap(results => console.log(results.length))
        );
    }

}
