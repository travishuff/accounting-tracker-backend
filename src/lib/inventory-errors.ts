class InsufficientEligibleInventoryError extends Error {
  available: number;
  requested: number;
  sellDate: string;

  constructor(available: number, requested: number, sellDate: string) {
    super(`Only ${available} banana(s) eligible to sell on ${sellDate}, requested ${requested}`);
    this.name = 'InsufficientEligibleInventoryError';
    this.available = available;
    this.requested = requested;
    this.sellDate = sellDate;
  }
}

export { InsufficientEligibleInventoryError };
