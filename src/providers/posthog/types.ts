// === Analytics Types & export Interfaces ===

/** Base execution context shared across events */
export interface ExecutionContext {
  executionTime?: number;
  success?: boolean;
  error?: string;
  sessionId?: string;
}

/** Service/server identification */
export interface ServiceIdentity {
  serviceId: string;
  serverId: string;
  serverUrl?: string;
}

/** Payment-related properties */
export interface PaymentContext {
  paymentMethod: string;
  amount: number;
  transactionCost?: string;
}

/** Discovery and counting metrics */
export interface DiscoveryMetrics {
  maxServers?: number;
  serversFound?: number;
  servicesFound?: number;
  serverCount?: number;
  serviceCount?: number;
}

/** Tool execution context */
export interface ToolContext {
  tool?: string;
  category?: string;
  parameters?: any;
}

/** HTTP request context */
export interface HttpContext {
  method: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

// === Event-Specific Property Types ===

export type ToolUsageProperties = ExecutionContext &
  ToolContext &
  Partial<PaymentContext> &
  DiscoveryMetrics;

export type ServiceDiscoveryProperties = ExecutionContext &
  DiscoveryMetrics & {
    category?: string;
    errors?: string[];
  };

export type ServiceExecutionProperties = ExecutionContext &
  ServiceIdentity &
  Partial<PaymentContext>;

export type PaymentConfirmationProperties = Pick<ServiceIdentity, 'serviceId'> &
  PaymentContext & {
    confirmed: boolean;
    sessionId?: string;
  };

export type ProxyRequestProperties = HttpContext;

export type ErrorTrackingContext = Partial<
  Pick<ServiceIdentity, 'serviceId' | 'serverId'>
> & {
  tool?: string;
  sessionId?: string;
};
