import {DatabaseService} from '../services/db';
import {SessionManager} from '../services/session';
import {LoggingService} from '../services/logger';
import {WorkspaceService} from '../services/workspace';
import {ExperimentService} from '../services/experiment';
import {AuthService} from '../services/auth';

export interface Config {
    environment: string;
    cookie_name: string;
    cookie_secret: string;
    port: number;
    log_level: string;
    client_root: string;
    max_workers: number;
    db?: DatabaseService,
    authService?: AuthService,
    sessionManager?: SessionManager,
    workspaceService?: WorkspaceService,
    experimentService?: ExperimentService,
    logger?: LoggingService,
}
