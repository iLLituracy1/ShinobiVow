// ui.js - UI management for Shinobi's Vow

// *** NOTE: combat.js is not imported here to avoid circular dependencies ***
// game.js is the central hub.

import { setDirective, handleHospitalTreatment } from './game.js';
import { addItemToInventory } from './inventory.js';
import { ITEMS, SHOP_ITEMS } from './constants.js';

/**
 * Helper function to format remaining time in a user-friendly way.
 * @param {number} minutes - The total minutes remaining.
 * @returns {string} - A formatted string (e.g., "Permanent", "7d", "12h").
 */
function formatDuration(minutes) {
    if (minutes === -1) return "Permanent";
    if (minutes < 60) return `${Math.ceil(minutes)}m`;
    if (minutes < 1440) return `${Math.ceil(minutes / 60)}h`;
    return `${Math.ceil(minutes / 1440)}d`;
}

export function initializeUI() {
    const ui = gameState.ui;
    // Sidebar Main Info
    ui.charName = document.getElementById('char-name');
    ui.charAge = document.getElementById('char-age');
    ui.charVillage = document.getElementById('char-village');
    ui.charRank = document.getElementById('char-rank');
    ui.inventoryPanel = document.getElementById('inventory-panel');
    
    // Header Main Info
    ui.headerCharRank = document.getElementById('header-char-rank');
    ui.headerCharStatus = document.getElementById('header-char-status');
    ui.headerCharActivity = document.getElementById('header-char-activity');

    // Stats, Vitals, Details
    ui.statStrength = document.getElementById('stat-strength');
    ui.statAgility = document.getElementById('stat-agility');
    ui.statStamina = document.getElementById('stat-stamina');
    ui.statChakraPool = document.getElementById('stat-chakra-pool');
    ui.statIntellect = document.getElementById('stat-intellect');
    ui.statPerception = document.getElementById('stat-perception');
    ui.statWillpower = document.getElementById('stat-willpower');
    ui.charHealth = document.getElementById('char-health');
    ui.charMaxHealth = document.getElementById('char-max-health');
    ui.charChakra = document.getElementById('char-chakra');
    ui.charMaxChakra = document.getElementById('char-max-chakra');
    ui.charStamina = document.getElementById('char-stamina'); 
    ui.charMaxStamina = document.getElementById('char-max-stamina');
    ui.charMorale = document.getElementById('char-morale');
    ui.charConditions = document.getElementById('char-conditions');
    ui.charFamilyBackground = document.getElementById('char-family-background');
    ui.charAffinity = document.getElementById('char-affinity');
    ui.charTraits = document.getElementById('char-traits');
    ui.aptitudesList = document.getElementById('aptitudes-list');
    ui.charRyo = document.getElementById('char-ryo'); 

    // Team Roster 
    ui.teamRosterSection = document.getElementById('team-roster-section');
    ui.teamSenseiName = document.getElementById('team-sensei-name');
    ui.teamMate1Name = document.getElementById('team-mate1-name');
    ui.teamMate2Name = document.getElementById('team-mate2-name');

    // Inventory
    ui.inventoryPanel = document.getElementById('inventory-panel');
    
    // Meta, Logs, Time Controls
    ui.legendPoints = document.getElementById('legend-points');
    ui.narrativeLog = document.getElementById('narrative-log');
    ui.actionButtons = document.getElementById('action-buttons');
    ui.currentGameDate = document.getElementById('current-game-date');
    ui.currentGameTime = document.getElementById('current-game-time');
    ui.currentTimeScale = document.getElementById('current-time-scale');
    ui.pauseResumeButton = document.getElementById('pauseResumeButton');
    ui.timeScaleButtons = Array.from(document.querySelectorAll('.time-buttons .time-control-button[data-speed]'));

    // Tab Logic
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('disabled')) return;
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

