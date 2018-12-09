export interface Experiment {
    ExperimentId: number;
    WorkspaceId: number;
    Name: string;
    Description?: string;
    Outcomes?: ExperimentOutcome[];
    Results?: ExperimentResult[];
}

export interface ExperimentSubject {
    SubjectId: number;
    ExperimentId: number;
    Identifier?: string;
    AnonymousIdentifier: string;
}

export interface ExperimentOutcome {
    OutcomeId: number;
    ExperimentId: number;
    Value: any;
    Weight: number;
    Description?: string;
}

export interface ExperimentResult {
    ResultId: number;
    ExperimentId: number;
    SubjectId: number;
    OutcomeId: number;
    Subject?: ExperimentSubject; // if we need to attach more info
    Outcome?: ExperimentOutcome; // if we need to attach more info
}
