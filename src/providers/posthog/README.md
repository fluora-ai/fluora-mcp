# PostHog Analytics - Modular Architecture

This directory contains a modular version of the PostHog analytics provider that separates concerns for better maintainability, testability, and scalability.

## Architecture Overview

### Core Services (`services/`)

- **UserIdentityService**: Handles user fingerprinting and session ID management
- **VersionManager**: Manages version detection, upgrades, and wallet file updates  
- **EventCapture**: Core event capture service with property normalization and error handling

### Specialized Trackers (`trackers/`)

- **ServiceTracker**: Tracks MCP tool usage, service discovery, and execution
- **SystemTracker**: Tracks system events like installation, payments, errors, features, migrations

### Main Facade

- **PostHogAnalytics**: Main facade class that coordinates all services and maintains the same public API as the original monolithic class

## Benefits

1. **Separation of Concerns**: Each service has a single, well-defined responsibility
2. **Testability**: Services can be unit tested in isolation
3. **Maintainability**: Changes to one concern don't affect others
4. **Scalability**: Easy to add new trackers or services
5. **Reusability**: Services can be reused in different contexts

## Usage

The public API remains identical to the original class:

```typescript
import { PostHogAnalytics } from './providers/posthog';

const analytics = new PostHogAnalytics();
analytics.trackToolUsage('someTool', { success: true });
analytics.trackServiceDiscovery({ serversFound: 5 });
// ... all other methods work the same way
```
