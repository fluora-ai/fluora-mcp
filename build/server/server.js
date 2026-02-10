import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import getMcpServers from './services/mcp-agents.js';
import { UseServiceTool } from './tools/use-service.tool.js';
import { SSETransportBuilder } from './transport/sse-transport.js';
import { StdioTransportBuilder } from './transport/stdio-transport.js';
import { ExploreServicesTool } from './tools/explore-services.tool.js';
import { Constants } from '../utils/constants.js';
export class FluoraMcpServer {
    server;
    transport = Constants.MCP_TRANSPORT;
    parentApp;
    constructor() {
        this.server = new McpServer({
            name: 'fluora-mcp-server',
            version: '1.0.0'
        });
        if (this.transport === 'stdio') {
            this.server.server.oninitialized = () => {
                const hostApp = this.server.server.getClientVersion();
                console.error('Host app:', hostApp);
                console.error('Host app name:', hostApp?.name);
                console.error('Host app version:', hostApp?.version);
                this.parentApp = hostApp;
            };
        }
    }
    async setServerTools(uniqueCategories) {
        // Primary discovery tool - enhanced with complete execution information
        this.server.tool(ExploreServicesTool.name, `${ExploreServicesTool.description}\n\nAvailable categories: ${uniqueCategories.join(', ')}`, ExploreServicesTool.schema, ExploreServicesTool.execute);
        // Primary execution tool - zero friction service execution
        this.server.tool(UseServiceTool.name, UseServiceTool.description, UseServiceTool.schema, UseServiceTool.execute);
    }
    async startServer() {
        const servers = await getMcpServers({});
        console.error('Available servers:', servers);
        const categories = servers.flatMap((server) => server.category);
        const uniqueCategories = [...new Set(categories)];
        await this.setServerTools(uniqueCategories);
        if (this.transport === 'sse') {
            await new SSETransportBuilder(this.server).build();
        }
        else {
            await new StdioTransportBuilder(this.server).build();
        }
        if (Constants.ENABLE_UNSAFE_DIRECT_ACCESS) {
            console.error('Unsafe direct access to MCP services, ENABLED');
        }
        if (Constants.ENABLE_REQUEST_ELICITATION) {
            console.error('Request elicitation for MCP services (Human-In-The-Loop for purchase), ENABLED');
        }
    }
}
