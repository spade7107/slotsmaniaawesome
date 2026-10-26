const prizes = [
  { label: 'NO PRIZE', multiplier: 0, angle: 136.5, color: '#ed5b53' },
  { label: '0.5x', multiplier: 0.5, angle: 100, color: '#e8a534' },
  { label: '1x', multiplier: 1, angle: 76, color: '#20a88b' },
  { label: '2x', multiplier: 2, angle: 30, color: '#268ec2' },
  { label: '3x', multiplier: 3, angle: 10, color: '#df5484' },
  { label: '5x', multiplier: 5, angle: 4, color: '#dd7137' },
  { label: '10x', multiplier: 10, angle: 2, color: '#68833b' },
  { label: '25x', multiplier: 25, angle: 1, color: '#52a5c5' },
  { label: '50x', multiplier: 50, angle: 0.5, color: '#d0ad43' },
];
const missSlice = { ...prizes[0], angle: prizes[0].angle / 4 };
const wheelSlices = [
  { ...prizes[1], id: 'half' }, { ...missSlice, id: 'miss-1' }, { ...prizes[5], id: 'five' },
  { ...prizes[2], id: 'one' }, { ...missSlice, id: 'miss-2' }, { ...prizes[6], id: 'ten' },
  { ...prizes[3], id: 'two' }, { ...missSlice, id: 'miss-3' }, { ...prizes[7], id: 'twenty-five' },
  { ...prizes[4], id: 'three' }, { ...missSlice, id: 'miss-4' }, { ...prizes[8], id: 'fifty' },
];
const wagers = [5, 10, 25, 50];
const totalAngle = prizes.reduce((total, prize) => total + prize.angle, 0);
const weightedAngle = prizes.reduce((total, prize) => total + prize.angle * prize.multiplier, 0);
const rtp = weightedAngle / totalAngle;
const houseEdge = 1 - rtp;
const wheel = document.getElementById('prize-wheel');
const spinButton = document.getElementById('spin-button');
const resultDialog = document.getElementById('result-dialog');
const refillButton = document.getElementById('refill-button');
const balanceError = document.getElementById('balance-error');
const spinDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 5200;

let balance = 1000;
let balanceReady = false;
let wager = 10;
let rotation = 0;
let isSpinning = false;
let selectedPrize = null;
let returned = 0;

function formatCredits(amount) {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function pickPrize() {
  const roll = Math.random() * 360;
  let end = 0;
  for (const prize of wheelSlices) {
    end += prize.angle;
    if (roll < end) return { prize, center: end - prize.angle / 2 };
  }
  const lastPrize = wheelSlices[wheelSlices.length - 1];
  return { prize: lastPrize, center: 360 - lastPrize.angle / 2 };
}

function makeWheel() {
  let start = 0;
  const stops = wheelSlices.map((prize) => {
    const end = start + prize.angle;
    const stop = `${prize.color} ${start}deg ${end}deg`;
    start = end;
    return stop;
  });
  wheel.style.background = `conic-gradient(${stops.join(', ')})`;
  let center = 0;
  for (const prize of wheelSlices) {
    if (prize.angle >= 10) {
      const angle = (center + prize.angle / 2) * Math.PI / 180;
      const label = document.createElement('span');
      label.className = 'wheel-label';
      label.textContent = prize.multiplier === 0 ? 'MISS' : prize.label;
      label.style.left = `${50 + Math.sin(angle) * 34}%`;
      label.style.top = `${50 - Math.cos(angle) * 34}%`;
      wheel.append(label);
    }
    center += prize.angle;
  }
}

function makeWagerSelector() {
  const selector = document.getElementById('wager-selector');
  selector.replaceChildren(...wagers.map((amount) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wager-button';
    button.textContent = String(amount);
    button.setAttribute('aria-label', `Wager ${amount} credits`);
    button.setAttribute('aria-pressed', String(wager === amount));
    button.addEventListener('click', () => {
      if (isSpinning) return;
      wager = amount;
      render();
    });
    return button;
  }));
}

function makePrizeBoard() {
  const list = document.getElementById('prize-list');
  list.replaceChildren(...prizes.map((prize) => {
    const row = document.createElement('div');
    row.className = 'prize-row';
    const swatch = document.createElement('span');
    swatch.className = 'prize-swatch';
    swatch.style.backgroundColor = prize.color;
    swatch.style.color = prize.color;
    const name = document.createElement('span');
    name.className = 'prize-name';
    name.textContent = prize.multiplier === 0 ? 'No prize' : `${prize.multiplier}x payout`;
    const chance = document.createElement('span');
    chance.className = 'prize-chance';
    chance.textContent = `${(prize.angle / totalAngle * 100).toFixed(prize.angle < 10 ? 2 : prize.angle < 36 ? 1 : 0)}%`;
    row.append(swatch, name, chance);
    return row;
  }));
  document.getElementById('rtp-value').textContent = `${(rtp * 100).toFixed(2)}%`;
  document.getElementById('edge-value').textContent = `${(houseEdge * 100).toFixed(2)}%`;
  document.getElementById('odds-equation').textContent = `${weightedAngle} weighted return / ${totalAngle} total = ${(rtp * 100).toFixed(2)}% RTP`;
}

