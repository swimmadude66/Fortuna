import { Writable } from 'stream';
import { isMaster } from 'cluster';
// A simple base logging service.
// To make a custom logger, extends this class and 
// overwrite any applicable methods
export class LoggingService {

    logStream: Writable;

    constructor() {
        this.logStream = new Writable();

        this.logStream.write = (chunk) => {
            if (chunk && chunk.length) {
                this.log(chunk.trim());
            }
            return true
        };
    }

    log(...messages: any[]): void {
        if (isMaster) {
            console.log(...messages);
        } else {
            process.send(['console', ...messages]);
        }
    }

    logError(error: any, preamble?: string): void {
        let e = error.toString();
        if (/^\s?\[\s?object/i.test(e)) {
            try {
                e = JSON.stringify(error);
            } catch (err) {
                // do nothing
            }
        }
        console.error(`ERROR: ${preamble || ''} ${e}`);
    }
}
