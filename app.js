let people = [];
let searchQuery = "";
let isExportEnabled = false; 
let activePersonId = null; 
let currentTheme = 'dark'; 
let tempRelations = [];

let zoomScale = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX, panStartY;

let draggingCard = null;
let dragOffset = { x: 0, y: 0 };

const CANVAS_CENTER_X = 2000;
const CANVAS_CENTER_Y = 2000;
const CARD_WIDTH = 224;  
const CARD_HEIGHT = 150; 

const searchInput = document.getElementById('search-input');
const peopleListContainer = document.getElementById('people-list-container');
const canvasViewport = document.getElementById('canvas-viewport');
const treeCanvas = document.getElementById('tree-canvas');
const canvasContent = document.getElementById('canvas-content');
const svgConnections = document.getElementById('svg-connections');
const editorModal = document.getElementById('editor-modal');
const editorModalContainer = document.getElementById('editor-modal-container');
const personForm = document.getElementById('person-form');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const addPersonBtn = document.getElementById('add-person-btn');
const loadDemoBtn = document.getElementById('load-demo-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const importJsonInput = document.getElementById('import-json-input');
const exportJsonBtn = document.getElementById('export-json-btn');
const exportPngBtn = document.getElementById('export-png-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const toolbarImportBtn = document.getElementById('toolbar-import-btn');

const dialogModal = document.getElementById('dialog-modal');
const dialogIcon = document.getElementById('dialog-icon');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogActions = document.getElementById('dialog-actions');

const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const sidebar = document.getElementById('sidebar');

const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomResetBtn = document.getElementById('zoom-reset-btn');
const zoomValue = document.getElementById('zoom-value');

const onboardingOverlay = document.getElementById('onboarding-overlay');
const onboardStartBtn = document.getElementById('onboard-start-btn');
const onboardDragZone = document.getElementById('onboard-drag-zone');
const onboardImportFile = document.getElementById('onboard-import-file');

const relationTargetSelect = document.getElementById('relation-target-select');
const relationTypeSelect = document.getElementById('relation-type-select');
const btnAddRelationItem = document.getElementById('btn-add-relation-item');
const modalActiveRelationsList = document.getElementById('modal-active-relations-list');

const editPersonBirth = document.getElementById('edit-person-birth');
const editPersonDeath = document.getElementById('edit-person-death');
const calculatedYearsBadge = document.getElementById('calculated-years-badge');
const calculatedYearsValue = document.getElementById('calculated-years-value');

function calculateAgeOrLifespan(birthVal, deathVal) {
    const extractYear = (str) => {
        if (!str) return null;
        const match = str.match(/\d{4}/);
        return match ? parseInt(match[0], 10) : null;
    };
    const birthYear = extractYear(birthVal);
    const deathYear = extractYear(deathVal);

    if (birthYear !== null) {
        if (deathYear !== null) {
            const diff = deathYear - birthYear;
            return diff >= 0 ? `${diff} р. (прожито)` : null;
        } else {
            const currentYear = new Date().getFullYear();
            const age = currentYear - birthYear;
            return age >= 0 ? `${age} р. (вік)` : null;
        }
    }
    return null;
}

function updateCalculatedYears() {
    const resultText = calculateAgeOrLifespan(editPersonBirth.value.trim(), editPersonDeath.value.trim());
    if (resultText) {
        calculatedYearsBadge.classList.remove('hidden');
        calculatedYearsValue.innerText = resultText;
    } else {
        calculatedYearsBadge.classList.add('hidden');
    }
}

editPersonBirth.addEventListener('input', updateCalculatedYears);
editPersonDeath.addEventListener('input', updateCalculatedYears);

function applyTheme(theme) {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    if (theme === 'light') {
        body.classList.add('theme-light');
        if (themeIcon) themeIcon.innerText = '🌙';
        if (themeText) themeText.innerText = 'Темна тема';
    } else {
        body.classList.remove('theme-light');
        if (themeIcon) themeIcon.innerText = '☀️';
        if (themeText) themeText.innerText = 'Світла тема';
    }
    currentTheme = theme;
    localStorage.setItem('family_tree_theme', theme);
    drawConnections();
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}

if (toolbarImportBtn) {
    toolbarImportBtn.addEventListener('click', () => {
        if (people.length > 0) {
            customConfirm("Імпорт проекту", "Завантаження нового файлу повністю замінить поточну схему. Продовжити?", () => importJsonInput.click(), '⚠️');
        } else {
            importJsonInput.click();
        }
    });
}

const demoDataset = [
    { id: "1", name: "Шевченко Григорій Іванович", occupation: "Чумак / хлібороб", gender: "male", notes: "Батько Тараса.", birthDate: "1781", deathDate: "1825", relations: [{ personId: "2", type: "Дружина" }, { personId: "3", type: "Син" }], x: 1750, y: 1750 },
    { id: "2", name: "Шевченко Катерина Якимівна", occupation: "Домогосподарка", gender: "female", notes: "Мати Тараса.", birthDate: "1783", deathDate: "1823", relations: [{ personId: "1", type: "Чоловік" }, { personId: "3", type: "Син" }], x: 2050, y: 1750 },
    { id: "3", name: "Шевченко Тарас Григорович", occupation: "Поет / маляр", gender: "male", notes: "Великий Кобзар.", birthDate: "09.03.1814", deathDate: "10.03.1861", relations: [{ personId: "1", type: "Батько" }, { personId: "2", type: "Мати" }], x: 1900, y: 2050 }
];

function loadState() {
    const saved = localStorage.getItem('family_tree_dragdrop_v3');
    const savedExportStatus = localStorage.getItem('family_tree_dragdrop_export_v3');
    if (saved) {
        people = JSON.parse(saved);
        onboardingOverlay.classList.add('hidden');
    } else {
        onboardingOverlay.classList.remove('hidden');
    }
    isExportEnabled = people.length > 0;
    updateExportButtonsState();
}

function saveState() {
    localStorage.setItem('family_tree_dragdrop_v3', JSON.stringify(people));
    localStorage.setItem('family_tree_dragdrop_export_v3', isExportEnabled ? 'true' : 'false');
    updateExportButtonsState();
}

function updateExportButtonsState() {
    if (isExportEnabled && people.length > 0) {
        exportJsonBtn.classList.remove('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
        exportPngBtn.classList.remove('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
    } else {
        exportJsonBtn.classList.add('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
        exportPngBtn.classList.add('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
    }
}

function triggerExportActivation() {
    isExportEnabled = true;
    saveState();
}

function customAlert(title, message, icon = '💡') {
    dialogIcon.innerText = icon;
    dialogTitle.innerText = title;
    dialogMessage.innerText = message;
    dialogActions.innerHTML = `<button id="dialog-ok-btn" class="bg-ide-accent text-ide-bg px-6 py-2 rounded-lg text-xs font-mono font-bold hover:bg-opacity-90 transition-all">OK</button>`;
    dialogModal.classList.remove('hidden');
    dialogModal.classList.add('flex');
    document.getElementById('dialog-ok-btn').addEventListener('click', () => {
        dialogModal.classList.add('hidden');
        dialogModal.classList.remove('flex');
    });
}

function customConfirm(title, message, onConfirm, icon = '❓') {
    dialogIcon.innerText = icon;
    dialogTitle.innerText = title;
    dialogMessage.innerText = message;
    dialogActions.innerHTML = `
        <button id="dialog-cancel-btn" class="bg-ide-canvas border border-ide-panelLight/40 text-ide-textBright px-4 py-2 rounded-lg text-xs font-mono transition-all">Скасувати</button>
        <button id="dialog-yes-btn" class="bg-red-500 text-ide-bg px-5 py-2 rounded-lg text-xs font-mono font-bold hover:bg-opacity-95 transition-all">Виконати</button>
    `;
    dialogModal.classList.remove('hidden');
    dialogModal.classList.add('flex');
    document.getElementById('dialog-cancel-btn').addEventListener('click', () => {
        dialogModal.classList.add('hidden');
        dialogModal.classList.remove('flex');
    });
    document.getElementById('dialog-yes-btn').addEventListener('click', () => {
        dialogModal.classList.add('hidden');
        dialogModal.classList.remove('flex');
        onConfirm();
    });
}

function applyCanvasTransform() {
    treeCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
    zoomValue.innerText = `${Math.round(zoomScale * 100)}%`;
}

function adjustZoom(amount) {
    zoomScale = Math.min(Math.max(zoomScale + amount, 0.3), 2.0);
    applyCanvasTransform();
}

function resetCanvasView() {
    zoomScale = 1.0;
    const viewRect = canvasViewport.getBoundingClientRect();
    panX = (viewRect.width / 2) - CANVAS_CENTER_X;
    panY = (viewRect.height / 2) - CANVAS_CENTER_Y;
    applyCanvasTransform();
}

function setActivePerson(id) {
    activePersonId = id;
    document.querySelectorAll('.canvas-card-node').forEach(card => card.classList.remove('neon-active'));
    document.querySelectorAll('.sidebar-person-item').forEach(item => {
        item.classList.remove('bg-ide-panelLight/60', 'border-ide-accent');
        item.classList.add('border-transparent');
    });
    if (!id) return;
    const activeCard = document.querySelector(`.canvas-card-node[data-id="${id}"]`);
    if (activeCard) activeCard.classList.add('neon-active');
    const activeSidebarItem = document.querySelector(`.sidebar-person-item[data-id="${id}"]`);
    if (activeSidebarItem) {
        activeSidebarItem.classList.add('bg-ide-panelLight/60', 'border-ide-accent');
        activeSidebarItem.classList.remove('border-transparent');
        activeSidebarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

canvasViewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('.card-body-node') || e.target.closest('form')) return;
    isPanning = true;
    canvasViewport.classList.replace('cursor-grab', 'cursor-grabbing');
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
    setActivePerson(null); 
});

window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        applyCanvasTransform();
        return;
    }
    if (draggingCard) {
        const mouseInCanvasX = (e.clientX - canvasViewport.getBoundingClientRect().left - panX) / zoomScale;
        const mouseInCanvasY = (e.clientY - canvasViewport.getBoundingClientRect().top - panY) / zoomScale;
        let targetX = mouseInCanvasX - dragOffset.x;
        let targetY = mouseInCanvasY - dragOffset.y;
        targetX = Math.min(Math.max(0, targetX), 3800);
        targetY = Math.min(Math.max(0, targetY), 3800);

        const personId = draggingCard.getAttribute('data-id');
        const personObj = people.find(p => p.id === personId);
        if (personObj) {
            personObj.x = targetX;
            personObj.y = targetY;
            draggingCard.style.transform = `translate(${targetX}px, ${targetY}px)`;
            
            // Миттєве оновлення ліній під час руху миші
            requestAnimationFrame(drawConnections);
        }
    }
});

window.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        canvasViewport.classList.replace('cursor-grabbing', 'cursor-grab');
    }
    if (draggingCard) {
        draggingCard.classList.remove('z-50');
        draggingCard = null;
        triggerExportActivation();
        saveState();
        drawConnections(); 
    }
});

canvasViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    adjustZoom(delta);
}, { passive: false });

zoomInBtn.addEventListener('click', () => adjustZoom(0.1));
zoomOutBtn.addEventListener('click', () => adjustZoom(-0.1));
zoomResetBtn.addEventListener('click', resetCanvasView);
toggleSidebarBtn.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));

function getRelationColor(type) {
    switch (type) {
        case "Батько": case "Мати": case "Дідусь": case "Бабуся": return "#10b981"; 
        case "Чоловік": case "Дружина": return "#eab308"; 
        case "Син": case "Дочка": case "Племінник": case "Племінниця": return "#3b82f6"; 
        case "Брат": case "Сестра": return "#a855f7"; 
        default: return "#06b6d4"; 
    }
}

function drawConnections() {
    svgConnections.innerHTML = "";
    const processedPairs = new Set();

    people.forEach(person => {
        const startX = person.x + (CARD_WIDTH / 2);
        const startY = person.y + (CARD_HEIGHT / 2);

        person.relations.forEach(rel => {
            const target = people.find(p => p.id === rel.personId);
            if (!target) return;

            const endX = target.x + (CARD_WIDTH / 2);
            const endY = target.y + (CARD_HEIGHT / 2);

            const pairKey = [person.id, target.id].sort().join('-') + '-' + rel.type;
            if (processedPairs.has(pairKey)) return;
            processedPairs.add(pairKey);

            const strokeColor = getRelationColor(rel.type);
            const isSpouse = (rel.type === "Чоловік" || rel.type === "Дружина");

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", startX);
            line.setAttribute("y1", startY);
            line.setAttribute("x2", endX);
            line.setAttribute("y2", endY);
            line.setAttribute("stroke", strokeColor);
            line.setAttribute("stroke-width", "2.5");
            if (isSpouse) line.setAttribute("stroke-dasharray", "5 5");
            line.setAttribute("filter", "url(#glow)");
            line.setAttribute("opacity", "0.75");
            svgConnections.appendChild(line);

            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", midX - 35);
            rect.setAttribute("y", midY - 9);
            rect.setAttribute("width", "70");
            rect.setAttribute("height", "18");
            rect.setAttribute("rx", "5");
            rect.setAttribute("fill", currentTheme === 'light' ? '#fafafa' : '#090d16');
            rect.setAttribute("stroke", strokeColor);
            rect.setAttribute("stroke-width", "1");
            rect.setAttribute("opacity", "0.95");

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", midX);
            text.setAttribute("y", midY + 4);
            text.setAttribute("fill", currentTheme === 'light' ? '#18181b' : '#f8fafc');
            text.setAttribute("font-size", "9px");
            text.setAttribute("font-family", "JetBrains Mono, monospace");
            text.setAttribute("text-anchor", "middle");
            text.textContent = rel.type;

            group.appendChild(rect);
            group.appendChild(text);
            svgConnections.appendChild(group);
        });
    });
}

