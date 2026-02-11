import { Logger } from "../../providers/winston-logger.js";
import { PaymentsTools, PaymentMethods } from "monetizedmcp-sdk";
import { Wallet } from "../../wallet/config.js";
import { ServerCompatibilityService } from "./server-compatibility.service.js";
import { 
  EnrichedService, 
  ServiceExecutionRequest, 
  ServiceExecutionResult 
} from "../types/service-registry.js";

export class ServiceExecutionService {
  private logger: Logger;
  private compatibilityService: ServerCompatibilityService;
  private wallet: Wallet;
  private paymentsTools: PaymentsTools;

  constructor() {
    this.logger = new Logger();
    this.compatibilityService = new ServerCompatibilityService();
    this.wallet = new Wallet();
    this.paymentsTools = new PaymentsTools();
  }

  /**
   * Executes a service with automatic payment handling
   */
  async executeService(
    request: ServiceExecutionRequest, 
    service: EnrichedService
  ): Promise<ServiceExecutionResult> {
    const startTime = Date.now();
    let client;

    try {
      this.logger.info(`Executing service ${request.serviceId} on server ${request.serverUrl}`);

      // Validate service is ready for execution
      this.validateServiceExecution(service);

      // Validate provided parameters
      this.compatibilityService.validateServiceParams(service, request.params);

      // Connect to server
      client = await this.compatibilityService.connectToServer(request.serverUrl);

      // Verify service still exists and get current details
      const currentServiceDetails = await this.verifyServiceAvailability(client, request.serviceId);

      // Generate signed transaction
      const signedTransaction = await this.generateSignedTransaction(
        service.price.amount,
        service.paymentInfo.walletAddress,
        service.price.paymentMethod
      );

      // Execute the make-purchase call
      const purchaseResult = await this.executePurchase(
        client,
        request.serviceId,
        request.params,
        service.price.paymentMethod,
        signedTransaction
      );

      const executionTime = Date.now() - startTime;
      this.logger.info(`Service ${request.serviceId} executed successfully in ${executionTime}ms`);

      return {
        success: true,
        result: purchaseResult,
        transactionCost: `${service.price.amount} ${service.price.currency || 'USDC'}`,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`Service execution failed for ${request.serviceId}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        executionTime
      };

    } finally {
      if (client) {
        await this.compatibilityService.safeDisconnect(client);
      }
    }
  }

  /**
   * Validates that a service is ready for execution
   */
  private validateServiceExecution(service: EnrichedService): void {
    if (!service.executionReady) {
      throw new Error(`Service ${service.id} is not ready for execution. Missing payment information.`);
    }

    if (!service.paymentInfo.walletAddress) {
      throw new Error(`Service ${service.id} is missing wallet address for payment method ${service.paymentInfo.paymentMethod}`);
    }

    if (!service.serverInfo.mcpServerUrl) {
      throw new Error(`Service ${service.id} is missing server URL`);
    }

    if (service.price.amount < 0) {
      throw new Error(`Service ${service.id} has invalid price: ${service.price.amount}`);
    }
  }

  /**
   * Verifies that the service is still available on the server
   */
  private async verifyServiceAvailability(client: any, serviceId: string): Promise<any> {
    try {
      // Try to get current pricing to verify service exists
      const pricingData = await this.compatibilityService.getPricingData(client);
      const serviceExists = pricingData.items.find(item => item.id === serviceId);

      if (!serviceExists) {
        throw new Error(`Service ${serviceId} is no longer available on the server`);
      }

      return serviceExists;
    } catch (error) {
      throw new Error(`Failed to verify service availability: ${error}`);
    }
  }

  /**
   * Generates a signed transaction for the payment
   */
  private async generateSignedTransaction(
    amount: number,
    walletAddress: string,
    paymentMethod: string
  ): Promise<string> {
    try {
      this.logger.info(`Signing transaction: ${amount} ${paymentMethod} to ${walletAddress}`);

      const privateKey = this.wallet.getPrivateKey(paymentMethod as PaymentMethods);
      if (!privateKey) {
        throw new Error(`No private key found for payment method: ${paymentMethod}`);
      }

      const signedTransaction = await this.paymentsTools.signTransaction(
        amount,
        walletAddress,
        privateKey,
        "http://example.com", // TODO: Make this configurable
        paymentMethod as PaymentMethods
      );

      this.logger.info('Transaction signed successfully');
      return signedTransaction;

    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Executes the make-purchase call on the server
   */
  private async executePurchase(
    client: any,
    itemId: string,
    params: Record<string, any>,
    paymentMethod: string,
    signedTransaction: string
  ): Promise<any> {
    try {
      const purchaseArgs = {
        itemId,
        params,
        paymentMethod,
        signedTransaction
      };

      this.logger.info(`Executing make-purchase with args: ${JSON.stringify({ itemId, params, paymentMethod }, null, 2)}`);

      const result = await client.callTool('make-purchase', purchaseArgs);

      // Handle different response formats
      let parsedResult: any = null;
      if ((result as any)?.content?.[0]?.text) {
        parsedResult = JSON.parse((result as any).content[0].text);
      } else if (typeof result === 'string') {
        parsedResult = JSON.parse(result);
      } else {
        parsedResult = result;
      }

      // Check for purchase success
      if (parsedResult?.toolResult === "Payment failed") {
        throw new Error('Payment verification failed on server');
      }

      return parsedResult;

    } catch (error) {
      throw new Error(`Failed to execute purchase: ${error}`);
    }
  }

  /**
   * Gets execution cost estimate for a service
   */
  getExecutionCostEstimate(service: EnrichedService): {
    amount: number;
    currency: string;
    paymentMethod: string;
    walletAddress: string;
  } {
    return {
      amount: service.price.amount,
      currency: service.price.currency || 'USDC',
      paymentMethod: service.price.paymentMethod,
      walletAddress: service.paymentInfo.walletAddress
    };
  }

  /**
   * Validates that required wallet exists for payment method
   */
  validateWalletAvailability(paymentMethod: string): boolean {
    try {
      const privateKey = this.wallet.getPrivateKey(paymentMethod as PaymentMethods);
      return !!privateKey;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets supported payment methods based on available wallets
   */
  getSupportedPaymentMethods(): string[] {
    // This should be implemented based on the wallet configuration
    // For now, return common payment methods
    return ['USDC_BASE_MAINNET', 'USDC_BASE_SEPOLIA'];
  }
}
