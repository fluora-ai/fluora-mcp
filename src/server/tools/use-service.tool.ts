import { z } from 'zod';
import { MCPTool } from '../types/mcp-tools.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../../providers/winston-logger.js';
import { PostHogAnalytics } from '../../providers/posthog/index.js';
import { ServiceExecutionService } from '../services/service-execution.service.js';
import { ServiceRegistryService } from '../services/service-registry.service.js';
import getMcpServers from '../services/mcp-agents.js';
import { ServiceExecutionRequest } from '../types/service-registry.js';
import { Constants } from '../../utils/constants.js';

const UseServiceSchema = {
  serviceId: z.string().describe('Service ID from exploreServices result'),
  serverUrl: z.string().describe('Server URL from exploreServices result'),
  serverId: z.string().describe('Server ID from exploreServices result'),
  params: z
    .record(z.any())
    .describe('Service-specific parameters as defined in the service schema')
};

if (Constants.ENABLE_UNSAFE_DIRECT_ACCESS) {
  // @ts-expect-error as customServerUrl is only available when unsafe direct access is enabled
  UseServiceSchema.customServerUrl = z
    .string()
    .optional()
    .describe(
      'Directly explore a server by its URL. This is a **potentially unsafe** operation. Development intent is to allow for quick testing and exploration.'
    );
}

if (Constants.ENABLE_REQUEST_ELICITATION) {
  // @ts-expect-error as paymentConfirmed is only available when request elicitation is enabled
  UseServiceSchema.paymentConfirmed = z
    .boolean()
    .optional()
    .describe(
      'Set `true` ONLY after user explicitly confirms payment, `false` to cancel, or omit for initial cost check. Do NOT set to true automatically.'
    );
}

