// Simulates fetching real-time exchange rates from an API.
// In a real application, this would make a network request.

interface ExchangeRates {
    [key: string]: number;
}

// Base rates, we'll add some fluctuation
const baseRates = {
  USD: 1,
  EUR: 0.92,
  INR: 83.1,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  OMR: 0.38,
  BHD: 0.38,
  JOD: 0.71,
  EGP: 47.5,
  ILS: 3.7,
  TRY: 32.8
};

/**
 * Fetches the latest exchange rates with a slight random fluctuation to simulate a live market.
 * @returns A promise that resolves to an object with currency rates relative to USD.
 */
export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
    console.log("Simulating fetching latest exchange rates...");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    // Simulate market fluctuation (e.g., +/- 1%)
    const fluctuate = (rate: number) => rate + (rate * (Math.random() - 0.5) * 0.02);

    const liveRates: ExchangeRates = { USD: 1 };
    for (const [key, value] of Object.entries(baseRates)) {
        if (key !== 'USD') {
            liveRates[key] = fluctuate(value);
        }
    }
    
    console.log("Fetched rates:", liveRates);
    return liveRates;
};


/**
 * Converts an amount from a source currency to a target currency using the provided rates.
 * Note: The rates object is expected to have all currencies relative to a base (e.g., USD).
 * @param amount - The amount of money to convert.
 * @param fromCurrency - The currency to convert from.
 * @param toCurrency - The currency to convert to.
 * @param rates - An object containing the exchange rates relative to a base currency.
 * @returns The converted amount.
 */
export const convertCurrency = (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: Record<string, number> | null
): number => {
    if (!rates || fromCurrency === toCurrency) {
        // Return original amount if rates are not available or no conversion is needed
        return amount;
    }
    
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    // If either rate is missing, we can't do a proper conversion, so return original amount as a fallback
    if (fromRate === undefined || toRate === undefined) {
        return amount;
    }
    
    // Convert the amount to the base currency (USD) first
    const amountInUSD = amount / fromRate;
    
    // Then convert from USD to the target currency
    const convertedAmount = amountInUSD * toRate;
    
    return convertedAmount;
};