function renderSidebar() {
    peopleListContainer.innerHTML = "";
    const filtered = people.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filtered.length === 0) {
        peopleListContainer.innerHTML = `<p class="text-[10px] font-mono text-ide-textMuted text-center py-8">Ви ще не створили список</p>`;
        return;
    }

    filtered.forEach((p, index) => {
        const isSelected = p.id === activePersonId;
        const borderClass = isSelected ? 'border-ide-accent bg-ide-panelLight/60' : 'border-transparent';
        const div = document.createElement('div');
        div.className = `sidebar-person-item p-3 cursor-pointer rounded-xl border ${borderClass} bg-ide-panel/40 hover:bg-ide-panelLight/30 transition-all flex items-center justify-between group`;
        div.setAttribute('data-id', p.id);

        const genderIcon = p.gender === 'male' ? '👨' : '👩';
        div.innerHTML = `
            <div class="min-w-0 pr-2 flex-grow flex items-start gap-2">
                <span class="font-mono text-[10px] text-ide-accent font-bold mt-0.5">${index + 1}.</span>
                <div class="min-w-0 flex-grow">
                    <p class="font-mono text-xs text-ide-textBright flex items-start whitespace-normal break-words leading-tight">
                        <span class="mr-1 shrink-0">${genderIcon}</span>
                        <span>${p.name}</span>
                    </p>
                    <p class="text-[9px] font-mono text-ide-textMuted mt-1">${p.birthDate || '????'}${p.deathDate ? ` — ${p.deathDate}` : ''}</p>
                </div>
            </div>
            <div class="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
                <button class="focus-btn-sidebar p-1 hover:bg-ide-panel rounded text-ide-accent" data-id="${p.id}" title="Знайти">🔍</button>
                <button class="edit-btn-sidebar p-1 hover:bg-ide-panel rounded text-ide-textMuted hover:text-ide-textBright" data-id="${p.id}" title="Редагувати">📝</button>
                <button class="delete-btn-sidebar p-1 hover:bg-red-950/40 rounded text-ide-textMuted hover:text-red-400" data-id="${p.id}" title="Видалити">🗑️</button>
            </div>
        `;
        div.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            setActivePerson(p.id);
            centerOnNode(p.id);
        });
        peopleListContainer.appendChild(div);
    });

    document.querySelectorAll('.focus-btn-sidebar').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); setActivePerson(btn.getAttribute('data-id')); centerOnNode(btn.getAttribute('data-id')); }));
    document.querySelectorAll('.edit-btn-sidebar').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); openEditor(btn.getAttribute('data-id')); }));
    document.querySelectorAll('.delete-btn-sidebar').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deletePerson(btn.getAttribute('data-id')); }));
}

