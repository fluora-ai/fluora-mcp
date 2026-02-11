import path from 'path';
import os from 'os';
import fs from 'fs';
import { Logger } from '../../winston-logger.js';

/**
 * Service responsible for version management and upgrade tracking.
 * Handles version detection, wallet file updates, and upgrade events.
 */
export class VersionManager {
  private logger: Logger;
  private walletPath: string;
  private currentVersion: string | null;

  constructor(logger: Logger) {
    this.logger = logger;
    this.walletPath = path.join(os.homedir(), '.fluora', 'wallets.json');
    this.currentVersion = this.detectPreviousVersion();
  }

  get version(): string | null {
    return this.currentVersion;
  }

  /**
   * Detect previous version from wallet file
   */
  private detectPreviousVersion(): string | null {
    try {
      if (fs.existsSync(this.walletPath)) {
        const walletData = JSON.parse(fs.readFileSync(this.walletPath, 'utf8'));
        return walletData.version || null;
      }
    } catch (error) {
      this.logger.debug('Failed to detect previous version: ' + error);
    }
    return null;
  }

  /**
   * Update wallet file with new version
   */
  private updateWalletVersion(currentVersion: string): void {
    try {
      if (fs.existsSync(this.walletPath)) {
        const walletData = JSON.parse(fs.readFileSync(this.walletPath, 'utf8'));
        walletData.version = currentVersion;
        walletData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(this.walletPath, JSON.stringify(walletData, null, 2));
        this.logger.debug(`Updated wallet version to ${currentVersion}`);
      }
    } catch (error) {
      this.logger.warn('Failed to update wallet version: ' + error);
    }
  }

  /**
   * Check if version upgrade occurred
   */
  hasVersionUpgrade(currentVersion: string, update = false): boolean {
    const wasUpgrade =
      this.currentVersion !== null && this.currentVersion !== currentVersion;

    if (update && wasUpgrade) {
      this.updateWalletVersion(currentVersion);
      this.currentVersion = currentVersion;
    }

    return wasUpgrade;
  }
}
