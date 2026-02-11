import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { FluoraMcpClient } from './client.interface.js';
export class FluoraMcpClientSSE implements FluoraMcpClient {
  private client: Client;
  private transport: SSEClientTransport | undefined;
  constructor() {
    this.client = new Client(
      {
        name: "fluora-mcp-sse-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );
    this.transport = undefined;
  }

  public async setTransport(transport: SSEClientTransport) {
    this.transport = transport;
  }

  public async callTool(toolName: string, toolParams?: any) {
    const result = await this.client.callTool({
      name: toolName,
      arguments: { ...toolParams },
    });
    return result;
  }

  public async connect(mcpServerUrl: string) {
    this.transport = new SSEClientTransport(new URL(mcpServerUrl + "/sse"));
    await this.client.connect(this.transport);
  }

  public async disconnect() {
    await this.client.close();
  }

  public async listTools() {
    const result = await this.client.listTools();
    return result;
  }
}