function centerOnNode(nodeId) {
    const person = people.find(p => p.id === nodeId);
    if (person) {
        const viewRect = canvasViewport.getBoundingClientRect();
        panX = (viewRect.width / 2) - (person.x + (CARD_WIDTH / 2)) * zoomScale;
        panY = (viewRect.height / 2) - (person.y + (CARD_HEIGHT / 2)) * zoomScale;
        applyCanvasTransform();
    }
}

function renderCanvasNodes() {
    canvasContent.innerHTML = "";
    if (people.length === 0) {
        canvasContent.innerHTML = `
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-md p-10 border border-ide-panelLight/30 bg-ide-panel rounded-3xl shadow-2xl">
                <span class="text-5xl animate-bounce duration-1000 block mb-4">🌳</span>
                <h3 class="font-mono text-sm font-bold text-ide-accent mb-2">Робоча зона пуста</h3>
                <p class="text-xs text-ide-textMuted leading-relaxed font-mono mb-6">Ваше дерево порожнє. Створіть першу картку.</p>
                <button id="canvas-empty-btn" class="w-full bg-ide-accent text-ide-bg hover:bg-opacity-95 font-mono text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md">
                    <span>[+] Створити вузол</span>
                </button>
            </div>
        `;
        document.getElementById('canvas-empty-btn')?.addEventListener('click', () => openEditor());
        svgConnections.innerHTML = "";
        return;
    }

    people.forEach(person => {
        const isSelected = person.id === activePersonId;
        const card = document.createElement('div');
        card.className = `canvas-card-node absolute w-56 h-[150px] bg-ide-panel border border-ide-panelLight/40 rounded-xl shadow-lg flex flex-col cursor-grab select-none transition-shadow overflow-hidden ${isSelected ? 'neon-active' : ''}`;
        card.style.transform = `translate(${person.x}px, ${person.y}px)`;
        card.setAttribute('data-id', person.id);

        const genderBorder = person.gender === 'male' ? 'border-t-ide-male' : 'border-t-ide-female';
        const genderIcon = person.gender === 'male' ? '👨' : '👩';
        const ageText = calculateAgeOrLifespan(person.birthDate, person.deathDate);

        card.innerHTML = `
            <div class="h-1 w-full rounded-t-xl border-t-2 ${genderBorder}"></div>
            <div class="card-body-node p-3 flex-grow flex flex-col items-center text-center justify-between overflow-hidden">
                <div class="flex items-center gap-1.5 justify-center w-full"><span class="text-lg leading-none">${genderIcon}</span></div>
                <h4 class="font-mono font-bold text-xs text-ide-textBright hover:text-ide-accent cursor-pointer line-clamp-1 leading-snug w-full px-1">${person.name}</h4>
                <div class="flex flex-col items-center gap-0.5">
                    <p class="text-[9px] text-ide-textMuted font-mono">${person.birthDate || '????'}${person.deathDate ? ` — ${person.deathDate}` : ' (живе)'}</p>
                    ${ageText ? `<span class="text-[8px] font-mono text-ide-accent font-semibold bg-ide-canvas/80 px-2 py-0.5 rounded-full border border-ide-accent/30">⏳ ${ageText}</span>` : ''}
                </div>
                ${person.occupation ? `<p class="text-[8px] font-mono text-ide-textMuted bg-ide-canvas/60 px-1.5 py-0.5 rounded-md max-w-full truncate">💼 ${person.occupation}</p>` : ''}
            </div>
            <div class="bg-ide-canvas/50 border-t border-ide-panelLight/20 px-3 py-1.5 flex justify-end items-center shrink-0">
                <button class="quick-del-btn text-red-400 hover:text-red-500 font-mono text-[10px] font-bold" data-id="${person.id}">Видалити (X)</button>
            </div>
        `;

        card.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            e.stopPropagation();
            draggingCard = card;
            card.classList.add('z-50');
            setActivePerson(person.id);
            const bounds = card.getBoundingClientRect();
            dragOffset.x = (e.clientX - bounds.left) / zoomScale;
            dragOffset.y = (e.clientY - bounds.top) / zoomScale;
        });

        card.addEventListener('dblclick', (e) => { e.stopPropagation(); openEditor(person.id); });
        canvasContent.appendChild(card);
    });

    document.querySelectorAll('.quick-del-btn').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); deletePerson(b.getAttribute('data-id')); }));
    drawConnections(); 
}

