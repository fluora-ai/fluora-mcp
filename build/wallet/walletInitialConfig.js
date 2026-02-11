import { PaymentMethods } from "monetizedmcp-sdk";
export const walletInitialConfig = {
    [PaymentMethods.USDC_BASE_SEPOLIA.toString()]: {
        privateKey: "",
        address: ""
    },
    [PaymentMethods.USDC_BASE_MAINNET.toString()]: {
        privateKey: "",
        address: ""
    }
};
