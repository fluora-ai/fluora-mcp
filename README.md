# 🌟 Fluora MCP - Monetized AI Agent Services

[![npm version](https://badge.fury.io/js/fluora-mcp.svg)](https://www.npmjs.com/package/fluora-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Transform your AI agents into revenue-generating businesses with seamless blockchain payments.**

Fluora MCP enables AI agents to discover, access, and pay for monetized services across the web. Built on blockchain technology with automatic payment processing using USDC on Base network.

## 🚀 Quick Start

### Claude Desktop

Edit your Claude Desktop config file:
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fluora": {
      "command": "npx",
      "args": ["fluora-mcp"]
    }
  }
}
```

### VS Code (Cline/Continue Extension)

Add to your VS Code MCP settings:

```json
{
  "mcpServers": {
    "fluora": {
      "command": "npx",
      "args": ["fluora-mcp"]
    }
  }
}
```

**Note:** Exact location depends on your MCP extension (Cline vs Continue).

### 🦞 OpenClaw Integration

Install from GitHub for best compatibility:

```bash
# Clone and build
git clone https://github.com/fluora-ai/fluora-mcp.git
cd fluora-mcp
npm install
npm run build

# Add to mcporter
mcporter config add fluora --command "node /path/to/fluora-mcp/build/index.js"

# Verify installation
mcporter list fluora
mcporter call fluora.exploreServices category=PDF
```

**OpenClaw users:** The MCP server will be automatically available to your agent after adding it to mcporter.

## 🎬 What Happens After Install

When you first run `fluora-mcp`:
1. ✅ A wallet is automatically generated at `~/.fluora/wallets.json`
2. ✅ The MCP server starts and loads 76+ services from 8 providers
3. ✅ Your wallet addresses are ready:
   - Testnet (Base Sepolia): Check `~/.fluora/wallets.json`
   - Mainnet (Base): Check `~/.fluora/wallets.json`

**⚠️ IMPORTANT: Backup your wallet!**
```bash
# Backup your wallet file (contains private keys)
cp ~/.fluora/wallets.json ~/fluora-wallet-backup.json
```

### Next Steps:
1. Fund your wallet (see Funding Your Wallet below)
2. Restart Claude Desktop/VS Code to load the MCP server
3. Ask your AI: "What services are available on Fluora?"

## 💰 Funding Your Wallet

To use paid services, you need USDC in your wallet.

### For Testing (Testnet)
1. Get your testnet address:
   ```bash
   cat ~/.fluora/wallets.json | grep -A 1 SEPOLIA
   ```
2. Get testnet USDC from Base Sepolia faucet:
   - Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Use your testnet address
   - **Recommended:** Transfer $1 worth for testing

### For Production (Mainnet)
1. Get your mainnet address:
   ```bash
   cat ~/.fluora/wallets.json | grep -A 1 MAINNET
   ```
2. Transfer USDC on Base network
   - **Recommended:** Transfer $1-5 to start
   - Network: Base (not Ethereum mainnet!)
   - Token: USDC

**💡 Tip:** Most services cost $0.001-0.02 per call, so $1 goes a long way!

## ✨ What You Get

- **🔍 Service Discovery**: Access 76+ monetized services ([Browse All](https://fluora.ai/services))
  - PDF Generation & Conversion
  - DeFi Data & Analytics (Solana, Base)
  - Web Scraping & Screenshots
  - AI Research & Analysis
  - And more...
- **💳 Auto Payments**: Seamless USDC transactions on Base blockchain
- **🤖 AI Integration**: Works with Claude Desktop, VS Code, OpenClaw, and any MCP client
- **🔐 Secure Wallets**: Auto-generated private keys stored locally
- **📊 Real-time**: Live service status, pricing, and availability

## 🎯 Core Features

### Service Discovery

```bash
# Ask your AI agent:
"What PDF services are available?"
"Show me DeFi operations under $1"
"Take a screenshot of this website"
```

### Automatic Payments

- **USDC on Base**: Testnet (Sepolia) and Mainnet support
- **Auto-signing**: Transactions signed automatically
- **Instant settlement**: Real-time payment verification
- **Secure storage**: Private keys never leave your machine

**Pricing Examples:**
- PDF Conversion: ~$0.01/page
- DeFi Data Query: ~$0.001/query
- Website Screenshot: ~$0.005/screenshot (free on testnet!)
- Web Scraping: ~$0.02/page

💡 **Total cost shown before each paid service call** (human-in-the-loop confirmation)

### Developer Experience

- **MCP Standard**: Full Model Context Protocol compatibility
- **Multiple Transports**: STDIO and Server-Sent Events (SSE)
- **Rich Logging**: Winston-based logging with configurable levels
- **Error Handling**: Graceful degradation and detailed reporting

## 📖 Example: Your First Service Call

Here's a complete example of using Fluora:

### Step 1: Install
```bash
# For Claude Desktop
npm install -g fluora-mcp
```

### Step 2: Add to Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "fluora": {
      "command": "fluora-mcp"
    }
  }
}
```

