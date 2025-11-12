// Módulo para gestionar el historial de operaciones
const historyContainer = document.getElementById('operation-history');
let history = [];

function renderHistory() {
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    if (history.length === 0) {
        historyContainer.innerHTML = '<p>No hay operaciones en el historial.</p>';
        return;
    }

    const ul = document.createElement('ul');
    history.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${item}`;
        ul.appendChild(li);
    });
    historyContainer.appendChild(ul);
}

export function addOperationToHistory(operation) {
    history.push(operation);
    renderHistory();
}

export function clearHistory() {
    history = [];
    renderHistory();
}

export function initializeHistory() {
    renderHistory();
    const clearButton = document.getElementById('clear-history-tool');
    if (clearButton) {
        clearButton.addEventListener('click', clearHistory);
    }
    console.log('Historial de operaciones inicializado.');
}
