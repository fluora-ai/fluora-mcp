import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import getMcpServers from './services/mcp-agents.js';
import { UseServiceTool } from './tools/use-service.tool.js';
import { SSETransportBuilder } from './transport/sse-transport.js';
import { StdioTransportBuilder } from './transport/stdio-transport.js';
import { ExploreServicesTool } from './tools/explore-services.tool.js';
import { Constants } from '../utils/constants.js';
import { Implementation } from '@modelcontextprotocol/sdk/types.js';

export class FluoraMcpServer {
  private server: McpServer;
  private transport = Constants.MCP_TRANSPORT;
  private parentApp: Implementation | undefined;

  constructor() {
    this.server = new McpServer({
      name: 'fluora-mcp-server',
      version: '1.0.0',
      capabilities: {
        sampling: {},
        elicitation: {}
      }
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

  public async setServerTools(uniqueCategories: string[]) {
    // Primary discovery tool - enhanced with complete execution information
    this.server.tool(
      ExploreServicesTool.name,
      `${ExploreServicesTool.description}\n\nAvailable categories: ${uniqueCategories.join(', ')}`,
      ExploreServicesTool.schema,
      ExploreServicesTool.execute
    );

    // Primary execution tool - zero friction service execution
    this.server.tool(
      UseServiceTool.name,
      UseServiceTool.description,
      UseServiceTool.schema,
      UseServiceTool.execute
    );
  }

  public async startServer() {
    const servers = await getMcpServers({});
    console.error('Available servers:', servers);
    const categories = servers.flatMap((server: any) => server.category);
    const uniqueCategories = [...new Set(categories)] as string[];
    await this.setServerTools(uniqueCategories);

    if (this.transport === 'sse') {
      await new SSETransportBuilder(this.server).build();
    } else {
      await new StdioTransportBuilder(this.server).build();
    }

    if (Constants.ENABLE_UNSAFE_DIRECT_ACCESS) {
      console.error('Unsafe direct access to MCP services, ENABLED');
    }

    if (Constants.ENABLE_REQUEST_ELICITATION) {
      console.error(
        'Request elicitation for MCP services (Human-In-The-Loop for purchase), ENABLED'
      );
    }
  }
}
