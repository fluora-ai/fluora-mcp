/**
 * Centralized environment variables for the application
 */
import dotenv from 'dotenv';
dotenv.config();
export class Constants {
  static readonly FLUORA_API_URL =
    process.env.FLUORA_API_URL || 'https://api.fluora.ai/api';
  static readonly ENABLE_UNSAFE_DIRECT_ACCESS =
    process.env.ENABLE_UNSAFE_DIRECT_ACCESS?.toLowerCase() === 'true';
  static readonly LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  static readonly MCP_TRANSPORT = process.env.MCP_TRANSPORT || 'stdio';
  static readonly ELICITATION_THRESHOLD =
    Number(process.env.ELICITATION_THRESHOLD) || 0.01;
  static readonly ENABLE_REQUEST_ELICITATION = process.env
    .ENABLE_REQUEST_ELICITATION
    ? process.env.ENABLE_REQUEST_ELICITATION.toLowerCase() === 'true'
    : true;

  // PostHog Analytics Configuration
  static readonly POSTHOG_API_KEY =
    'phc_b1EGCq7rn5uRa61mfQ4tNHDKAcOJsgkDanYuMT1GRkS';
  static readonly POSTHOG_HOST = 'https://us.i.posthog.com';
  static readonly DISABLE_ANALYTICS =
    process.env.DISABLE_ANALYTICS?.toLowerCase() === 'true';
}
