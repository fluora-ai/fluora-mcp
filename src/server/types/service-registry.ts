export interface ServicePrice {
  amount: number;
  currency?: string;
  paymentMethod: string;
}

export interface ServiceParams {
  [key: string]: string;
}

export interface ServerInfo {
  mcpServerUrl: string;
  serverId: string;
  serverName: string;
  verified: boolean;
  categories: string;
}

export interface PaymentInfo {
  walletAddress: string;
  paymentMethod: string;
}

export interface RawServiceItem {
  id: string;
  name: string;
  description?: string;
  price: ServicePrice;
  params: ServiceParams;
}

export interface EnrichedService extends RawServiceItem {
  serverInfo: ServerInfo;
  paymentInfo: PaymentInfo;
  executionReady: boolean;
  category: string;
}

export interface ServiceRegistry {
  totalServersExplored: number;
  totalServicesFound: number;
  category?: string;
  services: EnrichedService[];
  metadata: {
    exploredAt: string;
    errors: Array<{
      serverName: string;
      error: string;
    }>;
  };
}

export interface PriceListingResponse {
  items: RawServiceItem[];
}

export interface PaymentMethodsResponse {
  walletAddress: string;
  paymentMethod: string;
}

export interface ServiceExecutionRequest {
  serviceId: string;
  serverUrl: string;
  serverId: string;
  params: Record<string, any>;
}

export interface ServiceExecutionResult {
  success: boolean;
  result?: any;
  transactionCost?: string;
  error?: string;
  executionTime?: number;
}