function deletePerson(id) {
    const p = people.find(x => x.id === id);
    customConfirm("Видалення вузла", `Ви дійсно хочете видалити ${p.name}? Всі зв'язки будуть анульовані.`, () => {
        people = people.filter(item => item.id !== id).map(item => {
            let updated = { ...item };
            if (updated.relations) updated.relations = updated.relations.filter(r => r.personId !== id);
            return updated;
        });
        if (activePersonId === id) activePersonId = null;
        triggerExportActivation(); 
        saveState();
        renderSidebar();
        renderCanvasNodes();
    }, '🗑️');
}

function openEditor(personId = null) {
    populateRelationTargetsDropdown(personId);
    if (personId) {
        const person = people.find(p => p.id === personId);
        document.getElementById('modal-title-text').innerText = "Редагування картки";
        document.getElementById('edit-person-id').value = person.id;
        document.getElementById('edit-person-name').value = person.name || '';
        document.getElementById('edit-person-occupation').value = person.occupation || '';
        document.getElementById('edit-person-gender').value = person.gender || 'male';
        editPersonBirth.value = person.birthDate || '';
        editPersonDeath.value = person.deathDate || '';
        document.getElementById('edit-person-notes').value = person.notes || '';
        tempRelations = person.relations ? JSON.parse(JSON.stringify(person.relations)) : [];
        document.getElementById('relations-manager-container').classList.remove('hidden');
    } else {
        document.getElementById('modal-title-text').innerText = "Створення нової особи";
        document.getElementById('edit-person-id').value = Date.now().toString();
        document.getElementById('edit-person-name').value = '';
        document.getElementById('edit-person-occupation').value = '';
        document.getElementById('edit-person-gender').value = 'male';
        editPersonBirth.value = '';
        editPersonDeath.value = '';
        document.getElementById('edit-person-notes').value = '';
        tempRelations = [];
        document.getElementById('relations-manager-container').classList.add('hidden');
    }
    updateCalculatedYears();
    renderTempRelationsList();
    editorModal.classList.remove('hidden');
    editorModal.classList.add('flex');
    setTimeout(() => editorModalContainer.classList.replace('scale-95', 'scale-100'), 10);
}

