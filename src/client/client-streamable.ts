import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FluoraMcpClient } from "./client.interface.js";

export class FluoraMcpClientStreamable implements FluoraMcpClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | undefined;
  constructor() {
    this.client = new Client(
      {
        name: "fluora-mcp-streamable-client",
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

  public async setTransport(transport: StreamableHTTPClientTransport) {
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
    this.transport = new StreamableHTTPClientTransport(
      new URL(mcpServerUrl + "/mcp")
    );
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