export function updateUI() {
    const char = gameState.character;
    const stats = char.currentStats;
    const ui = gameState.ui;
    const currentRankText = char.currentRank || "Child";
    const currentStatusText = char.statusEffects.length > 0 ? char.statusEffects.join(", ") : "Normal";

    // Update Header and Sidebar main info
    if (ui.charName) ui.charName.textContent = char.name;
    if (ui.charAge) ui.charAge.textContent = char.age;
    if (ui.charVillage) ui.charVillage.textContent = char.village;
    if (ui.charRank) ui.charRank.textContent = currentRankText; 
    if (ui.headerCharRank) ui.headerCharRank.textContent = currentRankText;
    if (ui.headerCharStatus) ui.headerCharStatus.textContent = currentStatusText;
    if (ui.headerCharActivity) ui.headerCharActivity.textContent = char.currentActivity;

    // Update Stats, Vitals, Details
    if (ui.statStrength) ui.statStrength.textContent = stats.strength.toFixed(1);
    if (ui.statAgility) ui.statAgility.textContent = stats.agility.toFixed(1);
    if (ui.statStamina) ui.statStamina.textContent = stats.stamina.toFixed(1);
    if (ui.statChakraPool) ui.statChakraPool.textContent = stats.chakraPool.toFixed(1); 
    if (ui.statIntellect) ui.statIntellect.textContent = stats.intellect.toFixed(1);
    if (ui.statPerception) ui.statPerception.textContent = stats.perception.toFixed(1);
    if (ui.statWillpower) ui.statWillpower.textContent = stats.willpower.toFixed(1);
    if (ui.charHealth) ui.charHealth.textContent = Math.round(char.health);
    if (ui.charMaxHealth) ui.charMaxHealth.textContent = Math.round(char.maxHealth);
    if (ui.charChakra) ui.charChakra.textContent = Math.round(char.chakra);
    if (ui.charMaxChakra) ui.charMaxChakra.textContent = Math.round(char.maxChakra);
    if (ui.charStamina) ui.charStamina.textContent = Math.round(char.stamina); 
    if (ui.charMaxStamina) ui.charMaxStamina.textContent = Math.round(char.maxStamina);
    if (ui.charMorale) ui.charMorale.textContent = Math.round(char.morale);

        // *** LOGIC BLOCK for Conditions ***
    if (ui.charConditions) {
        ui.charConditions.innerHTML = '';
        const allConditions = [...char.injuries, ...char.statusEffects];

        if (allConditions.length === 0) {
            ui.charConditions.innerHTML = '<p>Normal</p>';
        } else {
            allConditions.forEach(condition => {
                const p = document.createElement('p');
                const severityClass = `severity-${condition.severity?.toLowerCase() || 'status'}`;
                p.className = `condition-entry ${severityClass}`;
                p.title = condition.description;
                
                const durationText = formatDuration(condition.durationInMinutes);
                
                p.innerHTML = `<strong>${condition.name}</strong> <span>${durationText}</span>`;
                ui.charConditions.appendChild(p);
            });
        }
    }


    if (ui.charFamilyBackground) ui.charFamilyBackground.textContent = char.familyBackground;
    if (ui.charTraits) ui.charTraits.textContent = char.traits.length > 0 ? char.traits.map(t => t.name).join(", ") : "None";
    if (ui.charRyo) ui.charRyo.textContent = char.ryo;

    if (ui.charAffinity) {
        if (char.affinityDiscovered) {
            let affinityText = char.chakraAffinity.type;
            if (char.chakraAffinity.elements.length > 0) affinityText += `: ${char.chakraAffinity.elements.join(" & ")}`;
            if (char.chakraAffinity.strength) affinityText += ` (${char.chakraAffinity.strength})`;
            ui.charAffinity.textContent = affinityText;
        } else {
            ui.charAffinity.textContent = "Undiscovered";
        }
    }
    
    // Update Team Roster
    if (ui.teamRosterSection) {
        if (char.team) {
            ui.teamRosterSection.style.display = 'block';
            ui.teamSenseiName.textContent = `${char.team.sensei.name} (${char.team.sensei.personality})`;
            ui.teamMate1Name.textContent = `${char.team.teammates[0].name} (${char.team.teammates[0].personality})`;
            ui.teamMate2Name.textContent = `${char.team.teammates[1].name} (${char.team.teammates[1].personality})`;
        } else {
            ui.teamRosterSection.style.display = 'none';
        }
    }

        // --- Incapacitation UI ---
    if (char.currentActivity === 'Incapacitated' || char.currentActivity === 'Hospitalized') {
        if(ui.actionButtons.innerHTML !== '') { // Prevents clearing it on every single update
            clearActionButtons();
            addToNarrative("You are too injured to take any actions.", "system-message error");
        }
    }

    if (ui.aptitudesList) {
        ui.aptitudesList.innerHTML = '';
        if (Object.keys(char.aptitudes).length > 0) {
            for (const skillName in char.aptitudes) {
                const p = document.createElement('p');
                p.innerHTML = `<strong>${skillName}:</strong> <span>+${(char.aptitudes[skillName] * 100).toFixed(0)}% XP Gain</span>`;
                ui.aptitudesList.appendChild(p);
            }
        } else {
            ui.aptitudesList.innerHTML = '<p>None</p>';
        }
    }
    
    // Update Meta & Time
    if (ui.legendPoints) ui.legendPoints.textContent = gameState.legendPoints;
    const gameDate = `${String(gameState.time.dayOfMonth).padStart(2, '0')}/${String(gameState.time.monthOfYear).padStart(2, '0')}/${gameState.time.year}`;
    const gameTime = `${String(gameState.time.currentHour).padStart(2, '0')}:${String(gameState.time.currentMinute).padStart(2, '0')}`;
    if (ui.currentGameDate) ui.currentGameDate.textContent = gameDate;
    if (ui.currentGameTime) ui.currentGameTime.textContent = gameTime;

    if (gameState.character.skills) {
        updateSkillsUI();
        updateJutsuUI();
        updateInventoryUI();
    }
    
    const skillsTab = document.querySelector('.tab-button[data-tab="skills-panel"]');
    if (skillsTab) skillsTab.classList.toggle('disabled', !char.skills);
    const jutsuTab = document.querySelector('.tab-button[data-tab="jutsu-panel"]');
    if (jutsuTab) jutsuTab.classList.toggle('disabled', !char.skills);
}

