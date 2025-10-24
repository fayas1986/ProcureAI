import React from 'react';
import type { Currency } from '../../types';
import { exchangeRates } from '../../data/mockData'; 

interface CurrencySwitcherProps {
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
  rates: Record<string, number> | null;
}

const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({ displayCurrency, setDisplayCurrency, rates }) => {
  const handleCurrencyChange = (currencyCode: string) => {
    setDisplayCurrency(currencyCode as Currency);
  };

  const availableCurrencies = Object.keys(exchangeRates) as Currency[];

  const currentRate = rates ? rates[displayCurrency] : null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={displayCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none pr-8"
          aria-label="Select display currency"
        >
          {availableCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
       <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
       {currentRate && displayCurrency !== 'USD' && (
        <div className="text-sm text-muted-foreground whitespace-nowrap p-2 h-10 flex items-center rounded-md bg-muted">
          1 USD = {currentRate.toFixed(4)} {displayCurrency}
        </div>
      )}
    </div>
  );
};

export default CurrencySwitcher;