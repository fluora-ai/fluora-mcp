# 🌟 Fluora MCP - Monetized AI Agent Services

[![npm version](https://badge.fury.io/js/fluora-mcp.svg)](https://www.npmjs.com/package/fluora-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Transform your AI agents into revenue-generating businesses with seamless blockchain payments.**

Fluora MCP enables AI agents to discover, access, and pay for monetized services across the web. Built on blockchain technology with automatic payment processing using USDC on Base network.

## 🚀 Quick Start

```bash
# Add to Vs Code
{
  "servers": {
    "fluora": {
      "command": "npx",
      "args": ["fluora-mcp"]
    }
  }
}

# Add to Claude Desktop config
{
  "mcpServers": {
    "fluora":
      "command": "npx",
      "args": ["fluora-mcp"]
    }
  }
}
```

```bash
# Install globally
npm install -g fluora-mcp

# Run and auto-generate wallet
fluora-mcp

# Add to Claude Desktop config
{
  "mcpServers": {
    "fluora": {
      "command": "fluora-mcp"
    }
  }
}
```

## ✨ What You Get

- **🔍 Service Discovery**: Access 50+ monetized services (PDF, DeFi, Data, AI)
- **💳 Auto Payments**: Seamless USDC transactions on Base blockchain
- **🤖 AI Integration**: Works with Claude Desktop, VS Code, and any MCP client
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

### Developer Experience

- **MCP Standard**: Full Model Context Protocol compatibility
- **Multiple Transports**: STDIO and Server-Sent Events (SSE)
- **Rich Logging**: Winston-based logging with configurable levels
- **Error Handling**: Graceful degradation and detailed reporting

## 🛠 Configuration

### Environment Variables

```bash
MCP_TRANSPORT=stdio              		# stdio | sse
FLUORA_API_URL=https://api.fluora.ai/api # For local development
LOG_LEVEL=INFO                   		# DEBUG | INFO | WARN | ERROR
ENABLE_UNSAFE_DIRECT_ACCESS=false		# CAUTION! Only for development intent
ENABLE_REQUEST_ELICITATION=true			# Usage control over services
```

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

## 🔐 Security

- **Local Storage**: Private keys stored locally, never transmitted
- **Blockchain Native**: All payments verified on-chain
- **X402 Protocol**: Standardized payment verification
- **No Data Retention**: Service data not stored or logged

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
