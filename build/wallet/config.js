import path from 'path';
import os from 'os';
import fs from 'fs';
import { ethers } from 'ethers';
import { walletInitialConfig } from './walletInitialConfig.js';
import { PostHogAnalytics } from '../providers/posthog/index.js';
export class Wallet {
    filePath;
    file;
    analytics;
    constructor() {
        this.analytics = new PostHogAnalytics();
        if (!fs.existsSync(this.getDirectory())) {
            this.createDirectory();
        }
        this.filePath = path.join(os.homedir(), '.fluora', 'wallets.json');
        this.file = new File([], this.filePath, { type: 'application/json' });
        if (!fs.existsSync(this.filePath)) {
            this.createFile();
        }
    }
    createFile() {
        const filePath = path.join(os.homedir(), '.fluora', 'wallets.json');
        const file = new File([], filePath, { type: 'application/json' });
        // Generate config with auto-generated private keys
        const configWithKeys = this.generateConfigWithPrivateKeys();
        fs.writeFileSync(filePath, JSON.stringify(configWithKeys, null, 2));
        console.log('🔑 Auto-generated new private keys for wallet configuration');
        console.log(`📁 Wallet config saved to: ${filePath}`);
        // Track wallet creation (installation)
        this.analytics.trackInstallation();
        // TODO: Add agent to GW
        return this.file = file;
    }
    /**
     * Generates a complete wallet configuration with auto-generated private keys
     */
    generateConfigWithPrivateKeys() {
        const config = {};
        // Generate private keys for all supported payment methods
        Object.keys(walletInitialConfig).forEach((paymentMethod) => {
            const privateKey = this.generatePrivateKey();
            const wallet = new ethers.Wallet(privateKey);
            config[paymentMethod] = {
                privateKey: privateKey,
                address: wallet.address // Store the corresponding address for reference
            };
            console.log(`🔐 Generated wallet for ${paymentMethod}:`);
            console.log(`   Address: ${wallet.address}`);
        });
        return config;
    }
    /**
     * Generates a new private key using ethers
     */
    generatePrivateKey() {
        const wallet = ethers.Wallet.createRandom();
        return wallet.privateKey;
    }
    // Refactor
    readFile() {
        const filePath = path.join(os.homedir(), '.fluora', 'wallets.json');
        const file = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(file);
    }
    getDirectory() {
        return path.join(os.homedir(), '.fluora');
    }
    createDirectory() {
        const directory = path.join(os.homedir(), '.fluora');
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
    }
    getPrivateKey(currency) {
        const wallet = this.readFile();
        const currencyKey = currency.toString();
        // Check if the currency exists in the wallet config
        if (!wallet[currencyKey]) {
            console.log(`⚠️  Missing configuration for ${currencyKey}, generating new private key...`);
            this.addMissingPrivateKey(currencyKey);
            return this.readFile()[currencyKey].privateKey;
        }
        const privateKey = wallet[currencyKey].privateKey;
        // Check if private key is empty or missing
        if (!privateKey || privateKey.trim() === '') {
            console.log(`⚠️  Empty private key for ${currencyKey}, generating new private key...`);
            this.addMissingPrivateKey(currencyKey);
            return this.readFile()[currencyKey].privateKey;
        }
        return privateKey.replace(/^0x/, ''); // Return without 0x prefix. Legacy support.
    }
    /**
     * Adds a missing private key for a specific currency to the existing wallet config
     */
    addMissingPrivateKey(currencyKey) {
        const wallet = this.readFile();
        const privateKey = this.generatePrivateKey();
        const ethWallet = new ethers.Wallet(privateKey);
        wallet[currencyKey] = {
            privateKey: privateKey,
            address: ethWallet.address
        };
        fs.writeFileSync(this.filePath, JSON.stringify(wallet, null, 2));
        console.log(`🔐 Generated new wallet for ${currencyKey}:`);
        console.log(`   Address: ${ethWallet.address}`);
    }
    /**
     * Gets the wallet address for a specific currency
     */
    getAddress(currency) {
        const wallet = this.readFile();
        const currencyKey = currency.toString();
        // Ensure private key exists (this will generate one if missing)
        this.getPrivateKey(currency);
        const updatedWallet = this.readFile();
        return updatedWallet[currencyKey].address;
    }
    /**
     * Gets both private key and address for a currency
     */
    getWalletInfo(currency) {
        const privateKey = this.getPrivateKey(currency);
        const address = this.getAddress(currency);
        return {
            privateKey,
            address
        };
    }
}
