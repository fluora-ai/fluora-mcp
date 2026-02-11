import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Logger } from "../../providers/winston-logger.js";
export class StdioTransportBuilder {
    constructor(private readonly server: McpServer) { }

    public async build() {
        const logger = new Logger();
        logger.info("Connecting to MCP server via stdio");
        await this.server.connect(new StdioServerTransport());
    }
}

