import { z } from "zod";
import { Logger } from "../../providers/winston-logger.js";
import { FluoraMcpClientSSE } from "../../client/client-sse.js";
import { FluoraMcpClientStreamable } from "../../client/client-streamable.js";
const ListServerToolsSchema = {
    serverName: z.string(),
    mcpServerUrl: z.string(),
};
export const ListServerToolsTool = {
    name: "listServerTools",
    description: "List all tools for a server",
    schema: ListServerToolsSchema,
    execute: async ({ serverName, mcpServerUrl, }) => {
        const logger = new Logger();
        logger.info(`Listing server tools for server: ${serverName}`);
        var client;
        try {
            client = new FluoraMcpClientStreamable();
            await client.connect(mcpServerUrl);
            logger.info("Connected using streamable client");
        }
        catch (error) {
            client = new FluoraMcpClientSSE();
            await client.connect(mcpServerUrl);
            logger.info("Connected using sse client");
        }
        const toolResult = await client.listTools();
        logger.info(`Tools: ${JSON.stringify(toolResult, null, 2)}`);
        await client.disconnect();
        return {
            content: [{ type: "text", text: JSON.stringify(toolResult) }],
        };
    },
};
