async function fetchBalance() {
  const res = await fetch('/api/balance');
  if (!res.ok) throw new Error('Could not load balance');
  const data = await res.json();
  return data.balance;
}

async function adjustBalance(delta) {
  const res = await fetch('/api/balance/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Balance update failed');
    err.balance = data.balance;
    throw err;
  }
  return data.balance;
}

async function initBalanceDisplay(elementId, fallback = 1000) {
  const el = document.getElementById(elementId);
  if (!el) return fallback;
  try {
    const value = await fetchBalance();
    el.textContent = elementId === 'bankroll' ? `$${value}` : value;
    return value;
  } catch {
    el.textContent = elementId === 'bankroll' ? `$${fallback}` : fallback;
    return fallback;
  }
}
