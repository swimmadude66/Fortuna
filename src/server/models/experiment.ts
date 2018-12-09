export interface Experiment {
    ExperimentId: number;
    WorkspaceId: number;
    Name: string;
    Endpoint: string;
    Description?: string;
    APIKeyHash?: string; // Only present when fetched from db
    APIKey?: string; // Only present on the initial setting
    Outcomes?: ExperimentOutcome[];
    Results?: ExperimentResult[];
    Active?: boolean;
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
