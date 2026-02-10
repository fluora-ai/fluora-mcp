import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Logger } from "../../providers/winston-logger.js";
export class StdioTransportBuilder {
    server;
    constructor(server) {
        this.server = server;
    }
    async build() {
        const logger = new Logger();
        logger.info("Connecting to MCP server via stdio");
        await this.server.connect(new StdioServerTransport());
    }
}
