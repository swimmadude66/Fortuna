export interface UserSession {
    UserId: number;
    Email: string;
    SessionKey: string;
    Expires: number;
}

export interface SessionInfo {
    SessionKey: string;
    UserId: number;
    Expires: number;
    UserAgent?: string;
    Created?: Date;
    LastUsed?: number; // unix timestamp from db
    LastAccess?: Date; // Date for use in model
}

export interface User {
    UserId: number;
    Email: string;
    PassHash?: string;
    Salt?: string
    Confirm?: string;
    Role?: 'Member' | 'Admin';
    WorkspaceIds?: number[];
    Active?: boolean | 0 | 1;
}