### Step 3: Restart Claude Desktop

### Step 4: Explore Services
Ask Claude: **"What services are available on Fluora?"**

Claude will call `exploreServices` and show you options.

### Step 5: Use a Service
Ask Claude: **"Take a screenshot of https://example.com using Zyte"**

- If service costs < $0.01: Executes automatically
- If service costs > $0.01: Claude will ask you to confirm payment first

### Step 6: Check Your Wallet
```bash
cat ~/.fluora/wallets.json
```
Your addresses are listed here for funding.

## 🛠 Configuration

### Environment Variables

```bash
MCP_TRANSPORT=stdio              		# stdio | sse
FLUORA_API_URL=https://api.fluora.ai/api # For local development
LOG_LEVEL=INFO                   		# DEBUG | INFO | WARN | ERROR
ENABLE_UNSAFE_DIRECT_ACCESS=false		# CAUTION! Only for development intent
ENABLE_REQUEST_ELICITATION=true			# Usage control over services
```

**Where to put env vars:**
- **Claude Desktop**: Set in your shell profile (`~/.zshrc` or `~/.bashrc`)
- **VS Code**: Use extension settings or `.env` file
- **OpenClaw**: Set in your shell or OpenClaw config

### Wallet Setup

Wallets auto-generate at `~/.fluora/wallets.json`:

```json
{
  "USDC_BASE_SEPOLIA": {
    "privateKey": "0x...",
    "address": "0x..."
  },
  "USDC_BASE_MAINNET": {
    "privateKey": "0x...",
    "address": "0x..."
  }
}
```

## 🔧 Troubleshooting

### Server Not Starting
```bash
# Check if wallet exists
ls -la ~/.fluora/wallets.json

# Check logs
tail -f ~/.fluora/fluora-mcp.log
```

### "No Funds" Error
- Check your wallet balance on Base Sepolia/Mainnet
- Most services cost $0.001-0.02
- Fund with testnet USDC first to test

### Claude Desktop Not Seeing Tools
1. Verify config: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json`
2. Restart Claude Desktop completely (quit and reopen)
3. Check Developer Tools (Cmd+Option+I on Mac) for errors

### Services Not Loading
```bash
# Test server directly
npx fluora-mcp

# Should show: "Request elicitation for MCP services (Human-In-The-Loop for purchase), ENABLED"
# Should list 76+ services
```

### Deprecation Warnings
These warnings are non-critical but will be addressed in future updates.

## 🔐 Security

- **Local Storage**: Private keys stored locally, never transmitted
- **Blockchain Native**: All payments verified on-chain
- **X402 Protocol**: Standardized payment verification
- **No Data Retention**: Service data not stored or logged
- **⚠️ BACKUP YOUR WALLET**: Losing `~/.fluora/wallets.json` = losing funds

## 🤝 Support

- **Site**: [fluora.ai](https://www.fluora.ai)
- **Issues**: [GitHub Issues](https://github.com/fluora-ai/fluora-mcp/issues)
- **Contact**: [contact@fluora.ai](mailto:contact@fluora.ai)

## 📄 License

MIT License - Built with ❤️ for the AI economy

---

**Ready to monetize your AI services?**

```bash
npm install -g fluora-mcp && fluora-mcp
```
