const BALANCE_KEY = 'casinoBalance';
const STARTING_BALANCE = 1000;

function fetchBalance() {
  const raw = localStorage.getItem(BALANCE_KEY);
  const value = Number(raw);
  if (raw === null || !Number.isFinite(value)) {
    localStorage.setItem(BALANCE_KEY, String(STARTING_BALANCE));
    return STARTING_BALANCE;
  }
  return Math.max(0, Math.floor(value));
}

function adjustBalance(delta) {
  const current = fetchBalance();
  const next = current + Number(delta);
  if (!Number.isFinite(next)) {
    throw new Error('Balance update failed');
  }
  if (next < 0) {
    const err = new Error('Insufficient funds');
    err.balance = current;
    throw err;
  }
  const saved = Math.floor(next);
  localStorage.setItem(BALANCE_KEY, String(saved));
  return saved;
}

function initBalanceDisplay(elementId, fallback = STARTING_BALANCE) {
  const el = document.getElementById(elementId);
  const value = fetchBalance();
  if (el) {
    el.textContent = elementId === 'bankroll' ? `$${value}` : value;
  }
  return Promise.resolve(value || fallback);
}
