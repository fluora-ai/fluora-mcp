import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from 'express';
import { Logger } from "../../providers/winston-logger.js";

const app = express();

export class SSETransportBuilder {

    constructor(private readonly server: McpServer) { }

    public async build() {
        const logger = new Logger();
        const transports: { [sessionId: string]: SSEServerTransport } = {};
        const { MCP_PORT = 3001 } = process.env;

        app.get('/sse', async (_: Request, res: Response) => {
            const transport = new SSEServerTransport('/messages', res);
            transports[transport.sessionId] = transport;
            res.on('close', () => {
                delete transports[transport.sessionId];
            });
            await this.server.connect(transport);
        });

        app.post('/messages', async (req: Request, res: Response) => {
            const sessionId = req.query.sessionId as string;
            const transport = transports[sessionId];
            if (transport) {
                await transport.handlePostMessage(req, res);
            } else {
                res.status(400).send('No transport found for sessionId');
            }
        });

        const server = app.listen(MCP_PORT, () => {
            logger.info(`MCP SSE Transport initialized on port ${MCP_PORT}`);
        });

        server.on('listening', () => {
            console.error(`SSE server listening on`, server.address());
        });
    }
}