const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', UAH: '₴' };
const ALERT_THRESHOLD  = { USD: 100, EUR: 92, UAH: 4100 };
const STORAGE_KEY = 'meetingHistory';

let timerInterval = null;
let startTime     = null;
let elapsed       = 0;

const timeEl      = document.getElementById('time');
const costEl      = document.getElementById('cost');
const costAlertEl = document.getElementById('costAlert');
const displayEl   = document.getElementById('display');
const btnStart    = document.getElementById('btnStart');
const btnStop     = document.getElementById('btnStop');
const btnReset    = document.getElementById('btnReset');
const btnExport   = document.getElementById('btnExport');
const historyBody = document.getElementById('historyBody');
const historyTable= document.getElementById('historyTable');
const emptyMsg    = document.getElementById('emptyHistory');

function getParticipants() { return parseInt(document.getElementById('participants').value) || 1; }
function getRate()         { return parseFloat(document.getElementById('rate').value.replace(/\s/g, '')) || 0; }
function getCurrency()     { return document.getElementById('currency').value; }

const WORK_HOURS_PER_MONTH = 168; // 8h × 21 day

function calcCost(seconds) {
  const hourlyRate = getRate() / WORK_HOURS_PER_MONTH;
  return hourlyRate * getParticipants() * seconds / 3600;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function formatCost(amount) {
  const formatted = amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return CURRENCY_SYMBOLS[getCurrency()] + formatted;
}

function updateDisplay() {
  const seconds   = Math.floor((Date.now() - startTime) / 1000) + elapsed;
  const cost      = calcCost(seconds);
  const threshold = ALERT_THRESHOLD[getCurrency()];

  timeEl.textContent = formatTime(seconds);
  costEl.textContent = formatCost(cost);

  if (cost >= threshold) {
    displayEl.classList.add('alert');
    costAlertEl.textContent = `Перевищено ${CURRENCY_SYMBOLS[getCurrency()]}${threshold}!`;
  } else {
    displayEl.classList.remove('alert');
    costAlertEl.textContent = '';
  }
}

btnStart.addEventListener('click', () => {
  startTime = Date.now();
  timerInterval = setInterval(updateDisplay, 1000);
  btnStart.disabled = true;
  btnStop.disabled  = false;
  document.getElementById('participants').disabled = true;
  document.getElementById('rate').disabled         = true;
});

btnStop.addEventListener('click', () => {
  clearInterval(timerInterval);
  const seconds = Math.floor((Date.now() - startTime) / 1000) + elapsed;
  elapsed = seconds;
  btnStop.disabled  = true;
  btnStart.disabled = false;

  saveMeeting(seconds, calcCost(seconds));
});

btnReset.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  startTime     = null;
  elapsed       = 0;

  timeEl.textContent    = '00:00:00';
  costEl.textContent    = formatCost(0);
  costAlertEl.textContent = '';
  displayEl.classList.remove('alert');

  btnStart.disabled = false;
  btnStop.disabled  = true;
  document.getElementById('participants').disabled = false;
  document.getElementById('rate').disabled         = false;
});

function saveMeeting(seconds, usd) {
  const history = loadHistory();
  history.push({
    date:         new Date().toLocaleString('uk-UA'),
    duration:     formatTime(seconds),
    participants: getParticipants(),
    cost:         formatCost(usd),
    costRaw:      usd,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory(history);
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function renderHistory(history) {
  if (!history.length) {
    historyTable.style.display = 'none';
    emptyMsg.style.display     = 'block';
    return;
  }
  historyTable.style.display = 'table';
  emptyMsg.style.display     = 'none';

  historyBody.innerHTML = history.slice().reverse().map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.duration}</td>
      <td>${r.participants}</td>
      <td>${r.cost}</td>
    </tr>
  `).join('');
}

btnExport.addEventListener('click', () => {
  const history = loadHistory();
  if (!history.length) return;

  const rows = [['Дата', 'Тривалість', 'Учасники', 'Вартість']];
  history.forEach(r => rows.push([r.date, r.duration, r.participants, r.cost]));

  const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `meetings_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

const rateLabelEl = document.getElementById('rateLabel');
const rateInput   = document.getElementById('rate');

rateInput.addEventListener('input', () => {
  const digits = rateInput.value.replace(/\D/g, '');
  rateInput.value = digits ? parseInt(digits).toLocaleString('uk-UA') : '';
});

document.getElementById('currency').addEventListener('change', () => {
  const symbol = CURRENCY_SYMBOLS[getCurrency()];
  rateLabelEl.textContent = symbol;
  costEl.textContent = formatCost(0);
});

costEl.textContent = formatCost(0);
renderHistory(loadHistory());
