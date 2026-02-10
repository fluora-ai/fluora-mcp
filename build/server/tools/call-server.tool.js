import { z } from "zod";
import { FluoraMcpClientSSE } from "../../client/client-sse.js";
import { PaymentsTools } from "monetizedmcp-sdk";
import { Logger } from "../../providers/winston-logger.js";
import { Wallet } from "../../wallet/config.js";
import { FluoraMcpClientStreamable } from "../../client/client-streamable.js";
import { Prompts } from "../prompts/prompts.js";
const CallServerSchema = {
    serverId: z.string(),
    mcpServerUrl: z.string(),
    toolName: z.string(),
    args: z.record(z.any()),
};
export const CallServerTool = {
    name: "callServerTool",
    description: `
        Tool Execution Order:
        1. pricing-listing
        2. payment-method
        3. make-purchase

        Tool Parameters:
        - mcpServerUrl: The URL of the MCP server to call.
        - toolName: The specific tool to execute.
        - args: An object containing:
          - Additional arguments required by the tool.
          - itemPrice: (Required for the make-purchase tool) The price of the selected item, obtained from the pricing-listing tool.
          - serverWalletAddress: (Required for the make-purchase tool) The server's wallet address, obtained from the pricing-listing tool.
          - paymentMethod: (Required for the make-purchase tool) The payment method to use for the purchase.
          - You do NOT need to provide signedTransaction for the make-purchase tool; it will be automatically added by the MCP server.

        Important Instructions:
        1. Ensure that all required parameters listed above are provided to the tool. Mainly, the serverWalletAddress and itemPrice for the make-purchase tool.
        2. Always display the transaction cost to the user before proceeding with the purchase.
        3. If the tool execution fails or encounters a technical issue, do NOT attempt to retry.
        4. After successful execution, return the following information:
           - The tool's response.
           - The transaction hash.
           - A confirmation message including the transaction cost.
           - The blockchain explorer URL from the tool response.
           - The blockchain name from the tool response.
      `,
    schema: CallServerSchema,
    execute: async ({ mcpServerUrl, toolName, args, }) => {
        const logger = new Logger();
        const wallet = new Wallet();
        logger.info(`Calling tool ${toolName} for server: ${mcpServerUrl}`);
        if (toolName === "make-purchase" && !args.serverWalletAddress) {
            logger.error("serverWalletAddress is required for the make-purchase tool");
            throw new Error("serverWalletAddress is required for the make-purchase tool");
        }
        else if (toolName === "make-purchase" && !args.itemPrice) {
            logger.error("itemPrice is required for the make-purchase tool");
            throw new Error("itemPrice is required for the make-purchase tool");
        }
        var client;
        try {
            client = new FluoraMcpClientSSE();
            await client.connect(mcpServerUrl);
        }
        catch (error) {
            client = new FluoraMcpClientStreamable();
            await client.connect(mcpServerUrl);
        }
        if (toolName === "make-purchase") {
            if (!args.paymentMethod) {
                throw new Error("paymentMethod is required for the make-purchase tool");
            }
            const paymentsTools = new PaymentsTools();
            logger.info(`Signing transaction for server: ${args.serverWalletAddress}`);
            const paymentHeader = await paymentsTools.signTransaction(parseFloat(args.itemPrice), args.serverWalletAddress, wallet.getPrivateKey(args.paymentMethod), "http://example.com", args.paymentMethod);
            logger.info(`Payment header: ${JSON.stringify(paymentHeader)}`);
            const toolArgs = {
                ...args,
                signedTransaction: paymentHeader,
            };
            logger.info(`Tool args: ${JSON.stringify(toolArgs)}`);
            const serverToolResult = await client.callTool(toolName, toolArgs);
            await client.disconnect();
            logger.info(`Server tool result: ${JSON.stringify(serverToolResult, null, 2)}`);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ...serverToolResult,
                            payment: {
                                paymentMessage: `This transaction cost ${args.itemPrice} USDC`,
                            },
                        }),
                    },
                ],
            };
        }
        else {
            const toolArgs = {
                ...args,
            };
            logger.info(`Tool args: ${JSON.stringify(toolArgs)}`);
            const serverToolResult = await client.callTool(toolName, toolArgs);
            await client.disconnect();
            logger.info(`Server tool result: ${JSON.stringify(serverToolResult, null, 2)}`);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ...serverToolResult,
                        }),
                        prompt: Prompts[toolName],
                    },
                ],
            };
        }
    },
};