export function updateTimeControlsUI() {
    const ui = gameState.ui;
    if (ui.pauseResumeButton) ui.pauseResumeButton.textContent = gameState.time.isPaused ? "Resume" : "Pause";
    if (ui.currentTimeScale) ui.currentTimeScale.textContent = `${gameState.time.gameTimeScale}x`;
    ui.timeScaleButtons.forEach(button => {
        button.classList.toggle('active', parseInt(button.dataset.speed) === gameState.time.gameTimeScale && !gameState.time.isPaused);
    });
}

// --- NARRATIVE & LOGGING ---

/**
 * Adds a message to the main narrative queue for the slow-paced game loop.
 */
export function addToNarrative(message, cssClass = "game-message", minDelay = 1000) {
    const time = gameState.time;
    const gameTime = { year: time.year, month: time.monthOfYear, day: time.dayOfMonth, hour: time.currentHour, minute: time.currentMinute };
    gameState.narrativeUpdateQueue.push({ message, cssClass, timestamp: Date.now(), minDelay, gameTime });
}

/**
 * Adds a message DIRECTLY to the log, bypassing the queue for real-time combat feedback.
 */
export function addToCombatLog(message, cssClass = "game-message") {
    const scroll = gameState.ui.narrativeLog;
    if (!scroll) return;

    const p = document.createElement('p');
    p.className = cssClass;
    // Combat log doesn't need a date stamp, it's immediate
    p.innerHTML = `<span class="timestamp">[COMBAT]</span> ${message}`;
    scroll.appendChild(p);
    setTimeout(() => { p.style.opacity = '1'; }, 10); // Quick fade-in
    scroll.scrollTop = scroll.scrollHeight;
}

