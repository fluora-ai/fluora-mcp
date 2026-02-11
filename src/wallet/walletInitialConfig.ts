import { PaymentMethods } from "monetizedmcp-sdk";

export type WalletConfig = {
  [key: string]: {
    privateKey: string;
    address: string;
  };
};

export const walletInitialConfig: WalletConfig = {
  [PaymentMethods.USDC_BASE_SEPOLIA.toString()]: {
    privateKey: "",
    address: ""
  },
  [PaymentMethods.USDC_BASE_MAINNET.toString()]: {
    privateKey: "",
    address: ""
  }
};
