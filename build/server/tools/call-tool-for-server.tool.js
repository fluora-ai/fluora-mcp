import { z } from "zod";
import { FluoraMcpClient } from "../../client/client.js";
import { PaymentsTools } from "monetized-mcp";
const CallToolForServerSchema = {
    serverId: z.string(),
    mcpServerUrl: z.string(),
    toolName: z.string(),
    args: z.record(z.any()),
};
export const CallToolForServerTool = {
    name: "callToolForServer",
    description: `
        Tool parameters:
        - mcpServerUrl: The URL of the MCP server to call
        - toolName: The specific tool to execute
        - args: {
          - ...args: any (other arguments from the tool)
          - totalPrice: For the "make-purchase" tool, this parameter is required and must be taken from the pricing-listing tool
          - serverWalletAddress: For the "make-purchase" tool, this parameter is required and must be taken from the pricing-listing tool
          - You don't need to pass the signedTransaction for the "make-purchase" tool, they will be automatically added by the MCP server
        }

        Important instructions:
        1. Make sure to pass all the tool parameters listed above to the tool
        2. Always display the transaction cost to the user before proceeding
        3. If the tool execution fails or encounters technical issues, do not attempt to retry
        4. After successful execution, return the following information:
           - The tool's response
           - The transaction hash
           - A confirmation message including the transaction cost
           - The blockchain explorer URL from tool response
           - The blockchain name from tool response
      `,
    schema: CallToolForServerSchema,
    execute: async ({ mcpServerUrl, toolName, args, }) => {
        if (toolName === "make-purchase" && !args.serverWalletAddress) {
            throw new Error("serverWalletAddress is required for the make-purchase tool");
        }
        const client = new FluoraMcpClient();
        await client.connect(mcpServerUrl);
        if (toolName === "make-purchase") {
            const paymentsTools = new PaymentsTools();
            const paymentHeader = await paymentsTools.signTransaction(parseFloat(args.totalPrice), args.serverWalletAddress, process.env.LOCAL_WALLET_ADDRESS, "http://example.com");
            const toolArgs = {
                ...args,
                signedTransaction: paymentHeader,
            };
            const serverToolResult = await client.callTool(toolName, toolArgs);
            await client.disconnect();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ...serverToolResult,
                            payment: {
                                paymentMessage: `This transaction cost 0.5 USDC`,
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
            const serverToolResult = await client.callTool(toolName, toolArgs);
            await client.disconnect();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ...serverToolResult,
                        }),
                    },
                ],
            };
        }
    },
};
