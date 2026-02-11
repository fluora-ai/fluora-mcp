import { FluoraMcpClientSSE } from "../../client/client-sse.js";
import { FluoraMcpClientStreamable } from "../../client/client-streamable.js";
import { Logger } from "../../providers/winston-logger.js";
export class ServerCompatibilityService {
    logger;
    constructor() {
        this.logger = new Logger();
    }
    /**
     * Connects to an MCP server with fallback between SSE and Streamable clients
     */
    async connectToServer(mcpServerUrl) {
        let client;
        try {
            client = new FluoraMcpClientStreamable();
            await client.connect(mcpServerUrl);
            this.logger.info(`Connected to ${mcpServerUrl} using Streamable transport`);
            return client;
        }
        catch (error) {
            try {
                client = new FluoraMcpClientSSE();
                await client.connect(mcpServerUrl);
                this.logger.info(`Connected to ${mcpServerUrl} using SSE transport`);
                return client;
            }
            catch (sseError) {
                this.logger.error(`Failed to connect to ${mcpServerUrl}: ${error}`);
                throw new Error(`Unable to connect to server: ${mcpServerUrl}`);
            }
        }
    }
    /**
     * Attempts to get pricing data using both naming conventions
     */
    async getPricingData(client) {
        const pricingToolVariations = ['pricing-listing', 'price-listing'];
        for (const toolName of pricingToolVariations) {
            try {
                this.logger.info(`Attempting to call ${toolName}`);
                const result = await client.callTool(toolName, { searchQuery: '' });
                // Handle different response formats
                let parsedContent = null;
                if (result?.content?.[0]?.text) {
                    parsedContent = JSON.parse(result.content[0].text);
                }
                else if (typeof result === 'string') {
                    parsedContent = JSON.parse(result);
                }
                else if (result?.items) {
                    parsedContent = result;
                }
                if (parsedContent?.items && Array.isArray(parsedContent.items)) {
                    this.logger.info(`Successfully got pricing data using ${toolName}, found ${parsedContent.items.length} items`);
                    return parsedContent;
                }
            }
            catch (error) {
                this.logger.warn(`Failed to get pricing data using ${toolName}: ${error}`);
                continue;
            }
        }
        throw new Error('No compatible pricing tool found on server');
    }
    /**
     * Gets payment methods from the server
     */
    async getPaymentMethods(client) {
        try {
            this.logger.info('Getting payment methods');
            const result = await client.callTool('payment-methods', {});
            // Handle different response formats
            let parsedContent = null;
            if (result?.content?.[0]?.text) {
                parsedContent = JSON.parse(result.content[0].text);
            }
            else if (typeof result === 'string') {
                parsedContent = JSON.parse(result);
            }
            else if (Array.isArray(result)) {
                parsedContent = result;
            }
            if (Array.isArray(parsedContent)) {
                this.logger.info(`Successfully got payment methods, found ${parsedContent.length} methods`);
                return parsedContent;
            }
            throw new Error('Invalid payment methods response format');
        }
        catch (error) {
            this.logger.error(`Failed to get payment methods: ${error}`);
            throw new Error(`Unable to get payment methods: ${error}`);
        }
    }
    /**
     * Maps a payment method to the corresponding wallet address
     */
    findMatchingPayment(paymentMethod, paymentMethods) {
        const match = paymentMethods.find(pm => pm.paymentMethod === paymentMethod);
        if (!match) {
            throw new Error(`No wallet found for payment method: ${paymentMethod}`);
        }
        return {
            walletAddress: match.walletAddress,
            paymentMethod: match.paymentMethod
        };
    }
    /**
     * Validates service parameters against the expected schema
     */
    validateServiceParams(service, providedParams) {
        const requiredParams = Object.keys(service.params || {});
        const providedParamKeys = Object.keys(providedParams || {});
        for (const requiredParam of requiredParams) {
            if (!providedParamKeys.includes(requiredParam)) {
                throw new Error(`Missing required parameter: ${requiredParam}`);
            }
        }
        // Validate no extra parameters
        for (const providedParam of providedParamKeys) {
            if (!requiredParams.includes(providedParam)) {
                this.logger.warn(`Extra parameter provided: ${providedParam}`);
            }
        }
    }
    /**
     * Normalizes service data to handle schema variations
     */
    normalizeServiceData(rawService) {
        return {
            id: rawService.id,
            name: rawService.name,
            description: rawService.description || "No description available",
            price: {
                amount: rawService.price.amount,
                currency: rawService.price.currency, // Optional field
                paymentMethod: rawService.price.paymentMethod
            },
            params: rawService.params || {}
        };
    }
    /**
     * Safely disconnects from a client
     */
    async safeDisconnect(client) {
        try {
            await client.disconnect();
            this.logger.info('Client disconnected successfully');
        }
        catch (error) {
            this.logger.warn(`Error during disconnect: ${error}`);
        }
    }
}
