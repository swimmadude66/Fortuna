import {User} from './auth';
import {Experiment} from './experiment';

export interface Workspace {
    WorkspaceId: number;
    Name: string;
    Logo?: string;
    Users: User[];
    Experiments: Experiment[];
}
