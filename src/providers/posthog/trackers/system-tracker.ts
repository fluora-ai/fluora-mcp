import { Logger } from '../../winston-logger.js';
import { EventCapture } from '../services/event-capture.service.js';
import {
  PaymentConfirmationProperties,
  ProxyRequestProperties,
  ErrorTrackingContext
} from '../types.js';

/**
 * Tracker specialized for system-level analytics events.
 * Handles payments, proxy requests, errors, features, and migrations.
 */
export class SystemTracker {
  private eventCapture: EventCapture;
  private logger: Logger;

  constructor(eventCapture: EventCapture, logger: Logger) {
    this.eventCapture = eventCapture;
    this.logger = logger;
  }

  /**
   * Track wallet creation (installation)
   */
  trackInstallation(): void {
    this.eventCapture.capture('mcp_installation', {
      installationType: 'wallet_creation'
    });
    this.logger.info('PostHog event tracked: mcp_installation');
  }


  /**
   * Track API requests to proxy
   */
  trackProxyRequest(
    endpoint: string,
    properties: ProxyRequestProperties
  ): void {
    this.eventCapture.capture('mcp_proxy_request', {
      endpoint,
      ...properties
    });
    this.logger.debug(
      `PostHog event tracked: mcp_proxy_request to ${endpoint}`
    );
  }

  /**
   * Track errors and exceptions
   */
  trackError(error: Error, context: ErrorTrackingContext): void {
    this.eventCapture.capture(
      'mcp_error',
      {
        errorMessage: error.message,
        errorStack: error.stack,
        tool: context.tool,
        serviceId: context.serviceId,
        serverId: context.serverId
      },
      { sessionId: context.sessionId }
    );
  }

  /**
   * Track feature adoption
   */
  trackFeatureAdoption(
    featureName: string,
    properties: Record<string, any> = {}
  ): void {
    this.eventCapture.capture('mcp_feature_adoption', {
      feature: featureName,
      ...properties
    });
    this.logger.debug(
      `PostHog event tracked: mcp_feature_adoption for ${featureName}`
    );
  }

  /**
   * Track version upgrade events
   */
  trackVersionUpgrade(
    previousVersion: string | null,
    currentVersion: string
  ): void {
    this.eventCapture.capture('mcp_version_upgrade', {
      previousVersion,
      currentVersion
    });
    this.logger.info(
      `PostHog event tracked: mcp_version_upgrade from ${previousVersion} to ${currentVersion}`
    );
  }
}
