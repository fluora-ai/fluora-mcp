// Main Analytics Provider (Modular Architecture)
export { PostHogAnalytics } from './posthog-analytics.js';

// Core Services
export { UserIdentityService } from './services/user-identity.service.js';
export { VersionManager } from './services/version-manager.service.js';
export { EventCapture, BaseEventProperties, EventCaptureOptions } from './services/event-capture.service.js';

// Specialized Trackers
export { ServiceTracker } from './trackers/service-tracker.js';
export { SystemTracker } from './trackers/system-tracker.js';

// Types (re-exported for convenience)
export * from './types.js';

// Legacy export (for backward compatibility if needed)
// export { PostHogAnalytics as PostHogAnalyticsLegacy } from './posthog-analytics.js';
