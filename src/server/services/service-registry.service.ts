import { Logger } from "../../providers/winston-logger.js";
import { ServerCompatibilityService } from "./server-compatibility.service.js";
import { 
  EnrichedService, 
  ServiceRegistry, 
  ServerInfo 
} from "../types/service-registry.js";

export class ServiceRegistryService {
  private logger: Logger;
  private compatibilityService: ServerCompatibilityService;

  constructor() {
    this.logger = new Logger();
    this.compatibilityService = new ServerCompatibilityService();
  }

  /**
   * Explores and enriches services from multiple servers
   */
  async exploreAndEnrichServices(
    servers: any[], 
    category?: string, 
    maxServers: number = 5,
    isUnsafeDirectAccess = false
  ): Promise<ServiceRegistry> {
    const startTime = Date.now();
    this.logger.info(`Starting service exploration for ${servers.length} servers`);

    let serversToExplore = servers;

    // Filter by category if specified, but not for direct access
    if (category && !isUnsafeDirectAccess) {
      serversToExplore = servers.filter((server: any) => 
        server.categories?.toLowerCase().includes(category.toLowerCase()) ||
        server.description?.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Limit the number of servers, but not for direct access
    if (!isUnsafeDirectAccess) {
      serversToExplore = serversToExplore.slice(0, maxServers);
    }

    const enrichedServices: EnrichedService[] = [];
    const errors: Array<{ serverName: string; error: string }> = [];
    let totalServicesFound = 0;

    // Process servers in parallel for better performance
    this.logger.info(`Starting parallel exploration of ${serversToExplore.length} servers`);
    
    const serverPromises = serversToExplore.map(async (server): Promise<{
      success: true;
      serverName: string;
      services: EnrichedService[];
    } | {
      success: false;
      serverName: string;
      error: string;
    }> => {
      try {
        this.logger.info(`Exploring server: ${server.name}`);
        const serverServices = await this.exploreServerServices(server);
        this.logger.info(`Successfully explored ${server.name}, found ${serverServices.length} services`);
        
        return {
          success: true,
          serverName: server.name,
          services: serverServices
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to explore server ${server.name}: ${errorMessage}`);
        
        return {
          success: false,
          serverName: server.name,
          error: errorMessage
        };
      }
    });

    // Wait for all server explorations to complete
    const results = await Promise.allSettled(serverPromises);
    
    // Process results and collect services/errors
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const serverResult = result.value;
        if (serverResult.success) {
          enrichedServices.push(...serverResult.services);
          totalServicesFound += serverResult.services.length;
        } else {
          errors.push({
            serverName: serverResult.serverName,
            error: serverResult.error
          });
        }
      } else {
        // This handles the case where the promise itself was rejected
        this.logger.error(`Promise rejection during server exploration: ${result.reason}`);
        errors.push({
          serverName: 'Unknown server',
          error: result.reason?.toString() || 'Promise rejection'
        });
      }
    }

    const executionTime = Date.now() - startTime;
    this.logger.info(`Service exploration completed in ${executionTime}ms. Found ${totalServicesFound} services from ${serversToExplore.length} servers`);

    return {
      totalServersExplored: serversToExplore.length,
      totalServicesFound,
      category,
      services: enrichedServices,
      metadata: {
        exploredAt: new Date().toISOString(),
        errors
      }
    };
  }

  /**
   * Explores services from a single server and enriches them with execution data
   */
  private async exploreServerServices(server: any): Promise<EnrichedService[]> {
    let client;
    const serverStartTime = Date.now();
    
    try {
      // Connect to server
      client = await this.compatibilityService.connectToServer(server.mcp_server_url);

      // Get pricing data (handles both naming conventions)
      const pricingData = await this.compatibilityService.getPricingData(client);
      
      // Get payment methods
      const paymentMethods = await this.compatibilityService.getPaymentMethods(client);

      this.logger.info(`Server ${server.name}: Data fetched, processing ${pricingData.items.length} services in parallel`);

      // Create server info
      const serverInfo: ServerInfo = {
        mcpServerUrl: server.mcp_server_url,
        serverId: server.id,
        serverName: server.name,
        verified: server.verified || false,
        categories: server.categories || ""
      };

      // Enrich each service with execution data in parallel
      const servicePromises = pricingData.items.map(async (rawService): Promise<EnrichedService> => {
        try {
          // Normalize service data
          const normalizedService = this.compatibilityService.normalizeServiceData(rawService);

          // Find matching payment info
          const paymentInfo = this.compatibilityService.findMatchingPayment(
            normalizedService.price.paymentMethod, 
            paymentMethods
          );

          // Create enriched service
          const enrichedService: EnrichedService = {
            ...normalizedService,
            serverInfo,
            paymentInfo,
            executionReady: true,
            category: this.extractPrimaryCategory(server.categories || "")
          };

          return enrichedService;
        } catch (error) {
          this.logger.warn(`Failed to enrich service ${rawService.id}: ${error}`);
          // Still add the service but mark it as not execution ready
          const normalizedService = this.compatibilityService.normalizeServiceData(rawService);
          return {
            ...normalizedService,
            serverInfo,
            paymentInfo: { walletAddress: "", paymentMethod: normalizedService.price.paymentMethod },
            executionReady: false,
            category: this.extractPrimaryCategory(server.categories || "")
          };
        }
      });

      // Wait for all services to be enriched
      const enrichedServices = await Promise.all(servicePromises);
      
      const serverExecutionTime = Date.now() - serverStartTime;
      this.logger.info(`Server ${server.name}: Completed processing ${enrichedServices.length} services in ${serverExecutionTime}ms`);

      return enrichedServices;

    } finally {
      if (client) {
        await this.compatibilityService.safeDisconnect(client);
      }
    }
  }

  /**
   * Finds a service by ID across all registered services
   */
  findServiceById(services: EnrichedService[], serviceId: string): EnrichedService | null {
    return services.find(service => service.id === serviceId) || null;
  }

  /**
   * Validates that a service is ready for execution
   */
  validateServiceExecution(service: EnrichedService): void {
    if (!service.executionReady) {
      throw new Error(`Service ${service.id} is not ready for execution. Missing payment information.`);
    }

    if (!service.paymentInfo.walletAddress) {
      throw new Error(`Service ${service.id} is missing wallet address for payment method ${service.paymentInfo.paymentMethod}`);
    }

    if (!service.serverInfo.mcpServerUrl) {
      throw new Error(`Service ${service.id} is missing server URL`);
    }
  }

  /**
   * Groups services by category for better organization
   */
  groupServicesByCategory(services: EnrichedService[]): Record<string, EnrichedService[]> {
    const grouped: Record<string, EnrichedService[]> = {};

    for (const service of services) {
      const category = service.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    }

    return grouped;
  }

  /**
   * Extracts the primary category from a categories string
   */
  private extractPrimaryCategory(categories: string): string {
    if (!categories) return 'Other';
    
    const categoryList = categories.split(',').map(cat => cat.trim());
    return categoryList[0] || 'Other';
  }

  /**
   * Filters services by execution readiness
   */
  getExecutionReadyServices(services: EnrichedService[]): EnrichedService[] {
    return services.filter(service => service.executionReady);
  }

  /**
   * Gets service statistics
   */
  getServiceStatistics(registry: ServiceRegistry): {
    totalServices: number;
    executionReadyServices: number;
    categoriesCount: number;
    serversWithErrors: number;
    averageServicesPerServer: number;
  } {
    const executionReadyServices = this.getExecutionReadyServices(registry.services);
    const categories = new Set(registry.services.map(s => s.category));

    return {
      totalServices: registry.totalServicesFound,
      executionReadyServices: executionReadyServices.length,
      categoriesCount: categories.size,
      serversWithErrors: registry.metadata.errors.length,
      averageServicesPerServer: registry.totalServersExplored > 0 
        ? Math.round(registry.totalServicesFound / registry.totalServersExplored) 
        : 0
    };
  }
}