export function processNarrativeQueue() {
    if (gameState.narrativeUpdateQueue.length === 0 || !gameState.ui.narrativeLog) return;

    const highSpeedThreshold = 25;
    const scroll = gameState.ui.narrativeLog;

    const renderMessage = (msg) => {
        const p = document.createElement('p');
        p.className = msg.cssClass;
        const dateStamp = `${String(msg.gameTime.day).padStart(2, '0')}/${String(msg.gameTime.month).padStart(2, '0')}/${msg.gameTime.year}`;
        const timeStamp = `${String(msg.gameTime.hour).padStart(2, '0')}:${String(msg.gameTime.minute).padStart(2, '0')}`;
        p.innerHTML = `<span class="timestamp">[${dateStamp} ${timeStamp}]</span> ${msg.message}`;
        scroll.appendChild(p);
        setTimeout(() => { p.style.opacity = '1'; }, 10);
    };

    if (gameState.time.gameTimeScale >= highSpeedThreshold) {
        while (gameState.narrativeUpdateQueue.length > 0) renderMessage(gameState.narrativeUpdateQueue.shift());
    } else {
        const now = Date.now();
        const nextMessage = gameState.narrativeUpdateQueue[0];
        if (now - gameState.lastNarrativeUpdateTime >= nextMessage.minDelay) {
            renderMessage(gameState.narrativeUpdateQueue.shift());
            gameState.lastNarrativeUpdateTime = now;
        }
    }
    scroll.scrollTop = scroll.scrollHeight;
}

export function clearActionButtons() {
    if (gameState.ui.actionButtons) gameState.ui.actionButtons.innerHTML = '';
}

export function addActionButton(text, onClickFunction, cssClass = "game-button") {
    if (gameState.ui.actionButtons) {
        const button = document.createElement('button');
        button.className = cssClass;
        button.textContent = text;
        button.addEventListener('click', onClickFunction);
        gameState.ui.actionButtons.appendChild(button);
    }
}

// --- CMI UI FUNCTIONS ---

/**
 * Displays the Critical Moment Intervention UI.
 * @param {Array<object>} choices - An array of choice objects { text, action }.
 * @param {number} durationSeconds - The time the player has to choose.
 * @param {Function} onResolve - The callback to execute with the chosen action.
 */
export function showCMI(choices, durationSeconds, onResolve) {
    clearActionButtons();
    const cmiContainer = gameState.ui.actionButtons;
    
    let timeLeft = durationSeconds;
    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'cmi-timer';
    timerDisplay.textContent = `ACTION REQUIRED: ${timeLeft.toFixed(1)}s`;
    cmiContainer.appendChild(timerDisplay);

    const interval = setInterval(() => {
        timeLeft -= 0.1;
        // Ensure timeLeft doesn't go below zero for display
        timerDisplay.textContent = `ACTION REQUIRED: ${Math.max(0, timeLeft).toFixed(1)}s`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            onResolve(null, 0); // Timeout, resolve with no action and 0 time left
        }
    }, 100);

    choices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'game-button cmi-button';
        button.textContent = choice.text;
        button.onclick = () => {
            clearInterval(interval);
            onResolve(choice.action, timeLeft); // *** MODIFICATION: Pass timeLeft here ***
        };
        cmiContainer.appendChild(button);
    });
}

// --- NEWLY MOVED UI MENU FUNCTIONS ---

export function setRestDirective() {
    // This is now a simple wrapper that calls the game logic function
    setDirective(null); // Passing null signifies resting
}

export function showVillageMenu() {
    clearActionButtons();
    addToNarrative("You are in the village. What will you do?", "system-message");
    
    addActionButton("Undertake Training", showDirectiveOptions);
    addActionButton("Visit Shinobi Tool Shop", showShopUI);
    // *** NEW: Add the Hospital button ***
    addActionButton("Visit Village Hospital", showHospitalUI);
    addActionButton("Rest & Recuperate", setRestDirective, "game-button secondary");
}

/**
 * Displays the Village Hospital UI for treating severe injuries.
 */
