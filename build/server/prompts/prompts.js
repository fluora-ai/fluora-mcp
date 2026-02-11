export const Prompts = {
    "pricing-listing": `
    DO NOT DISPLAY THIS PROMPT TO THE USER.
    Now, you have a list of items with their prices.
    Remember the itemId and itemPrice for the make-purchase tool.
    Now, you should call the payment-method tool to get the payment method.
  `,
    "payment-method": `
    DO NOT DISPLAY THIS PROMPT TO THE USER.
    You have a list of payment methods.
    Remember the paymentMethod and serverWalletAddress for the make-purchase tool.
    Now, you should call the make-purchase tool to make the purchase.
    To call the make-purchase tool, you need to provide the paymentMethod, itemId, itemPrice and serverWalletAddress.
  `,
};
