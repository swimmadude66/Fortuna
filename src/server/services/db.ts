import {Observable, throwError, observable} from 'rxjs';
import {createPool, PoolConfig, Pool, Connection, escape as mysqlEscape} from 'mysql';
import {switchMap, catchError} from 'rxjs/operators';

const NUMPERPAGE = 50;

export class DatabaseService {
    private _pool: Pool;

    constructor(config?: PoolConfig) {
        let poolconfig = Object.assign({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_DATABASE || 'fortuna',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'admin',
            charset: 'utf8mb4' // allow emojis
        }, config || {});

        this._pool = createPool(poolconfig);
    }

    query(q: string, params?: any[]): Observable<any> {
        return this.getConnection()
        .pipe(
            switchMap(
                conn => this.connectionQuery(conn, q, params).pipe(
                    catchError(err => {
                        conn.release();
                        return throwError(err);
                    })
                )
            )
        );
    }

    getConnection(): Observable<Connection> {
        return Observable.create(observer => {
            this._pool.getConnection((err, conn) => {
                if (err) {
                    if (conn && conn.release) {
                        conn.release();
                    }
                    return observer.error(err);
                } else {
                    observer.next(conn);
                    return observer.complete(conn);
                }
            });
        });
    }

    connectionQuery(conn: Connection, query: string, params?: any[]): Observable<any> {
        return Observable.create(observer => {
            conn.query(query, params || [], (error, result) => {
                if (error) {
                    return observer.error(error);
                }
                observer.next(result);
                observer.complete(result); // rebroadcast on complete for async await
            });
        });
    }

    beginTransaction(conn: Connection): Observable<Connection> {
        return Observable.create(obs => {
            conn.beginTransaction((err) => {
                if (err) {
                    return obs.error(err);
                }
                obs.next(conn);
                return obs.complete(conn);
            });
        });
    }

    connectionCommit(conn: Connection): Observable<Connection> {
        return Observable.create(obs => {
            conn.commit((err) => {
                if (err) {
                    return obs.error(err);
                }
                obs.next(conn);
                return obs.complete(conn);
            });
        });
    }

    connectionRollback(conn: Connection): Observable<Connection> {
        return Observable.create(obs => {
            conn.rollback(() => {
                obs.next(conn);
                return obs.complete(conn);
            });
        });
    }

    escape(value) {
        return mysqlEscape(value);
    }

    generatePageQuery(pageNum: number) {
        // We want to get the 1 more than page length, and hide it locally to decide if there is a next page
        return ` LIMIT ${Math.max(pageNum - 1, 0) * NUMPERPAGE}, ${NUMPERPAGE + 1}`;
    }
}