export function showHospitalUI() {
    clearActionButtons();
    const char = gameState.character;
    addToNarrative(`You enter the sterile, quiet Village Hospital. A medic approaches. You have ${char.ryo} Ryo.`, "system-message");

    const treatableInjuries = char.injuries.filter(inj => inj.severity === 'Severe');

    if (treatableInjuries.length === 0) {
        addToNarrative("The medic looks you over. 'Good news. You have no severe injuries that require our attention. Get some rest.'", "system-message");
    } else {
        addToNarrative("The medic examines your wounds. 'We can treat these, but it will take time and resources.'", "system-message");
        
        treatableInjuries.forEach(injury => {
            const remainingDays = Math.ceil(injury.durationInMinutes / 1440);
            const costRyo = remainingDays * 75; // 75 Ryo per remaining day of healing
            const timeInDays = Math.ceil(remainingDays / 2); // Treatment takes half the time

            const button = document.createElement('button');
            button.className = 'game-button';
            button.innerHTML = `Treat ${injury.name} <br><span style="font-size: 0.8em; font-weight: normal;">Cost: ${costRyo} Ryo, ${timeInDays} Days</span>`;
            button.title = injury.description;

            if (char.ryo < costRyo) {
                button.disabled = true;
                button.style.opacity = 0.5;
                button.style.cursor = 'not-allowed';
            }

            button.addEventListener('click', () => {
                handleHospitalTreatment(injury.id, costRyo, timeInDays);
            });
            gameState.ui.actionButtons.appendChild(button);
        });
    }

    addActionButton("<< Back to Village", showVillageMenu, "game-button secondary");
}

export function showShopUI() {
    clearActionButtons();
    const char = gameState.character;
    addToNarrative(`You enter the Shinobi Tool Shop. The smell of steel and oil hangs in the air. You have ${char.ryo} Ryo.`, "system-message");

    // *** Iterate over SHOP_ITEMS, not ITEMS ***
    for (const shopItemId in SHOP_ITEMS) {
        const shopItem = SHOP_ITEMS[shopItemId];
        const baseItemData = ITEMS[shopItem.grants.itemId]; // Get description from base item
        
        const button = document.createElement('button');
        button.className = 'game-button';
        button.innerHTML = `Buy ${shopItem.name} - ${shopItem.cost} Ryo`;
        if (baseItemData) {
            button.title = baseItemData.description;
        }

        if (char.ryo < shopItem.cost) {
            button.disabled = true;
            button.style.opacity = 0.5;
            button.style.cursor = 'not-allowed';
        }

        button.addEventListener('click', () => {
            if (char.ryo >= shopItem.cost) {
                char.ryo -= shopItem.cost;
                // *** Add the correct item and quantity from the grants object ***
                addItemToInventory(shopItem.grants.itemId, shopItem.grants.quantity);
                addToNarrative(`You purchased ${shopItem.name}.`, "skill-gain-message");
                showShopUI(); // Refresh the shop UI to update Ryo and button states
                updateUI();
            }
        });
        gameState.ui.actionButtons.appendChild(button);
    }
    
    addActionButton("<< Back to Village", showVillageMenu, "game-button secondary");
}

