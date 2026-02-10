import { z } from 'zod';
import { Logger } from '../../providers/winston-logger.js';
import { ServiceExecutionService } from '../services/service-execution.service.js';
import { ServiceRegistryService } from '../services/service-registry.service.js';
import getMcpServers from '../services/mcp-agents.js';
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
        .describe('Directly explore a server by its URL. This is a **potentially unsafe** operation. Development intent is to allow for quick testing and exploration.');
}
if (Constants.ENABLE_REQUEST_ELICITATION) {
    // @ts-expect-error as paymentConfirmed is only available when request elicitation is enabled
    UseServiceSchema.paymentConfirmed = z
        .boolean()
        .optional()
        .describe('Set `true` after user confirms payment, `false` to cancel, or omit for estimates. Show price first.');
}
export const UseServiceTool = {
    name: 'useService',
    description: `
    🚀 FRICTIONLESS SERVICE EXECUTION - Execute any discovered service instantly!
    
    This tool provides zero-friction service execution by handling all the complexity internally:
    - Automatic payment processing and transaction signing
    - Server connection and protocol handling
    - Parameter validation and error handling
    - Complete execution with real-time status updates

    Before using this tool, you must prompt the user to confirm the service execution, including the estimated cost and payment method.
        
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
    ${Constants.ENABLE_REQUEST_ELICITATION ? '- paymentConfirmed (required): Set `true` after user confirms payment, `false` to cancel, or omit for estimates. Show price first.' : ''}


    💡 Usage Flow:
    1. First run 'exploreServices' to discover available services
    2. Copy the serviceId, serverUrl, and serverId from the desired service
    3. Prepare the params object according to the service's parameter schema
    4. Confirm the payment amount and method when prompted
    5. Execute this tool with all the information
    
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
    execute: async ({ serviceId, serverUrl, serverId, params, customServerUrl, paymentConfirmed }) => {
        const logger = new Logger();
        const serviceExecution = new ServiceExecutionService();
        const serviceRegistry = new ServiceRegistryService();
        const startTime = Date.now();
        logger.info(`Starting service execution for ${serviceId} on ${serverUrl}`);
        try {
            // Step 1: Validate input parameters
            if (!serviceId || !serverUrl || !serverId) {
                throw new Error('Missing required parameters: serviceId, serverUrl, and serverId are all required');
            }
            // Step 2: Determine if using unsafe direct access
            const unsafeDirectAccess = Constants.ENABLE_UNSAFE_DIRECT_ACCESS && Boolean(customServerUrl);
            let targetServer;
            if (unsafeDirectAccess) {
                // Use custom server URL for direct access
                logger.info(`Using custom server URL for direct access: ${customServerUrl}`);
                targetServer = {
                    id: serverId,
                    name: 'Custom Server',
                    description: `Custom server at ${customServerUrl}`,
                    mcp_server_url: customServerUrl,
                    verified: false,
                    categories: 'custom'
                };
            }
            else {
                // Step 2: Find and validate the service by discovering it from registered servers
                logger.info('Validating service availability...');
                const servers = await getMcpServers({ id: serverId });
                targetServer = servers.find((s) => s.id === serverId);
                if (!targetServer) {
                    throw new Error(`Server with ID ${serverId} not found`);
                }
            }
            // Step 3: Re-discover services to get current execution information
            const registry = await serviceRegistry.exploreAndEnrichServices([targetServer], undefined, 1, unsafeDirectAccess);
            const service = serviceRegistry.findServiceById(registry.services, serviceId);
            if (!service) {
                throw new Error(`Service ${serviceId} not found on server ${targetServer.name}`);
            }
            // Step 4: Validate service is execution ready
            serviceRegistry.validateServiceExecution(service);
            // Step 5: Show cost information before execution
            const costEstimate = serviceExecution.getExecutionCostEstimate(service);
            logger.info(`Service execution cost: ${costEstimate.amount} ${costEstimate.currency} via ${costEstimate.paymentMethod}`);
            // Step 6: Validate wallet availability for payment method
            if (!serviceExecution.validateWalletAvailability(service.price.paymentMethod)) {
                throw new Error(`No wallet configured for payment method: ${service.price.paymentMethod}`);
            }
            // Step 6.5: Handle payment confirmation when request elicitation is enabled
            if (Constants.ENABLE_REQUEST_ELICITATION) {
                // Check if paymentConfirmed is provided and validate it
                if (paymentConfirmed === undefined &&
                    costEstimate.amount >= Constants.ELICITATION_THRESHOLD) {
                    logger.info(`Request elicitation enabled. Payment confirmation required to execute service ${serviceId}...`);
                    // Return a confirmation request instead of automatically proceeding
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    requiresConfirmation: true,
                                    serviceInfo: {
                                        id: service.id,
                                        name: service.name,
                                        description: service.description,
                                        serverName: service.serverInfo.serverName
                                    },
                                    costEstimate: {
                                        amount: costEstimate.amount,
                                        currency: costEstimate.currency,
                                        paymentMethod: costEstimate.paymentMethod
                                    },
                                    message: `⚠️ Payment Confirmation Required: This will execute service "${service.name}" at a cost of ${costEstimate.amount} ${costEstimate.currency} via ${costEstimate.paymentMethod}. Please confirm you want to proceed with the payment.`,
                                    instructions: 'To proceed, please call this tool again with the same parameters and add `paymentConfirmed: true` to the request.'
                                }, null, 2)
                            }
                        ]
                    };
                }
                else if (paymentConfirmed === false) {
                    // User explicitly declined payment
                    logger.info(`Payment explicitly declined for service execution ${serviceId}`);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    cancelled: true,
                                    message: 'Service execution cancelled - payment declined.',
                                    serviceInfo: {
                                        id: service.id,
                                        name: service.name,
                                        description: service.description,
                                        serverName: service.serverInfo.serverName
                                    }
                                }, null, 2)
                            }
                        ]
                    };
                }
                else {
                    // paymentConfirmed === true, proceed with execution
                    logger.info(`Payment confirmation received for service ${serviceId}. Proceeding with execution...`);
                }
            }
            // Step 7: Execute the service
            const executionRequest = {
                serviceId,
                serverUrl,
                serverId,
                params
            };
            const result = await serviceExecution.executeService(executionRequest, service);
            // Step 8: Format and return the result
            const totalExecutionTime = Date.now() - startTime;
            if (result.success) {
                logger.info(`Service ${serviceId} executed successfully in ${totalExecutionTime}ms`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
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
                            }, null, 2)
                        }
                    ]
                };
            }
            else {
                logger.error(`Service ${serviceId} execution failed: ${result.error}`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                serviceInfo: {
                                    id: service.id,
                                    name: service.name,
                                    description: service.description,
                                    serverName: service.serverInfo.serverName
                                },
                                error: result.error,
                                executionTime: totalExecutionTime,
                                suggestion: 'Check the error message and try again. Ensure all parameters are correct and the service is available.'
                            }, null, 2)
                        }
                    ]
                };
            }
        }
        catch (error) {
            const totalExecutionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Service execution failed for ${serviceId}: ${errorMessage}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
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
                        }, null, 2)
                    }
                ]
            };
        }
    }
};
