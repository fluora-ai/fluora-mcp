import crypto from 'crypto';
import os from 'os';

/**
 * Service responsible for user identification and session management.
 * Handles anonymous user fingerprinting and session ID generation.
 */
export class UserIdentityService {
  private sessionId: string | null = null;

  /**
   * Generate unique user fingerprint for anonymous tracking
   * Uses system-level identifiers to create consistent user ID
   */
  generateUserFingerprint(): string {
    const fingerprint = crypto
      .createHash('sha256')
      .update(os.hostname())
      .update(os.platform())
      .update(os.arch())
      .digest('hex')
      .substring(0, 16);

    return fingerprint;
  }

  /**
   * Get or create session ID for event tracking
   * Maintains session consistency across multiple events
   */
  getSessionId(candidate?: string): string {
    if (this.sessionId) return this.sessionId;

    return (this.sessionId =
      candidate ||
      `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
  }

  /**
   * Reset the current session (useful for testing or explicit session boundaries)
   */
  resetSession(): void {
    this.sessionId = null;
  }
}
