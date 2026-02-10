import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from 'express';
import { Logger } from "../../providers/winston-logger.js";
const app = express();
export class SSETransportBuilder {
    server;
    constructor(server) {
        this.server = server;
    }
    async build() {
        const logger = new Logger();
        const transports = {};
        const { MCP_PORT = 3001 } = process.env;
        app.get('/sse', async (_, res) => {
            const transport = new SSEServerTransport('/messages', res);
            transports[transport.sessionId] = transport;
            res.on('close', () => {
                delete transports[transport.sessionId];
            });
            await this.server.connect(transport);
        });
        app.post('/messages', async (req, res) => {
            const sessionId = req.query.sessionId;
            const transport = transports[sessionId];
            if (transport) {
                await transport.handlePostMessage(req, res);
            }
            else {
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