export function showDirectiveOptions() {
    clearActionButtons();
    const char = gameState.character;
    
    const directive = char.currentDirective;
    let currentDirectiveText = "Idle";
    if (directive) {
        if (directive.type === 'JUTSU') currentDirectiveText = `Learning: ${directive.jutsuName}`;
        else if (directive.type === 'SKILL') currentDirectiveText = `Practicing: ${directive.skillName}`;
    } else if (char.currentActivity === "Resting") {
        currentDirectiveText = "Resting";
    }
    
    const addDirectiveButton = (text, type, details) => {
        const button = document.createElement('button');
        button.className = 'game-button';
        button.textContent = text;
        if (directive && directive.type === type && (directive.skillName === details.skillName || directive.jutsuName === details.jutsuName)) {
            button.classList.add('active-focus');
        }
        button.addEventListener('click', () => setDirective({ type, ...details }));
        gameState.ui.actionButtons.appendChild(button);
    };

    // *** RESTRUCTURED LOGIC BLOCK ***
    // 1. Most specific case: Genin WITH a team
    if (char.currentRank === 'Genin' && char.team) {
        addToNarrative(`Set your downtime training directive. **(Current: ${currentDirectiveText})**`, "system-message");
        addActionButton("Rest & Recuperate", setRestDirective, "game-button secondary");
        
        // Team-based directives
        addDirectiveButton("Team Sparring", 'SKILL', { skillGroup: 'social', skillName: 'Team Sparring' });
        addDirectiveButton("Formation & Strategy Drills", 'SKILL', { skillGroup: 'social', skillName: 'Formation Drills' });
        addDirectiveButton("Build Bonds with Teammates", 'SKILL', { skillGroup: 'social', skillName: 'Build Bonds' });
        
        // Specialist directives
        if (char.affinityDiscovered) {
             addDirectiveButton("Elemental Training", 'SKILL', { skillGroup: 'chakra', skillName: 'Elemental Training' });
        }
        addDirectiveButton("Advanced Jutsu Research", 'SKILL', { skillGroup: 'academic', skillName: 'Advanced Jutsu Research' });
        
        // Links to other menus
        addActionButton("Individual Training", showIndividualTrainingOptions);
        addActionButton("Learn a Specific Jutsu", showJutsuLearningOptions);

    // 2. Broader case: Academy Student OR a solo Genin awaiting a team
    } else if (char.currentRank === 'Academy Student' || (char.currentRank === 'Genin' && !char.team)) {
        if (char.currentRank === 'Genin') {
            addToNarrative(`While awaiting your team assignment, you focus on personal training. **(Current: ${currentDirectiveText})**`, "system-message");
        } else {
            addToNarrative(`Set your training directive. **(Current: ${currentDirectiveText})**`, "system-message");
        }
        addActionButton("Rest & Recuperate", setRestDirective, "game-button secondary");
        
        // Individual-only directives
        addDirectiveButton("Practice Taijutsu", 'SKILL', { skillGroup: 'physical', skillName: 'Practice Taijutsu' });
        addDirectiveButton("Practice Shurikenjutsu", 'SKILL', { skillGroup: 'physical', skillName: 'Practice Shurikenjutsu' });
        addDirectiveButton("Practice Chakra Control", 'SKILL', { skillGroup: 'chakra', skillName: 'Practice Chakra Control' });
        addDirectiveButton("Academic Study", 'SKILL', { skillGroup: 'academic', skillName: 'Academic Study' });
        
        // Link to Jutsu learning
        addActionButton("Learn a Specific Jutsu", showJutsuLearningOptions);

    // 3. Fallback for all other states (e.g., childhood)
    } else {
        addToNarrative("There are no directives to set at this time. Await further orders.", "system-message");
    }

    addActionButton("<< Back to Village", showVillageMenu, "game-button secondary");
}

export function showIndividualTrainingOptions() {
    clearActionButtons();
    const char = gameState.character;
    const directive = char.currentDirective;
    addToNarrative("Select a fundamental skill to train individually.", "system-message");

    const addDirectiveButton = (text, type, details) => {
        const button = document.createElement('button');
        button.className = 'game-button';
        button.textContent = text;
        if (directive && directive.type === type && directive.skillName === details.skillName) {
            button.classList.add('active-focus');
        }
        button.addEventListener('click', () => setDirective({ type, ...details }));
        gameState.ui.actionButtons.appendChild(button);
    };

    
    addDirectiveButton("Practice Taijutsu", 'SKILL', { skillGroup: 'physical', skillName: 'Practice Taijutsu' });
    addDirectiveButton("Practice Shurikenjutsu", 'SKILL', { skillGroup: 'physical', skillName: 'Practice Shurikenjutsu' });
    addDirectiveButton("Practice Chakra Control", 'SKILL', { skillGroup: 'chakra', skillName: 'Practice Chakra Control' });

    addActionButton("<< Back to Training", showDirectiveOptions, "game-button secondary");
}

export function showJutsuLearningOptions() {
    clearActionButtons();
    const directive = gameState.character.currentDirective;
    addToNarrative("Select a Jutsu to focus on learning.", "system-message");

    for (const jutsuName in gameState.character.skills.jutsu) {
        const button = document.createElement('button');
        button.className = 'game-button';
        button.textContent = `Learn: ${jutsuName}`;
        if (directive && directive.type === 'JUTSU' && directive.jutsuName === jutsuName) {
            button.classList.add('active-focus');
        }
        button.addEventListener('click', () => setDirective({ type: 'JUTSU', jutsuName }));
        gameState.ui.actionButtons.appendChild(button);
    }

    addActionButton("<< Back to Training", showDirectiveOptions, "game-button secondary");
}