function render() {
  document.getElementById('balance').textContent = formatCredits(balance);
  document.getElementById('wager-display').textContent = formatCredits(wager);
  document.getElementById('expected-value').textContent = `-${formatCredits(wager * houseEdge)} credits`;
  spinButton.disabled = isSpinning || !balanceReady || balance < wager;
  spinButton.textContent = isSpinning ? 'Spinning...' : 'Spin the wheel';
  refillButton.hidden = balance >= 5;
  refillButton.disabled = isSpinning || !balanceReady;
  document.querySelectorAll('.wager-button').forEach((button) => {
    const amount = Number(button.textContent);
    button.setAttribute('aria-pressed', String(wager === amount));
    button.disabled = isSpinning || !balanceReady || balance < amount;
  });
}

function showBalanceError(message) {
  balanceError.textContent = message;
  balanceError.hidden = false;
}

function clearBalanceError() {
  balanceError.textContent = '';
  balanceError.hidden = true;
}

function showResult() {
  const prizeLabel = selectedPrize.multiplier === 0 ? 'MISS' : selectedPrize.label;
  document.getElementById('wheel-caption').textContent = 'Last prize';
  document.getElementById('wheel-result').textContent = prizeLabel;
  document.getElementById('dialog-prize').textContent = prizeLabel;
  document.getElementById('dialog-message').textContent = returned > wager
    ? `You won ${formatCredits(returned)} credits`
    : returned > 0 ? `${formatCredits(returned)} credits returned` : 'No prize this time';
  document.getElementById('dialog-note').textContent = returned > 0
    ? `Your ${formatCredits(wager)} credit wager is included`
    : `${formatCredits(wager)} credits wagered`;
  document.getElementById('game-status').textContent = returned > 0
    ? `${prizeLabel} landed. ${formatCredits(returned)} credits returned.`
    : 'No prize this time. Choose a wager and try again.';
}

function spin() {
  if (isSpinning || !balanceReady || balance < wager) return;
  const selection = pickPrize();
  const currentOffset = ((rotation % 360) + 360) % 360;
  const alignment = (360 - ((selection.center + currentOffset) % 360)) % 360;
  rotation += 360 * 7 + alignment;
  selectedPrize = selection.prize;
  returned = Math.floor(wager * selectedPrize.multiplier);
  isSpinning = true;
  resultDialog.close();
  clearBalanceError();
  try {
    balance = adjustBalance(-wager);
  } catch (error) {
    isSpinning = false;
    if (typeof error.balance === 'number') balance = error.balance;
    showBalanceError(error.message === 'Insufficient funds' ? 'Not enough credits for that wager.' : 'Could not update your balance.');
    render();
    return;
  }
  render();
  document.getElementById('game-status').textContent = 'Wheel in motion...';
  wheel.style.transform = `rotate(${rotation}deg)`;
  window.setTimeout(() => {
    try {
      if (returned > 0) balance = adjustBalance(returned);
      showResult();
    } catch {
      showBalanceError('The result was recorded, but the payout could not be saved.');
      returned = 0;
      showResult();
    }
    isSpinning = false;
    render();
    resultDialog.showModal();
  }, spinDuration);
}

function refill() {
  if (isSpinning || !balanceReady || balance >= 5) return;
  try {
    balance = adjustBalance(1000 - balance);
    clearBalanceError();
    render();
  } catch {
    showBalanceError('Could not refill your credits.');
  }
}

function initialize() {
  makeWheel();
  makeWagerSelector();
  makePrizeBoard();
  render();
  spinButton.addEventListener('click', spin);
  refillButton.addEventListener('click', refill);
  document.getElementById('close-dialog').addEventListener('click', () => resultDialog.close());
  resultDialog.addEventListener('click', (event) => {
    if (event.target === resultDialog) resultDialog.close();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'casinoBalance') {
      balance = fetchBalance();
      render();
    }
  });
  initBalanceDisplay('balance', 1000).then((value) => {
    balance = value;
    balanceReady = true;
    render();
  }).catch(() => showBalanceError('Could not load your balance. Refresh the page to try again.'));
}

initialize();