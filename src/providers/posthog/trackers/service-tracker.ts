import { Logger } from '../../winston-logger.js';
import { EventCapture } from '../services/event-capture.service.js';
import {
  ToolUsageProperties,
  ServiceDiscoveryProperties,
  ServiceExecutionProperties,
  PaymentConfirmationProperties
} from '../types.js';

/**
 * Tracker specialized for tool and service-related analytics events.
 * Handles MCP tool usage, service discovery, and execution tracking.
 */
export class ServiceTracker {
  private eventCapture: EventCapture;
  private logger: Logger;

  constructor(eventCapture: EventCapture, logger: Logger) {
    this.eventCapture = eventCapture;
    this.logger = logger;
  }

  /**
   * Track MCP tool usage with detailed metrics
   */
  trackToolUsage(
    toolName: string,
    properties: Partial<ToolUsageProperties>
  ): void {
    this.eventCapture.capture(`mcp_tool_${toolName}`, {
      tool: toolName,
      ...properties
    });
  }

  /**
   * Track service discovery requests
   */
  trackServiceDiscovery(properties: ServiceDiscoveryProperties): void {
    this.eventCapture.capture(
      'mcp_service_discovery',
      {
        tool: 'exploreServices',
        success: !properties.errors?.length,
        ...properties
      },
      { sessionId: properties.sessionId }
    );
  }

  /**
   * Track service execution requests
   */
  trackServiceExecution(properties: ServiceExecutionProperties): void {
    this.eventCapture.capture(
      'mcp_service_execution',
      { tool: 'useService', ...properties },
      { sessionId: properties.sessionId }
    );
  }
	
  /**
   * Track payment confirmations
   */
  trackPaymentConfirmation(properties: PaymentConfirmationProperties): void {
    this.eventCapture.capture(
      'mcp_payment_confirmation',
      { ...properties },
      { sessionId: properties.sessionId }
    );
  }

}
