import getMcpServers from "../services/mcp-agents.js";
import { z } from "zod";
import { Logger } from "../../providers/winston-logger.js";
const SearchFluoraSchema = {
    name: z.string().optional(),
};
export const SearchFluoraTool = {
    name: "searchFluora",
    description: `
    Search for Fluora servers by name. 
    After successful execution, return the following information:
      - The server id
      - The server name
      - The server description
      - The server website
      - If the server is verified
      - The server wallet address
    Available categories: 
  `,
    schema: SearchFluoraSchema,
    execute: async ({ name }) => {
        const logger = new Logger();
        logger.info("Searching for Fluora servers...");
        const mcpServers = await getMcpServers({ name });
        logger.info(`Found ${mcpServers.length} servers`);
        return {
            content: [{ type: "text", text: JSON.stringify(mcpServers) }],
        };
    },
};
