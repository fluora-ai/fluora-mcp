import { z } from "zod";
import { Logger } from "../../providers/winston-logger.js";
import getMcpServers from "../services/mcp-agents.js";
import { ServiceRegistryService } from "../services/service-registry.service.js";
import { Constants } from "../../utils/constants.js";
const ExploreServicesSchema = {
    category: z.string().optional(),
    maxServers: z.number().optional().default(5),
};
if (Constants.ENABLE_UNSAFE_DIRECT_ACCESS) {
    // @ts-expect-error as customServerUrl is only available when unsafe direct access is enabled
    ExploreServicesSchema.customServerUrl = z.string().optional();
}
export const ExploreServicesTool = {
    name: "exploreServices",
    description: `
    🌟 MAIN DISCOVERY TOOL - Start here to explore available services!
    
    Automatically discover what business services are available in the Fluora ecosystem.
    This tool reduces friction by showing you real business capabilities with complete execution information.
    
    ✨ What you get:
    - Real services you can use (like "Convert PDF", "Get Token Price")
    - Clear descriptions and pricing
    - Required parameters for each service
    - Complete execution information (server URLs, wallet addresses)
    - Direct path to execution via 'useService' tool
    
    🎯 Perfect for:
    - First-time users exploring what's available
    - Finding services by category (PDF, DeFi, Data, etc.)
    - Getting started quickly without technical complexity
    
    Parameters:
    - category (optional): Filter by "PDF", "DeFi", "Data", etc. To look up all services, provide an empty string for category ("").
    - maxServers (optional): Limit results (default: 5)
    ${Constants.ENABLE_UNSAFE_DIRECT_ACCESS ? "- customServerUrl (optional): Directly explore a server by its URL. This is a **potentially unsafe** operation. Development intent is to allow for quick testing and exploration." : ""}
  `,
    schema: ExploreServicesSchema,
    execute: async ({ category, maxServers = 5, customServerUrl, }) => {
        const logger = new Logger();
        const serviceRegistry = new ServiceRegistryService();
        logger.info("Exploring available services with complete execution information...");
        try {
            let allServers = [];
            const unsafeDirectAccess = Constants.ENABLE_UNSAFE_DIRECT_ACCESS && Boolean(customServerUrl);
            if (unsafeDirectAccess) {
                logger.info(`Using custom server URL: ${customServerUrl}`);
                allServers = [
                    {
                        id: "custom-server",
                        name: "Custom Server",
                        description: `Custom server at ${customServerUrl}`,
                        mcp_server_url: customServerUrl,
                        verified: false,
                        categories: "unknown",
                    },
                ];
            }
            else {
                // Get all available servers
                allServers = await getMcpServers({ name: "" });
                logger.info(`Found ${allServers.length} total servers`);
            }
            // Explore and enrich services
            const registry = await serviceRegistry.exploreAndEnrichServices(allServers, category, maxServers, unsafeDirectAccess);
            // Get statistics
            const stats = serviceRegistry.getServiceStatistics(registry);
            // Group services by category for better organization
            const servicesByCategory = serviceRegistry.groupServicesByCategory(registry.services);
            // Create enhanced response
            const enhancedResponse = {
                summary: {
                    totalServersFound: allServers.length,
                    serversExplored: registry.totalServersExplored,
                    totalServicesFound: registry.totalServicesFound,
                    executionReadyServices: stats.executionReadyServices,
                    category: category || "all",
                    exploredAt: registry.metadata.exploredAt,
                },
                statistics: stats,
                servicesByCategory,
                allServices: registry.services,
                nextSteps: [
                    "🎯 Use 'useService' to execute any service directly",
                    "💡 All services include complete execution information",
                    "📋 Services are grouped by category for easy browsing",
                    "🌐 Visit server websites for comprehensive documentation",
                ],
            };
            // Include errors if any
            if (registry.metadata.errors.length > 0) {
                enhancedResponse.errors = registry.metadata.errors;
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(enhancedResponse, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error(`Error exploring services: ${error}`);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: "Failed to explore services",
                            message: error instanceof Error ? error.message : "Unknown error",
                            suggestion: "Try again or contact support if the problem persists",
                        }),
                    },
                ],
            };
        }
    },
};
