import path from "path";
import winston from "winston";
import os from "os";
import { Constants } from "../utils/constants.js";
export class Logger {
    logger;
    constructor() {
        this.logger = winston.createLogger({
            level: Constants.LOG_LEVEL,
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            transports: [
                new winston.transports.File({
                    dirname: path.join(os.homedir(), ".fluora"),
                    filename: "fluora-mcp.log",
                    maxsize: 1000000,
                    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                }),
            ],
        });
    }
    info(message) {
        this.logger.info(message);
    }
    error(message) {
        this.logger.error(message);
    }
    warn(message) {
        this.logger.warn(message);
    }
    debug(message) {
        this.logger.debug(message);
    }
}
