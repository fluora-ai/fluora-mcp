import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export type MCPTool = {
    name: string;
    description: string;
    schema: z.ZodRawShape;
    execute: (...args: any) => Promise<CallToolResult>;
}