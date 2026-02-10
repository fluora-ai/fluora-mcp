import { z } from 'zod';
import { Logger } from '../../providers/winston-logger.js';
import { PostHogAnalytics } from '../../providers/posthog/index.js';
import getMcpServers from '../services/mcp-agents.js';
import { ServiceRegistryService } from '../services/service-registry.service.js';
import { Constants } from '../../utils/constants.js';
const ExploreServicesSchema = {
    category: z.string().optional(),
    maxServers: z.number().optional().default(20)
};
if (Constants.ENABLE_UNSAFE_DIRECT_ACCESS) {
    // @ts-expect-error as customServerUrl is only available when unsafe direct access is enabled
    ExploreServicesSchema.customServerUrl = z.string().optional();
}
export const ExploreServicesTool = {
    name: 'exploreServices',
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
    ${Constants.ENABLE_UNSAFE_DIRECT_ACCESS ? '- customServerUrl (optional): Directly explore a server by its URL. This is a **potentially unsafe** operation. Development intent is to allow for quick testing and exploration.' : ''}
  `,
    schema: ExploreServicesSchema,
    execute: async ({ category, maxServers = 20, customServerUrl }) => {
        const logger = new Logger();
        const analytics = new PostHogAnalytics();
        const serviceRegistry = new ServiceRegistryService();
        const startTime = Date.now();
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logger.info('Exploring available services with complete execution information...');
        try {
            // Track the request start
            analytics.trackServiceDiscovery({
                category,
                maxServers,
                sessionId
            });
            let allServers = [];
            const unsafeDirectAccess = Constants.ENABLE_UNSAFE_DIRECT_ACCESS && Boolean(customServerUrl);
            if (unsafeDirectAccess) {
                logger.info(`Using custom server URL: ${customServerUrl}`);
                allServers = [
                    {
                        id: 'custom-server',
                        name: 'Custom Server',
                        description: `Custom server at ${customServerUrl}`,
                        mcp_server_url: customServerUrl,
                        verified: false,
                        categories: 'unknown'
                    }
                ];
            }
            else {
                // Track proxy request
                const proxyStartTime = Date.now();
                try {
                    // Get all available servers
                    allServers = await getMcpServers({ name: '' });
                    // Track successful proxy request
                    analytics.trackProxyRequest('/mcp-agents', {
                        method: 'GET',
                        statusCode: 200,
                        responseTime: Date.now() - proxyStartTime
                    });
                    logger.info(`Found ${allServers.length} total servers`);
                }
                catch (error) {
                    // Track failed proxy request
                    analytics.trackProxyRequest('/mcp-agents', {
                        method: 'GET',
                        statusCode: 500,
                        responseTime: Date.now() - proxyStartTime,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    throw error;
                }
            }
            // Explore and enrich services
            const registry = await serviceRegistry.exploreAndEnrichServices(allServers, category, maxServers, unsafeDirectAccess);
            const executionTime = Date.now() - startTime;
            const stats = serviceRegistry.getServiceStatistics(registry);
            // Track successful completion
            analytics.trackServiceDiscovery({
                category,
                maxServers,
                serversFound: allServers.length,
                servicesFound: registry.totalServicesFound,
                executionTime,
                errors: registry.metadata.errors.map((e) => e.error),
                sessionId
            });
            // Group services by category for better organization
            const servicesByCategory = serviceRegistry.groupServicesByCategory(registry.services);
            // Create enhanced response
            const enhancedResponse = {
                summary: {
                    totalServersFound: allServers.length,
                    serversExplored: registry.totalServersExplored,
                    totalServicesFound: registry.totalServicesFound,
                    executionReadyServices: stats.executionReadyServices,
                    category: category || 'all',
                    exploredAt: registry.metadata.exploredAt
                },
                statistics: stats,
                servicesByCategory,
                allServices: registry.services,
                nextSteps: [
                    "🎯 Use 'useService' to execute any service directly",
                    '💡 All services include complete execution information',
                    '📋 Services are grouped by category for easy browsing',
                    '🌐 Visit server websites for comprehensive documentation'
                ]
            };
            // Include errors if any
            if (registry.metadata.errors.length > 0) {
                enhancedResponse.errors = registry.metadata.errors;
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(enhancedResponse, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            // Track error
            analytics.trackError(error instanceof Error ? error : new Error('Unknown error'), {
                tool: 'exploreServices',
                sessionId
            });
            // Track failed service discovery
            analytics.trackServiceDiscovery({
                category,
                maxServers,
                executionTime,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                sessionId
            });
            logger.error(`Error exploring services: ${error}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: 'Failed to explore services',
                            message: error instanceof Error ? error.message : 'Unknown error',
                            suggestion: 'Try again or contact support if the problem persists'
                        })
                    }
                ]
            };
        }
    }
};
