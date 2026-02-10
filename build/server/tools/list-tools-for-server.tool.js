import { FluoraMcpClient } from "../../client/client.js";
import { z } from "zod";
const ListToolsForServerSchema = {
    serverName: z.string(),
    mcpServerUrl: z.string(),
};
export const ListToolsForServerTool = {
    name: "listToolsForServer",
    description: 'List all tools for a server',
    schema: ListToolsForServerSchema,
    execute: async ({ serverName, mcpServerUrl }) => {
        console.error('Listing tools for server:', { serverName });
        const client = new FluoraMcpClient();
        await client.connect(mcpServerUrl);
        const toolResult = await client.listTools();
        await client.disconnect();
        return {
            content: [{ type: "text", text: JSON.stringify(toolResult) }],
        };
    }
};