function populateRelationTargetsDropdown(excludeId = null) {
    relationTargetSelect.innerHTML = '<option value="" class="bg-ide-panel">-- Оберіть особу --</option>';
    people.forEach(p => {
        if (p.id === excludeId) return;
        relationTargetSelect.innerHTML += `<option value="${p.id}" class="bg-ide-panel">${p.name}</option>`;
    });
}

function renderTempRelationsList() {
    modalActiveRelationsList.innerHTML = "";
    if (tempRelations.length === 0) {
        modalActiveRelationsList.innerHTML = `<p class="text-[9px] font-mono text-ide-textMuted italic">// Зв'язків не встановлено</p>`;
        return;
    }
    tempRelations.forEach((r, idx) => {
        const targetObj = people.find(p => p.id === r.personId);
        const targetName = targetObj ? targetObj.name : "Невідома особа";
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-ide-canvas/50 px-2.5 py-1 rounded border border-ide-borderLight/30 text-[10px] font-mono";
        div.innerHTML = `<span class="truncate text-ide-textBright">${targetName} <span class="text-ide-accent">(${r.type})</span></span><button type="button" class="btn-remove-temp-relation text-red-400 hover:text-red-300 ml-2 font-bold" data-index="${idx}">&times;</button>`;
        modalActiveRelationsList.appendChild(div);
    });
    document.querySelectorAll('.btn-remove-temp-relation').forEach(btn => {
        btn.addEventListener('click', () => {
            tempRelations.splice(parseInt(btn.getAttribute('data-index')), 1);
            renderTempRelationsList();
        });
    });
}

btnAddRelationItem.addEventListener('click', () => {
    const targetId = relationTargetSelect.value;
    const relType = relationTypeSelect.value;
    if (!targetId) { customAlert("Помилка зв'язку", "Оберіть особу зі списку.", '⚠️'); return; }
    if (tempRelations.some(r => r.personId === targetId)) { customAlert("Дублікат", "Зв'язок уже існує.", '⚠️'); return; }
    tempRelations.push({ personId: targetId, type: relType });
    renderTempRelationsList();
});

function closeModal() {
    editorModalContainer.classList.replace('scale-100', 'scale-95');
    setTimeout(() => { editorModal.classList.add('hidden'); editorModal.classList.remove('flex'); }, 150);
}

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

personForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetId = document.getElementById('edit-person-id').value;
    const existingIdx = people.findIndex(p => p.id === targetId);

    let calculatedX = CANVAS_CENTER_X - (CARD_WIDTH / 2); 
    let calculatedY = CANVAS_CENTER_Y - (CARD_HEIGHT / 2);
    if (existingIdx > -1) {
        calculatedX = people[existingIdx].x;
        calculatedY = people[existingIdx].y;
    } else if (people.length > 0) {
        calculatedX = people[0].x + 250;
        calculatedY = people[0].y + (people.length % 2 === 0 ? 100 : -100);
    }

    const savedPerson = {
        id: targetId,
        name: document.getElementById('edit-person-name').value,
        occupation: document.getElementById('edit-person-occupation').value,
        gender: document.getElementById('edit-person-gender').value,
        notes: document.getElementById('edit-person-notes').value,
        birthDate: editPersonBirth.value,
        deathDate: editPersonDeath.value,
        relations: tempRelations,
        x: calculatedX,
        y: calculatedY
    };

    if (existingIdx > -1) people[existingIdx] = savedPerson;
    else people.push(savedPerson);

    triggerExportActivation(); 
    saveState();
    renderSidebar();
    renderCanvasNodes();
    closeModal();
    setActivePerson(savedPerson.id);
    centerOnNode(savedPerson.id);
});

function executeImportProcess(rawText) {
    try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
            people = parsed.map((p, idx) => {
                if (typeof p.x === 'undefined' || typeof p.y === 'undefined') {
                    p.x = CANVAS_CENTER_X + (idx % 3 === 0 ? -300 : idx % 3 === 1 ? 0 : 300);
                    p.y = CANVAS_CENTER_Y + (Math.floor(idx / 3) * 200);
                }
                return p;
            });
            triggerExportActivation(); 
            onboardingOverlay.classList.add('hidden'); 
            saveState();
            renderSidebar();
            renderCanvasNodes();
            resetCanvasView();
            customAlert("Імпорт завершено", "Проект успішно імпортовано!", '🎉');
        } else {
            customAlert("Помилка", "Файл не містить сумісних даних.");
        }
    } catch (err) {
        customAlert("Помилка", "Пошкоджений JSON формат.");
    }
}

onboardImportFile.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => executeImportProcess(ev.target.result); r.readAsText(f); } });
importJsonInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => executeImportProcess(ev.target.result); r.readAsText(f); } });

onboardStartBtn.addEventListener('click', () => {
    people = [];
    onboardingOverlay.classList.add('hidden');
    saveState();
    renderSidebar();
    renderCanvasNodes();
    resetCanvasView();
});

addPersonBtn.addEventListener('click', () => openEditor());

loadDemoBtn.addEventListener('click', () => {
    customConfirm("Завантажити демо", "Завантажити дерево Шевченка? Поточні дані будуть замінені.", () => {
        people = JSON.parse(JSON.stringify(demoDataset));
        triggerExportActivation();
        saveState();
        renderSidebar();
        renderCanvasNodes();
        resetCanvasView();
    }, '🌿');
});

clearAllBtn.addEventListener('click', () => {
    customConfirm("Очистити", "Видалити всю хроніку?", () => {
        people = [];
        isExportEnabled = false; 
        activePersonId = null;
        saveState();
        renderSidebar();
        renderCanvasNodes();
        onboardingOverlay.classList.remove('hidden'); 
    }, '⚠️');
});

searchInput.addEventListener('input', (e) => { searchQuery = e.target.value; renderSidebar(); });