// --- EXISTING UI FUNCTIONS ---

function updateSkillsUI() {
    const skillsPanel = document.getElementById('skills-panel');
    if (!skillsPanel || !gameState.character.skills) return;
    
    const skillOrder = ['physical', 'subterfuge', 'social', 'chakra', 'academic'];
    let html = '';
    
    const createCategoryHtml = (title, skillGroup) => {
        let categoryHtml = `<div class="skill-category"><h3>${title}</h3>`;
        for (const skillName in skillGroup) {
            const skill = skillGroup[skillName];
            const progressPercent = skill.xpToNext > 0 ? (skill.xp / skill.xpToNext) * 100 : 0;
            categoryHtml += `
                <div class="skill-entry">
                    <div class="skill-entry-title">
                        <span class="skill-name">${skillName}</span>
                        <span class="skill-level">Level ${skill.level}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progressPercent}%" title="${Math.floor(skill.xp)} / ${skill.xpToNext} XP">
                            ${Math.floor(progressPercent)}%
                        </div>
                    </div>
                </div>`;
        }
        return categoryHtml + `</div>`;
    };

    skillOrder.forEach(key => {
        const title = key.charAt(0).toUpperCase() + key.slice(1);
        if (gameState.character.skills[key]) {
            html += createCategoryHtml(title, gameState.character.skills[key]);
        }
    });

    skillsPanel.innerHTML = html;
}

function updateJutsuUI() {
    const jutsuPanel = document.getElementById('jutsu-panel');
    if (!jutsuPanel || !gameState.character.skills) return;
    let html = `<div class="skill-category"><h3>Learned Jutsu</h3>`;
    const jutsuList = gameState.character.skills.jutsu;
    if (Object.keys(jutsuList).length === 0) {
        html += `<p>You have not learned any specific jutsu yet.</p>`;
    } else {
        for (const jutsuName in jutsuList) {
            const jutsu = jutsuList[jutsuName];
            const progressPercent = jutsu.xpToNext > 0 ? (jutsu.xp / jutsu.xpToNext) * 100 : 0;
            const tier = getMasteryTier(jutsu.level);
            html += `
                <div class="jutsu-entry">
                    <div class="jutsu-entry-title">
                        <span class="jutsu-name">${jutsuName}</span>
                        <span class="jutsu-level">Level ${jutsu.level} (${tier})</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progressPercent}%" title="${Math.floor(jutsu.xp)} / ${jutsu.xpToNext} XP">
                            ${Math.floor(progressPercent)}%
                        </div>
                    </div>
                </div>`;
        }
    }
    jutsuPanel.innerHTML = html + `</div>`;
}

export function updateInventoryUI() {
    const inventoryPanel = gameState.ui.inventoryPanel;
    const inventory = gameState.character.inventory;
    if (!inventoryPanel) return;

    inventoryPanel.innerHTML = ''; // Clear previous content

    if (!inventory || inventory.length === 0) {
        inventoryPanel.innerHTML = '<p style="padding: 20px;">Your inventory is empty.</p>';
        return;
    }

    let html = '<div style="padding: 20px;">';
    inventory.forEach(itemStack => {
        const itemData = ITEMS[itemStack.itemId];
        if (itemData) {
            html += `
                <div class="inventory-item">
                    <div class="inventory-item-header">
                        <span>${itemData.name}</span>
                        <span>x${itemStack.quantity}</span>
                    </div>
                    <p class="inventory-item-desc">${itemData.description}</p>
                </div>
            `;
        }
    });
    inventoryPanel.innerHTML = html + '</div>';
}

function getMasteryTier(level) {
    if (level === 0) return 'Unlearned';
    if (level <= 9) return 'Novice';
    if (level <= 24) return 'Practiced';
    if (level <= 49) return 'Adept';
    if (level <= 74) return 'Expert';
    if (level <= 99) return 'Master';
    return 'Pinnacle';
}