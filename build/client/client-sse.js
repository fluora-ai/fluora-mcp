import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
export class FluoraMcpClientSSE {
    client;
    transport;
    constructor() {
        this.client = new Client({
            name: "fluora-mcp-sse-client",
            version: "1.0.0",
        }, {
            capabilities: {
                prompts: {},
                resources: {},
                tools: {},
            },
        });
        this.transport = undefined;
    }
    async setTransport(transport) {
        this.transport = transport;
    }
    async callTool(toolName, toolParams) {
        const result = await this.client.callTool({
            name: toolName,
            arguments: { ...toolParams },
        });
        return result;
    }
    async connect(mcpServerUrl) {
        this.transport = new SSEClientTransport(new URL(mcpServerUrl + "/sse"));
        await this.client.connect(this.transport);
    }
    async disconnect() {
        await this.client.close();
    }
    async listTools() {
        const result = await this.client.listTools();
        return result;
    }
}