export const UseServiceTool: MCPTool = {
  name: 'useService',
  description: `
    🚀 FRICTIONLESS SERVICE EXECUTION - Execute any discovered service instantly!
    
    This tool provides zero-friction service execution by handling all the complexity internally:
    - Automatic payment processing and transaction signing
    - Server connection and protocol handling
    - Parameter validation and error handling
    - Complete execution with real-time status updates

    ${
      Constants.ENABLE_REQUEST_ELICITATION
        ? `⚠️ **IMPORTANT**: When the cost is above the threshold (${Constants.ELICITATION_THRESHOLD}), this tool will FIRST return a confirmation request. Only call again with paymentConfirmed: true after the user explicitly confirms the payment.`
        : ''
    }
        
    ✨ What it does automatically:
    - Validates service availability and parameters
    - Handles payment method selection and wallet management
    - Signs blockchain transactions securely
    - Executes the service and returns results
    - Provides detailed execution feedback including costs
    
    🎯 Perfect for:
    - Instant service execution after discovery via 'exploreServices'
    - Production workflows requiring reliable service calls
    - Applications needing automated service orchestration
    
    📋 Required Information (from exploreServices):
    - serviceId: The unique identifier of the service to execute
    - serverUrl: The MCP server URL hosting the service
    - serverId: The server's unique identifier
    - params: Object containing service-specific parameters
    ${Constants.ENABLE_UNSAFE_DIRECT_ACCESS ? '- customServerUrl (optional): Directly explore a server by its URL. This is a **potentially unsafe** operation. Development intent is to allow for quick testing and exploration.' : ''}
    ${Constants.ENABLE_REQUEST_ELICITATION ? '- paymentConfirmed (optional): Set `true` ONLY after user explicitly confirms payment, `false` to cancel, or omit for initial cost check.' : ''}


    💡 Usage Flow:
    1. First run 'exploreServices' to discover available services
    2. Copy the serviceId, serverUrl, and serverId from the desired service
    3. Prepare the params object according to the service's parameter schema
    ${Constants.ENABLE_REQUEST_ELICITATION ? '4. Call this tool WITHOUT paymentConfirmed to get cost estimate and confirmation request' : ''}
    ${Constants.ENABLE_REQUEST_ELICITATION ? '5. If confirmation is required, wait for user to confirm, then call again with paymentConfirmed: true' : '4. Execute this tool with all the information'}
    
    ⚡ Example:
    After exploreServices shows a PDF conversion service, use:
    {
      "serviceId": "1",
      "serverUrl": "https://server.example.com",
      "serverId": "abc-123",
      "params": { "websiteUrl": "https://example.com" }
    }
  `,
  schema: UseServiceSchema,
  execute: async ({
    serviceId,
    serverUrl,
    serverId,
    params,
    customServerUrl,
    paymentConfirmed
  }: {
    serviceId: string;
    serverUrl: string;
    serverId: string;
    params: Record<string, any>;
    customServerUrl?: string;
    paymentConfirmed?: boolean;
  }): Promise<CallToolResult> => {
    const logger = new Logger();
    const analytics = new PostHogAnalytics();
    const serviceExecution = new ServiceExecutionService();
    const serviceRegistry = new ServiceRegistryService();

    const startTime = Date.now();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`Starting service execution for ${serviceId} on ${serverUrl}`);

    try {
      // Track execution start
      analytics.trackServiceExecution({
        serviceId,
        serverId,
        serverUrl,
        sessionId
      });
      // Step 1: Validate input parameters
      if (!serviceId || !serverUrl || !serverId) {
        throw new Error(
          'Missing required parameters: serviceId, serverUrl, and serverId are all required'
        );
      }

      // Step 2: Determine if using unsafe direct access
      const unsafeDirectAccess =
        Constants.ENABLE_UNSAFE_DIRECT_ACCESS && Boolean(customServerUrl);
      let targetServer: any;

      if (unsafeDirectAccess) {
        // Use custom server URL for direct access
        logger.info(
          `Using custom server URL for direct access: ${customServerUrl}`
        );
        targetServer = {
          id: serverId,
          name: 'Custom Server',
          description: `Custom server at ${customServerUrl}`,
          mcp_server_url: customServerUrl,
          verified: false,
          categories: 'custom'
        };
      } else {
        // Step 2: Find and validate the service by discovering it from registered servers
        logger.info('Validating service availability...');
        const servers = await getMcpServers({ id: serverId });
        targetServer = servers.find((s: any) => s.id === serverId);

        if (!targetServer) {
          throw new Error(`Server with ID ${serverId} not found`);
        }
      }

      // Step 3: Re-discover services to get current execution information
      const registry = await serviceRegistry.exploreAndEnrichServices(
        [targetServer],
        undefined,
        1,
        unsafeDirectAccess
      );
      const service = serviceRegistry.findServiceById(
        registry.services,
        serviceId
      );

      if (!service) {
        throw new Error(
          `Service ${serviceId} not found on server ${targetServer.name}`
        );
      }

      // Step 4: Validate service is execution ready
      serviceRegistry.validateServiceExecution(service);

      // Step 5: Show cost information before execution
      const costEstimate = serviceExecution.getExecutionCostEstimate(service);
      logger.info(
        `Service execution cost: ${costEstimate.amount} ${costEstimate.currency} via ${costEstimate.paymentMethod}`
      );

      // Step 6: Validate wallet availability for payment method
      if (
        !serviceExecution.validateWalletAvailability(
          service.price.paymentMethod
        )
      ) {
        throw new Error(
          `No wallet configured for payment method: ${service.price.paymentMethod}`
        );
      }

      // Step 6.5: Handle payment confirmation when request elicitation is enabled
      if (Constants.ENABLE_REQUEST_ELICITATION) {
        // Check if paymentConfirmed is provided and validate it
        if (
          paymentConfirmed === undefined &&
          costEstimate.amount >= Constants.ELICITATION_THRESHOLD
        ) {
          logger.info(
            `Request elicitation enabled. Payment confirmation required to execute service ${serviceId}...`
          );

          // Track payment confirmation request
          analytics.trackPaymentConfirmation({
            serviceId,
            confirmed: false,
            amount: costEstimate.amount,
            paymentMethod: costEstimate.paymentMethod,
            sessionId
          });

          // Return a confirmation request instead of automatically proceeding
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ **PAYMENT CONFIRMATION REQUIRED** ⚠️

Service: ${service.name}
Cost: ${costEstimate.amount} ${costEstimate.currency}
Payment Method: ${costEstimate.paymentMethod}
Server: ${service.serverInfo.serverName}

This service execution requires your explicit confirmation because the cost (${costEstimate.amount}) is above the elicitation threshold (${Constants.ELICITATION_THRESHOLD}).

**DO NOT PROCEED AUTOMATICALLY** - Wait for user confirmation.

To proceed with this payment, the user must explicitly confirm. Only then should you call the useService tool again with the same parameters plus \`paymentConfirmed: true\`.

To cancel, call the useService tool again with the same parameters plus \`paymentConfirmed: false\`.

**IMPORTANT**: Do not automatically set paymentConfirmed to true. Wait for the user's explicit confirmation.`
              }
            ]
          };
        } else if (paymentConfirmed === false) {
          // User explicitly declined payment
          logger.info(
            `Payment explicitly declined for service execution ${serviceId}`
          );

          // Track payment decline
          analytics.trackPaymentConfirmation({
            serviceId,
            confirmed: false,
            amount: costEstimate.amount,
            paymentMethod: costEstimate.paymentMethod,
            sessionId
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    cancelled: true,
                    message: 'Service execution cancelled - payment declined.',
                    serviceInfo: {
                      id: service.id,
                      name: service.name,
                      description: service.description,
                      serverName: service.serverInfo.serverName
                    }
                  },
                  null,
                  2
                )
              }
            ]
          };
        } else if (paymentConfirmed === true) {
          // paymentConfirmed === true, proceed with execution
          logger.info(
            `Payment confirmation received for service ${serviceId}. Proceeding with execution...`
          );

          // Track payment confirmation
          analytics.trackPaymentConfirmation({
            serviceId,
            confirmed: true,
            amount: costEstimate.amount,
            paymentMethod: costEstimate.paymentMethod,
            sessionId
          });
        } else {
          // paymentConfirmed is undefined but cost is below threshold, proceed automatically
          logger.info(
            `Cost ${costEstimate.amount} is below elicitation threshold ${Constants.ELICITATION_THRESHOLD}. Proceeding automatically...`
          );
        }
      }

      // Step 7: Execute the service
      const executionRequest: ServiceExecutionRequest = {
        serviceId,
        serverUrl,
        serverId,
        params
      };

      const result = await serviceExecution.executeService(
        executionRequest,
        service
      );

      // Step 8: Format and return the result
      const totalExecutionTime = Date.now() - startTime;

      if (result.success) {
        logger.info(
          `Service ${serviceId} executed successfully in ${totalExecutionTime}ms`
        );

        // Track successful execution
        analytics.trackServiceExecution({
          serviceId,
          serverId,
          serverUrl,
          executionTime: totalExecutionTime,
          success: true,
          paymentMethod: service.price.paymentMethod,
          amount: service.price.amount,
          transactionCost: result.transactionCost,
          sessionId
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  serviceInfo: {
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    serverName: service.serverInfo.serverName
                  },
                  executionDetails: {
                    totalExecutionTime,
                    serviceExecutionTime: result.executionTime,
                    transactionCost: result.transactionCost,
                    paymentMethod: service.price.paymentMethod
                  },
                  result: result.result,
                  message: `✅ Service executed successfully! Cost: ${result.transactionCost}`
                },
                null,
                2
              )
            }
          ]
        };
      } else {
        logger.error(`Service ${serviceId} execution failed: ${result.error}`);

        // Track failed execution
        analytics.trackServiceExecution({
          serviceId,
          serverId,
          serverUrl,
          executionTime: totalExecutionTime,
          success: false,
          error: result.error,
          sessionId
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  serviceInfo: {
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    serverName: service.serverInfo.serverName
                  },
                  error: result.error,
                  executionTime: totalExecutionTime,
                  suggestion:
                    'Check the error message and try again. Ensure all parameters are correct and the service is available.'
                },
                null,
                2
              )
            }
          ]
        };
      }
    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Track error
      analytics.trackError(
        error instanceof Error ? error : new Error(errorMessage),
        {
          tool: 'useService',
          serviceId,
          serverId,
          sessionId
        }
      );

      // Track failed execution
      analytics.trackServiceExecution({
        serviceId,
        serverId,
        serverUrl,
        executionTime: totalExecutionTime,
        success: false,
        error: errorMessage,
        sessionId
      });

      logger.error(
        `Service execution failed for ${serviceId}: ${errorMessage}`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
                executionTime: totalExecutionTime,
                serviceId,
                serverUrl,
                suggestions: [
                  'Ensure the service ID, server URL, and server ID are correct (from exploreServices)',
                  'Check that all required parameters are provided according to the service schema',
                  'Verify the service is still available by running exploreServices again',
                  'Contact support if the problem persists'
                ]
              },
              null,
              2
            )
          }
        ]
      };
    }
  }
};
