import {Observable, throwError} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import * as uuid from 'uuid/v4';
import {DatabaseService} from './db';
import {Experiment, ExperimentResult, ExperimentOutcome} from '../models/experiment';
import {AuthService} from './auth';

export type FullExperiment = Experiment & ExperimentOutcome & ExperimentResult & {ResultOutcomeId: number, OutcomeDescription?: string};

export class ExperimentService {

    constructor(
        private _db: DatabaseService,
        private _auth: AuthService,
    ) {
    }

    createExperiment(workspaceId: number, name: string, description?: string): Observable<Experiment> {
        const endpoint = uuid();
        const key = new Buffer(`${uuid().replace(/-/g, '')}${uuid().replace(/-/g, '')}`).toString('base64');
        const keySalt = uuid().replace(/-/g, '');
        return this._auth.hashPassword(`${keySalt}_${key}`)
        .pipe(
            switchMap(hashResult => {
                const keyHash = hashResult.hash;
                const q = 'Insert into `experiments` (`WorkspaceId`, `Name`, `Description`, `Endpoint`, `APIKeyHash`, `APIKeySalt`) VALUES (?, ?, ?, ?, ?, ?);';
                return this._db.query<Experiment>(q, [workspaceId, name, description, endpoint, keyHash, keySalt]);
            }),
            map(result => {
                const exp: Experiment = {
                    ExperimentId: result.insertId,
                    Name: name,
                    Description: description,
                    WorkspaceId: workspaceId,
                    Endpoint: endpoint,
                    APIKey: key
                };
                return exp;
            })
        );
    }

    addOutcome(experimentId: number, value: any, weight: number, description?: string): Observable<ExperimentOutcome> {
        const q = 'Insert into `outcomes` (`ExperimentId`, `Value`, `Weight`, `Description`) VALUES (?, ?, ?, ?);';
        return this._db.query<void>(q, [experimentId, JSON.stringify(value), weight, description])
        .pipe(
            map(result => {
                const outcome: ExperimentOutcome = {
                    ExperimentId: experimentId,
                    OutcomeId: result.insertId,
                    Value: value,
                    Weight: weight,
                    Description: description
                };
                return outcome;
            })
        )
    }

    getExperiments(workspaceId: number): Observable<Experiment[]> {
        const q = 'Select `ExperimentId`, `WorkspaceId`, `Name`, `Description`, `Active`, `Endpoint`'
        + ' FROM `experiments` Where `WorkspaceId`=?;';
        return this._db.query<Experiment[]>(q, [workspaceId]);
    }

    getExperiment(experimentId: number): Observable<Experiment> {
        const q = 'Select e.`ExperimentId`, e.`WorkspaceId`, e.`Name`, e.`Description`, e.`Active`, e.`Endpoint`,'
        + ' o.`OutcomeId`, o.`Value`, o.`Weight`, o.`Description` as OutcomeDescription,'
        + ' r.`ResultId`, r.`SubjectId`, r.`Active`, r.`OutcomeId` as ResultOutcomeId'
        + ' FROM `experiments` e '
        + ' LEFT JOIN `outcomes` o on o.`ExperimentId` = e.`ExperimentId`'
        + ' LEFT JOIN `results` r on r.`ExperimentId` = e.`ExperimentId`'
        + ' WHERE e.`ExperimentId`= ?';
        return this._db.query<FullExperiment[]>(q, [experimentId])
        .pipe(
            map(results => {
                const experiments = (results || []).reduce((prev, curr) => {
                    if (!(curr.ExperimentId in prev)) {
                        const cleanExperiment: Experiment = {
                            ExperimentId: curr.ExperimentId,
                            WorkspaceId: curr.WorkspaceId,
                            Name: curr.Name,
                            Description: curr.Description,
                            Endpoint: curr.Endpoint,
                            Outcomes: [],
                            Results: [],
                            Active: curr.Active
                        };
                        prev[curr.ExperimentId] = cleanExperiment;
                    }
                    const p: Experiment = prev[curr.ExperimentId];
                    if (curr.OutcomeId && (p.Outcomes.findIndex(o => o.OutcomeId === curr.OutcomeId) < 0)) {
                        const outcome: ExperimentOutcome = {
                            OutcomeId: curr.OutcomeId,
                            ExperimentId: curr.ExperimentId,
                            Value: JSON.parse(curr.Value),
                            Weight: curr.Weight,
                            Description: curr.OutcomeDescription
                        };
                        p.Outcomes.push(outcome);
                    }
                    if (curr.ResultId && (p.Results.findIndex(r => r.ResultId === curr.ResultId))) {
                        const result: ExperimentResult = {
                            ResultId: curr.ResultId,
                            ExperimentId: curr.ExperimentId,
                            OutcomeId: curr.ResultOutcomeId,
                            SubjectId: curr.SubjectId
                        };
                        p.Results.push(result);
                    }
                    return prev;
                }, {});

                const fullExperiments: Experiment[] = Object.keys(experiments).map(k => experiments[k]) || [];
                if (fullExperiments && fullExperiments.length > 0) {
                    return fullExperiments[0];
                } else {
                    return null;
                }
            })
        )
    }

}
