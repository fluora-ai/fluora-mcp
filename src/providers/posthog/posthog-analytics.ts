/**
 * Modular PostHog Analytics Provider
 *
 * This facade coordinates multiple specialized services:
 * - UserIdentityService: Handles user fingerprinting and session management
 * - VersionManager: Manages version detection, upgrades, and wallet updates
 * - EventCapture: Core event capture with normalized properties and error handling
 * - ServiceTracker: Tracks tool usage, service discovery, and execution
 * - SystemTracker: Tracks system events like installation, payments, errors, features
 *
 * Maintains the same public API as the original monolithic class while providing
 * better separation of concerns, testability, and maintainability.
 */

import { PostHog } from 'posthog-node';
import { Logger } from '../winston-logger.js';
import { Constants } from '../../utils/constants.js';

// Services
import { UserIdentityService } from './services/user-identity.service.js';
import { VersionManager } from './services/version-manager.service.js';
import { EventCapture } from './services/event-capture.service.js';

// Trackers
import { ServiceTracker } from './trackers/service-tracker.js';
import { SystemTracker } from './trackers/system-tracker.js';

// Types
import {
  ToolUsageProperties,
  ServiceDiscoveryProperties,
  ServiceExecutionProperties,
  PaymentConfirmationProperties,
  ProxyRequestProperties,
  ErrorTrackingContext
} from './types.js';

import { default as pkg } from '../../../package.json' with { type: 'json' };

export class PostHogAnalytics {
  // Core services
  private logger?: Logger;
  private identityService?: UserIdentityService;
  private versionManager?: VersionManager;
  private eventCapture?: EventCapture;

  // Specialized trackers
  private serviceTracker?: ServiceTracker;
  private systemTracker?: SystemTracker;

  // Core properties
  private userId?: string;
  private currentVersion?: string;
  private previousVersion?: string | null;

  constructor() {
    // Skip initialization if analytics is disabled
    if (Constants.DISABLE_ANALYTICS) {
      return;
    }

    // Initialize core services
    this.logger = new Logger();
    this.identityService = new UserIdentityService();
    this.versionManager = new VersionManager(this.logger);

    // Initialize core properties
    this.userId = this.identityService.generateUserFingerprint();
    this.currentVersion = pkg.version;
    this.previousVersion = this.versionManager.version;

    // Initialize PostHog client
    const client = new PostHog(Constants.POSTHOG_API_KEY, {
      host: Constants.POSTHOG_HOST,
      flushAt: 1, // Send events immediately for real-time analytics
      flushInterval: 1000
    });

    // Initialize event capture service
    this.eventCapture = new EventCapture(
      client,
      this.logger,
      this.identityService,
      this.userId,
      this.currentVersion
    );

    // Initialize specialized trackers
    this.serviceTracker = new ServiceTracker(this.eventCapture, this.logger);
    this.systemTracker = new SystemTracker(this.eventCapture, this.logger);

    // Handle version upgrade if detected
    if (this.versionManager.hasVersionUpgrade(this.currentVersion, true)) {
      this.systemTracker.trackVersionUpgrade(
        this.previousVersion,
        this.currentVersion
      );
    }
  }

  // === Public API - Tool and Service Tracking ===

  /**
   * Track MCP tool usage with detailed metrics
   */
  trackToolUsage(
    toolName: string,
    properties: Partial<ToolUsageProperties>
  ): void {
    this.serviceTracker?.trackToolUsage(toolName, properties);
  }

  /**
   * Track service discovery requests
   */
  trackServiceDiscovery(properties: ServiceDiscoveryProperties): void {
    this.serviceTracker?.trackServiceDiscovery(properties);
  }

  /**
   * Track service execution requests
   */
  trackServiceExecution(properties: ServiceExecutionProperties): void {
    this.serviceTracker?.trackServiceExecution(properties);
  }

  /**
   * Track payment confirmations
   */
  trackPaymentConfirmation(properties: PaymentConfirmationProperties): void {
    this.serviceTracker?.trackPaymentConfirmation(properties);
  }

  // === Public API - System Tracking ===

  /**
   * Track wallet creation (installation)
   */
  trackInstallation(): void {
    this.systemTracker?.trackInstallation();
  }

  /**
   * Track API requests to proxy
   */
  trackProxyRequest(
    endpoint: string,
    properties: ProxyRequestProperties
  ): void {
    this.systemTracker?.trackProxyRequest(endpoint, properties);
  }

  /**
   * Track errors and exceptions
   */
  trackError(error: Error, context: ErrorTrackingContext): void {
    this.systemTracker?.trackError(error, context);
  }

  /**
   * Track feature adoption
   */
  trackFeatureAdoption(
    featureName: string,
    properties: Record<string, any> = {}
  ): void {
    this.systemTracker?.trackFeatureAdoption(featureName, properties);
  }

  // === Lifecycle Management ===

  /**
   * Shutdown all analytics services
   */
  async shutdown(): Promise<void> {
    await this.eventCapture?.shutdown();
  }
}
