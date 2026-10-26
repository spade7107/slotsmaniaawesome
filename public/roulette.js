const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const chips = [1, 5, 25, 100];
const numberRows = [3, 2, 1];
const wheelSegmentSize = 360 / wheelOrder.length;
const wheel = document.getElementById('roulette-wheel');
const spinButton = document.getElementById('spin-button');
const resultDialog = document.getElementById('result-dialog');
const balanceError = document.getElementById('balance-error');
const spinDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 5200;

let balance = 1000;
let balanceReady = false;
let selectedChip = 5;
let bets = [];
let rotation = 0;
let isSpinning = false;
let recentResults = [];

function getNumberColor(number) {
  if (number === 0) return 'green';
  return redNumbers.has(number) ? 'red' : 'black';
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const numberTargets = Array.from({ length: 37 }, (_, number) => ({
  id: `number-${number}`, label: String(number), numbers: [number], payout: 35, kind: 'number',
}));
const dozenTargets = [0, 1, 2].map((dozen) => ({
  id: `dozen-${dozen + 1}`, label: `${dozen + 1}${['st', 'nd', 'rd'][dozen]} 12`,
  numbers: range(dozen * 12 + 1, dozen * 12 + 12), payout: 2, kind: 'dozen',
}));
const columnTargets = [0, 1, 2].map((column) => ({
  id: `column-${column + 1}`, label: `${column + 1}${['st', 'nd', 'rd'][column]} column`,
  numbers: Array.from({ length: 12 }, (_, index) => index * 3 + column + 1), payout: 2, kind: 'column',
}));
const outsideTargets = [
  { id: 'low', label: '1 - 18', numbers: range(1, 18), payout: 1, kind: 'outside' },
  { id: 'even', label: 'EVEN', numbers: range(1, 36).filter((number) => number % 2 === 0), payout: 1, kind: 'outside' },
  { id: 'red', label: 'RED', numbers: [...redNumbers], payout: 1, kind: 'outside' },
  { id: 'black', label: 'BLACK', numbers: range(1, 36).filter((number) => !redNumbers.has(number)), payout: 1, kind: 'outside' },
  { id: 'odd', label: 'ODD', numbers: range(1, 36).filter((number) => number % 2 === 1), payout: 1, kind: 'outside' },
  { id: 'high', label: '19 - 36', numbers: range(19, 36), payout: 1, kind: 'outside' },
];
const targets = [...numberTargets, ...dozenTargets, ...columnTargets, ...outsideTargets];
const targetsById = new Map(targets.map((target) => [target.id, target]));

function colorClass(color) {
  return color === 'green' ? 'bet-green' : color === 'red' ? 'bet-red' : 'bet-black';
}

function makeTargetButton(target, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `bet-target ${extraClass}`.trim();
  button.dataset.targetId = target.id;
  button.setAttribute('aria-label', `Bet ${target.label}`);
  if (target.kind === 'number') button.classList.add(colorClass(getNumberColor(Number(target.label))));
  else if (target.id === 'red') button.classList.add('bet-red');
  else if (target.id === 'black') button.classList.add('bet-black');
  else button.classList.add('bet-outside');
  const label = document.createElement('span');
  label.textContent = target.label;
  button.append(label);
  return button;
}

function makeWheel() {
  const stops = wheelOrder.map((number, index) => {
    const start = index * wheelSegmentSize;
    const end = (index + 1) * wheelSegmentSize;
    const color = getNumberColor(number);
    const fill = color === 'green' ? '#23805c' : color === 'red' ? '#bd3d39' : '#202622';
    return `${fill} ${start}deg ${end}deg`;
  });
  wheel.style.background = `conic-gradient(${stops.join(', ')})`;
  wheelOrder.forEach((number, index) => {
    const angle = (index + 0.5) * wheelSegmentSize * Math.PI / 180;
    const label = document.createElement('span');
    label.className = 'wheel-number';
    label.textContent = String(number);
    label.style.left = `${50 + Math.sin(angle) * 38}%`;
    label.style.top = `${50 - Math.cos(angle) * 38}%`;
    wheel.append(label);
  });
}

function makeChipSelector() {
  const selector = document.getElementById('chip-selector');
  selector.replaceChildren(...chips.map((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip-button';
    button.dataset.value = String(value);
    button.textContent = String(value);
    button.setAttribute('aria-label', `Select ${value} credit chip`);
    button.setAttribute('aria-pressed', String(value === selectedChip));
    button.addEventListener('click', () => {
      if (isSpinning) return;
      selectedChip = value;
      render();
    });
    return button;
  }));
}

function makeBettingTable() {
  document.getElementById('zero-target').append(makeTargetButton(numberTargets[0], 'bet-number'));
  const numberGrid = document.getElementById('number-grid');
  for (let column = 0; column < 12; column += 1) {
    for (const rowNumber of numberRows) {
      const number = column * 3 + rowNumber;
      numberGrid.append(makeTargetButton(numberTargets[number], 'bet-number'));
    }
  }
  for (const [id, items] of [['column-targets', columnTargets], ['dozen-targets', dozenTargets], ['outside-targets', outsideTargets]]) {
    const container = document.getElementById(id);
    for (const target of items) container.append(makeTargetButton(target));
  }
}

function getTargetWager(targetId) {
  return bets.reduce((total, bet) => total + (bet.target.id === targetId ? bet.amount : 0), 0);
}

function getTotalWager() {
  return bets.reduce((total, bet) => total + bet.amount, 0);
}

function render() {
  document.getElementById('balance').textContent = balance.toLocaleString('en-US');
  document.getElementById('total-wager').textContent = getTotalWager().toLocaleString('en-US');
  document.getElementById('bet-count').textContent = `${bets.length} ${bets.length === 1 ? 'bet' : 'bets'}`;
  document.getElementById('undo-button').disabled = isSpinning || bets.length === 0;
  document.getElementById('clear-button').disabled = isSpinning || bets.length === 0;
  spinButton.disabled = isSpinning || !balanceReady || bets.length === 0;
  document.querySelectorAll('[data-target-id]').forEach((button) => {
    const wager = getTargetWager(button.dataset.targetId);
    const target = targetsById.get(button.dataset.targetId);
    const label = button.querySelector('span');
    button.replaceChildren(label);
    if (wager > 0) {
      const badge = document.createElement('span');
      badge.className = 'bet-stake';
      badge.textContent = String(wager);
      button.append(badge);
    }
    button.disabled = isSpinning || !balanceReady || balance < selectedChip;
    button.setAttribute('aria-label', `Bet on ${target.label}${wager ? `, ${wager} credits already placed` : ''}`);
  });
  document.querySelectorAll('.chip-button').forEach((button) => {
    const value = Number(button.dataset.value);
    button.setAttribute('aria-pressed', String(value === selectedChip));
    button.disabled = isSpinning || !balanceReady || balance < value;
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

function refreshBalance() {
  balance = fetchBalance();
  render();
}

function placeBet(targetId) {
  if (isSpinning || !balanceReady || balance < selectedChip) return;
  const target = targetsById.get(targetId);
  if (!target) return;
  try {
    balance = adjustBalance(-selectedChip);
    bets.push({ target, amount: selectedChip });
    clearBalanceError();
    document.getElementById('wheel-caption').textContent = 'Place your bets';
    document.getElementById('wheel-result').textContent = 'SPIN';
    document.getElementById('game-status').textContent = 'Tap the wheel button when your bets are set.';
    render();
  } catch (error) {
    if (typeof error.balance === 'number') balance = error.balance;
    showBalanceError(error.message === 'Insufficient funds' ? 'Not enough credits for that chip.' : 'Could not update your balance.');
    render();
  }
}

function returnStake(amount) {
  if (amount > 0) balance = adjustBalance(amount);
}

function undoBet() {
  if (isSpinning || bets.length === 0) return;
  const bet = bets[bets.length - 1];
  try {
    returnStake(bet.amount);
    bets.pop();
    clearBalanceError();
    render();
  } catch {
    showBalanceError('Could not return that chip to your balance.');
  }
}

function clearBets() {
  if (isSpinning || bets.length === 0) return;
  try {
    returnStake(getTotalWager());
    bets = [];
    clearBalanceError();
    render();
  } catch {
    showBalanceError('Could not return the chips to your balance.');
  }
}

function calculateReturn(result) {
  return bets.reduce((total, bet) => total + (bet.target.numbers.includes(result) ? bet.amount * (bet.target.payout + 1) : 0), 0);
}

function showResult(number, returned) {
  const color = getNumberColor(number);
  const numberElement = document.getElementById('dialog-number');
  numberElement.className = `dialog-number bet-${color}`;
  numberElement.textContent = String(number);
  document.getElementById('dialog-message').textContent = returned > 0
    ? `You won ${returned.toLocaleString('en-US')} credits`
    : 'No winning bets this round';
  document.getElementById('dialog-note').textContent = returned > 0 ? 'Includes returned winning stakes' : '';
  document.getElementById('wheel-caption').textContent = 'Last result';
  document.getElementById('wheel-result').textContent = String(number);
  document.getElementById('game-status').textContent = returned > 0
    ? `Number ${number} landed. ${returned.toLocaleString('en-US')} credits returned.`
    : `Number ${number} landed. No winning bets this round.`;
  recentResults = [{ number, color }, ...recentResults].slice(0, 8);
  const recentContainer = document.getElementById('recent-results');
  recentContainer.replaceChildren(...recentResults.map((item) => {
    const badge = document.createElement('span');
    badge.className = `recent-number bet-${item.color}`;
    badge.textContent = String(item.number);
    badge.setAttribute('aria-label', `${item.number} ${item.color}`);
    return badge;
  }));
  document.getElementById('recent-count').textContent = `${recentResults.length} / 8`;
}

function spin() {
  if (isSpinning || !balanceReady || bets.length === 0) return;
  const result = Math.floor(Math.random() * 37);
  const index = wheelOrder.indexOf(result);
  const center = (index + 0.5) * wheelSegmentSize;
  const currentOffset = ((rotation % 360) + 360) % 360;
  const alignment = (360 - ((center + currentOffset) % 360)) % 360;
  rotation += 360 * 7 + alignment;
  isSpinning = true;
  resultDialog.close();
  clearBalanceError();
  document.getElementById('game-status').textContent = 'The ball is in motion...';
  spinButton.textContent = 'Spinning...';
  render();
  wheel.style.transform = `rotate(${rotation}deg)`;
  window.setTimeout(() => {
    const returned = calculateReturn(result);
    try {
      returnStake(returned);
      showResult(result, returned);
    } catch {
      showBalanceError('The result was recorded, but the payout could not be saved.');
      showResult(result, 0);
    }
    bets = [];
    isSpinning = false;
    spinButton.textContent = 'Spin the wheel';
    render();
    resultDialog.showModal();
  }, spinDuration);
}

function initialize() {
  makeWheel();
  makeChipSelector();
  makeBettingTable();
  render();
  document.querySelector('.betting-table').addEventListener('click', (event) => {
    const button = event.target.closest('[data-target-id]');
    if (button && !button.disabled) placeBet(button.dataset.targetId);
  });
  document.getElementById('undo-button').addEventListener('click', undoBet);
  document.getElementById('clear-button').addEventListener('click', clearBets);
  spinButton.addEventListener('click', spin);
  document.getElementById('close-dialog').addEventListener('click', () => resultDialog.close());
  resultDialog.addEventListener('click', (event) => {
    if (event.target === resultDialog) resultDialog.close();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'casinoBalance') refreshBalance();
  });
  initBalanceDisplay('balance', 1000).then((value) => {
    balance = value;
    balanceReady = true;
    render();
  }).catch(() => {
    showBalanceError('Could not load your balance. Refresh the page to try again.');
  });
}

initialize();