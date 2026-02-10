#!/usr/bin/env node
import { FluoraMcpServer } from './server/server.js';
import { Wallet } from './wallet/config.js';
import { default as pkg } from '../package.json' with { type: 'json' };
const main = async () => {
    try {
        console.error('Starting Fluora MCP Server v' + pkg.version);
        const server = new FluoraMcpServer();
        new Wallet();
        await server.startServer();
    }
    catch (error) {
        console.error(error);
    }
};
main();
