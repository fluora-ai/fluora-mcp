import { PostHog } from 'posthog-node';
import { Logger } from '../../winston-logger.js';
import { UserIdentityService } from './user-identity.service.js';

export interface BaseEventProperties {
  userId: string;
  sessionId?: string;
  timestamp: string;
  source: string;
  version: string;
  platform: string;
  nodeVersion: string;
}

export interface EventCaptureOptions {
  sessionId?: string;
  distinctId?: string;
}

/**
 * Core service responsible for event capture and property normalization.
 * Handles PostHog client interaction, error handling, and consistent metadata.
 */
export class EventCapture {
  private static readonly SOURCE = 'fluora-mcp';

  private client: PostHog;
  private logger: Logger;
  private identityService: UserIdentityService;
  private userId: string;
  private version: string;

  constructor(
    client: PostHog,
    logger: Logger,
    identityService: UserIdentityService,
    userId: string,
    version: string
  ) {
    this.client = client;
    this.logger = logger;
    this.identityService = identityService;
    this.userId = userId;
    this.version = version;
  }

  /**
   * Build normalized, shared properties for every event
   */
  private buildBaseProperties(sessionId?: string): BaseEventProperties {
    return {
      userId: this.userId,
      sessionId,
      timestamp: new Date().toISOString(),
      source: EventCapture.SOURCE,
      version: this.version,
      platform: process.platform,
      nodeVersion: process.version
    };
  }

  /**
   * Capture an event with normalized properties and error handling
   */
  capture(
    event: string,
    properties: Record<string, unknown> = {},
    options?: EventCaptureOptions
  ): void {
    if (!this.client) {
      this.logger.debug('Analytics disabled - skipping event capture');
      return;
    }

    try {
      const sessionId = this.identityService.getSessionId(options?.sessionId);
      const baseProperties = this.buildBaseProperties(sessionId);

      this.client.capture({
        distinctId: options?.distinctId ?? this.userId,
        event,
        properties: {
          ...baseProperties,
          ...properties
        }
      });

      this.logger.debug(`PostHog event tracked: ${event}`);
    } catch (error) {
      this.logger.warn(
        `Failed to track PostHog analytics for ${event}: ${error}`
      );
    }
  }

  /**
   * Shutdown the PostHog client
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
