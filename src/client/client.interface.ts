export interface FluoraMcpClient {
  connect(mcpServerUrl: string): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<any>;
  callTool(toolName: string, toolParams?: any): Promise<any>;
}