exportJsonBtn.addEventListener('click', () => {
    if (!isExportEnabled || people.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(people, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `family-tree-${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

exportPngBtn.addEventListener('click', () => {
    if (!isExportEnabled || people.length === 0) return;

    setActivePerson(null);
    customAlert("Генерація PNG", "Формування якісного знімка через SVG-контекст...", '⏳');

    setTimeout(() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        people.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x + CARD_WIDTH > maxX) maxX = p.x + CARD_WIDTH;
            if (p.y + CARD_HEIGHT > maxY) maxY = p.y + CARD_HEIGHT;
        });

        const padding = 100;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        const width = (maxX + padding) - minX;
        const height = (maxY + padding) - minY;

        const isLight = currentTheme === 'light';
        const bgColor = isLight ? '#fafafa' : '#0f172a';
        const mutedColor = isLight ? '#71717a' : '#94a3b8';
        const panelColor = isLight ? '#ffffff' : '#1e293b';
        const borderColor = isLight ? '#e4e4e7' : '#334155';
        const textColor = isLight ? '#18181b' : '#f8fafc';

        const cardsSvgString = people.map(p => {
            const genderBorder = p.gender === 'male' ? '#3b82f6' : '#ec4899';
            const genderIcon = p.gender === 'male' ? '👨' : '👩';
            const ageText = calculateAgeOrLifespan(p.birthDate, p.deathDate);
            
            return `
                <g transform="translate(${p.x}, ${p.y})">
                    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="12" fill="${panelColor}" stroke="${borderColor}" stroke-width="1" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
                    <path d="M 12 0 L ${CARD_WIDTH - 12} 0 Q ${CARD_WIDTH} 0 ${CARD_WIDTH} 12 L ${CARD_WIDTH} 4 L 0 4 L 0 12 Q 0 0 12 0 Z" fill="${genderBorder}" />
                    <text x="${CARD_WIDTH / 2}" y="32" font-size="16" text-anchor="middle">${genderIcon}</text>
                    <text x="${CARD_WIDTH / 2}" y="56" fill="${textColor}" font-weight="700" font-size="11px" font-family="JetBrains Mono, monospace" text-anchor="middle" textLength="${Math.min(p.name.length * 6.5, CARD_WIDTH - 24)}" lengthAdjust="spacingAndGlyphs">${escapeXml(p.name)}</text>
                    <text x="${CARD_WIDTH / 2}" y="74" fill="${mutedColor}" font-size="9px" font-family="JetBrains Mono, monospace" text-anchor="middle">${p.birthDate || '????'}${p.deathDate ? ` — ${p.deathDate}` : ' (живе)'}</text>
                    ${ageText ? `
                        <g transform="translate(${CARD_WIDTH / 2}, 92)">
                            <rect x="-45" y="-9" width="90" height="16" rx="8" fill="${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)'}" stroke="${isLight ? '#d4d4d8' : '#334155'}" stroke-width="0.5" />
                            <text x="0" y="2" fill="#10b981" font-size="8px" font-family="JetBrains Mono, monospace" font-weight="600" text-anchor="middle">⏳ ${ageText}</text>
                        </g>
                    ` : ''}
                    ${p.occupation ? `
                        <text x="${CARD_WIDTH / 2}" y="124" fill="${mutedColor}" font-size="8px" font-family="JetBrains Mono, monospace" text-anchor="middle">💼 ${escapeXml(p.occupation)}</text>
                    ` : ''}
                </g>
            `;
        }).join('');

        let linesSvgString = "";
        const processedPairs = new Set();
        people.forEach(person => {
            const startX = person.x + (CARD_WIDTH / 2);
            const startY = person.y + (CARD_HEIGHT / 2);

            person.relations.forEach(rel => {
                const target = people.find(p => p.id === rel.personId);
                if (!target) return;

                const endX = target.x + (CARD_WIDTH / 2);
                const endY = target.y + (CARD_HEIGHT / 2);

                const pairKey = [person.id, target.id].sort().join('-') + '-' + rel.type;
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                const strokeColor = getRelationColor(rel.type);
                const isSpouse = (rel.type === "Чоловік" || rel.type === "Дружина");

                linesSvgString += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${strokeColor}" stroke-width="2.5" ${isSpouse ? 'stroke-dasharray="5 5"' : ''} opacity="0.75" />`;

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                linesSvgString += `
                    <g>
                        <rect x="${midX - 35}" y="${midY - 9}" width="70" height="18" rx="5" fill="${isLight ? '#fafafa' : '#090d16'}" stroke="${strokeColor}" stroke-width="1" opacity="0.95" />
                        <text x="${midX}" y="${midY + 4}" fill="${isLight ? '#18181b' : '#f8fafc'}" font-size="9px" font-family="JetBrains Mono, monospace" text-anchor="middle">${rel.type}</text>
                    </g>
                `;
            });
        });

        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
                <rect width="${width}" height="${height}" x="${minX}" y="${minY}" fill="${bgColor}" />
                <g>${linesSvgString}</g>
                <g>${cardsSvgString}</g>
            </svg>
        `;

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(blob);

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;   
            canvas.height = height * 2;
            const context = canvas.getContext('2d');
            context.scale(2, 2);
            context.drawImage(image, 0, 0);

            dialogModal.classList.add('hidden');
            dialogModal.classList.remove('flex');

            const pngURI = canvas.toDataURL('image/png');
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = pngURI;
            downloadAnchor.download = `family-tree-${new Date().toISOString().slice(0,10)}.png`;
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            URL.revokeObjectURL(blobURL);
        };
        image.src = blobURL;
    }, 400);
});

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

loadState();
renderSidebar();
renderCanvasNodes();
resetCanvasView();
applyTheme(currentTheme);