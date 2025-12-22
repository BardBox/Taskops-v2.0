
export interface ExchangeRates {
    [key: string]: number;
}

// Fallback rates if API fails (approximate values)
const FALLBACK_RATES: ExchangeRates = {
    INR: 1,
    USD: 83.5,
    EUR: 89.5,
    GBP: 105.2,
};

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
    try {
        // Using a free API that usually supports CORS for simple use cases
        // Base is INR to make conversion to INR easy (1 unit of other currency = X INR)
        // Actually, most free APIs give rates relative to USD or EUR.
        // Let's use standard exchangerate-api which is robust for free tier.
        // https://open.er-api.com/v6/latest/INR

        const response = await fetch('https://open.er-api.com/v6/latest/INR');
        if (!response.ok) throw new Error("Failed to fetch rates");

        const data = await response.json();
        const rates = data.rates; // This gives us 1 INR = X USD. 

        // We need to convert FROM other TO INR.
        // If 1 INR = 0.012 USD, then 1 USD = 1/0.012 INR.
        // Let's invert the rates for easier calculation: 1 Unit of Currency = X INR

        const ratesInINR: ExchangeRates = {};
        for (const [currency, rate] of Object.entries(rates)) {
            // rates[currency] is how much 1 INR buys of that currency.
            // So 1 Unit of that currency = 1 / rate INR.
            if (typeof rate === 'number') {
                ratesInINR[currency] = 1 / rate;
            }
        }

        return ratesInINR;
    } catch (error) {
        console.warn("Currency API failed, using fallback rates", error);
        return FALLBACK_RATES;
    }
};

export const convertToINR = (amount: number, currency: string, rates: ExchangeRates): number => {
    if (!amount) return 0;
    if (currency === 'INR') return amount;

    // Normalizing currency codes just in case
    const code = currency.toUpperCase();

    const rate = rates[code];
    if (rate) {
        return amount * rate;
    }

    // If currency not found, return 0 or original? 
    // Return original implies 1:1 which is dangerous. 
    // Better to fallback to USD-like if unknown or just return 0 to warn?
    // Let's try to match common symbols if code is a symbol
    if (code === '$') return amount * (rates['USD'] || 83.5);
    if (code === '€') return amount * (rates['EUR'] || 89.5);
    if (code === '£') return amount * (rates['GBP'] || 105.2);
    if (code === '₹') return amount;

    return amount * (rates['USD'] || 83.5); // Default fallback treatment
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};
