// ui.js - UI management for Shinobi's Vow

import { setDirective, handleHospitalTreatment } from './game.js';
import { addItemToInventory } from './inventory.js';
import { ITEMS, SHOP_ITEMS, ELEMENTS } from './constants.js';

/**
 * Converts simple Markdown-like syntax into HTML for rendering in the log.
 * @param {string} text - The raw text to format.
 * @returns {string} - The HTML-formatted text.
 */
function formatMessage(text) {
    if (!text) return '';
    // Convert **bold** to <strong>bold</strong>
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

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

/**
 * Calculates the five core stats for the dossier radar chart.
 * @param {object} char - The character object.
 * @returns {object} - An object containing the five calculated stats (TAI, NIN, GEN, TOOL, BLOOD).
 */
function calculateRadarStats(char) {
    if (!char.skills) {
        return { TAI: 0, NIN: 0, GEN: 0, TOOL: 0, BLOOD: 0 };
    }

    // TAI: Based on Taijutsu skill and physical stats
    const tai = char.skills.physical.Taijutsu.level + (char.currentStats.strength + char.currentStats.agility) / 4;

    // NIN: Average of elemental skills, form transformation, and theory
    const elementalSkills = ELEMENTS.map(el => char.skills.chakra[`Ninjutsu${el}`]?.level || 0);
    const nin = (elementalSkills.reduce((a, b) => a + b, 0) / (elementalSkills.length || 1)) +
                (char.skills.chakra.FormTransformation.level / 2) +
                (char.skills.academic.NinjutsuTheory.level / 3);

    // GEN: Based on Genjutsu skill and mental stats
    const gen = char.skills.chakra.Genjutsu.level + (char.currentStats.intellect + char.currentStats.willpower) / 4;

    // TOOL: Based on Shurikenjutsu and Perception
    const tool = char.skills.physical.Shurikenjutsu.level + char.currentStats.perception / 2;

    // BLOOD: Represents innate potential, vitality, and Kekkei Genkai
    let blood = (char.currentStats.stamina + char.currentStats.chakraPool) / 3;
    if (char.kekkeiGenkai) {
        blood += char.kekkeiGenkai.awakened ? 40 : 20;
    }

    return {
        TAI: Math.min(100, Math.round(tai)),
        NIN: Math.min(100, Math.round(nin)),
        GEN: Math.min(100, Math.round(gen)),
        TOOL: Math.min(100, Math.round(tool)),
        BLOOD: Math.min(100, Math.round(blood)),
    };
}

/**
 * Determines a character's speciality based on their highest radar stat.
 * @param {object} radarStats - The calculated stats from calculateRadarStats.
 * @returns {string} - The character's combat speciality.
 */
function determineSpecialty(radarStats) {
    if (!radarStats) return 'Undetermined';
    const stats = Object.entries(radarStats);
    if (stats.every(s => s[1] < 10)) return 'Novice';

    const [highestStat] = stats.sort((a, b) => b[1] - a[1])[0];

    switch (highestStat) {
        case 'TAI': return 'Taijutsu Specialist';
        case 'NIN': return 'Ninjutsu Specialist';
        case 'GEN': return 'Genjutsu Adept';
        case 'TOOL': return 'Weapons Master';
        case 'BLOOD': return 'Clan Prodigy';
        default: return 'Balanced';
    }
}

/**
 * Counts the number of completed missions of each rank.
 * @param {Array} missionHistory - The character's mission history array.
 * @returns {object} - An object with counts for each rank (e.g., { D: 2, C: 1 }).
 */
function calculateMissionCounts(missionHistory) {
    const counts = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    missionHistory.forEach(mission => {
        const match = mission.name.match(/\((S|A|B|C|D)-Rank\)/);
        if (match && mission.outcome === 'Success') {
            const rank = match[1];
            counts[rank]++;
        }
    });
    return counts;
}

export function initializeUI() {
    const ui = gameState.ui;
    // Sidebar Main Info
    ui.charName = document.getElementById('char-name');
    ui.charAge = document.getElementById('char-age');
    ui.charVillage = document.getElementById('char-village');
    ui.charRank = document.getElementById('char-rank');
    
    // Header Main Info
    ui.headerCharRank = document.getElementById('header-char-rank');
    ui.headerCharStatus = document.getElementById('header-char-status');
    ui.headerCharActivity = document.getElementById('header-char-activity');

    // Stats
    ui.statStrength = document.getElementById('stat-strength');
    ui.statAgility = document.getElementById('stat-agility');
    ui.statStamina = document.getElementById('stat-stamina');
    ui.statChakraPool = document.getElementById('stat-chakra-pool');
    ui.statIntellect = document.getElementById('stat-intellect');
    ui.statPerception = document.getElementById('stat-perception');
    ui.statWillpower = document.getElementById('stat-willpower');
    
    // Vitals and Bars
    ui.charHealth = document.getElementById('char-health');
    ui.charMaxHealth = document.getElementById('char-max-health');
    ui.healthBar = document.getElementById('health-bar');
    ui.charChakra = document.getElementById('char-chakra');
    ui.charMaxChakra = document.getElementById('char-max-chakra');
    ui.chakraBar = document.getElementById('chakra-bar');
    ui.charStamina = document.getElementById('char-stamina'); 
    ui.charMaxStamina = document.getElementById('char-max-stamina');
    ui.staminaBar = document.getElementById('stamina-bar');

    // Details
    ui.charMorale = document.getElementById('char-morale');
    ui.charConditions = document.getElementById('char-conditions');
    ui.charFamilyBackground = document.getElementById('char-family-background');
    ui.charAffinity = document.getElementById('char-affinity');
    ui.charKekkeiGenkai = document.getElementById('char-kekkei-genkai');
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

    // Dossier Elements
    ui.dossierPanel = document.getElementById('dossier-panel');
    ui.dossierVillageCrest = document.getElementById('dossier-village-crest');
    ui.dossierVillageName = document.getElementById('dossier-village-name');
    ui.dossierCharName = document.getElementById('dossier-char-name');
    ui.dossierRank = document.getElementById('dossier-rank');
    ui.dossierSpeciality = document.getElementById('dossier-speciality');
    ui.dossierStatus = document.getElementById('dossier-status');
    ui.dossierSenseiName = document.getElementById('dossier-sensei-name');
    ui.dossierTeam1Name = document.getElementById('dossier-team1-name');
    ui.dossierTeam2Name = document.getElementById('dossier-team2-name');
    ui.dossierMissionsS = document.getElementById('dossier-missions-s');
    ui.dossierMissionsA = document.getElementById('dossier-missions-a');
    ui.dossierMissionsB = document.getElementById('dossier-missions-b');
    ui.dossierMissionsC = document.getElementById('dossier-missions-c');
    ui.dossierMissionsD = document.getElementById('dossier-missions-d');

    // Chart.js Initialization
 const ctx = document.getElementById('dossier-radar-chart');
    if (ctx) {
        const chartConfig = {
            type: 'radar',
            data: {
                labels: ['TAI', 'NIN', 'TOOL', 'BLOOD', 'GEN'],
                datasets: [{
                    label: 'Shinobi Stats',
                    data: [0, 0, 0, 0, 0],
                    fill: true,
                    // --- THE COLOR FIX ---
                    backgroundColor: 'rgba(185, 107, 107, 0.4)', // Using --dossier-accent
                    borderColor: 'rgb(185, 107, 107)',
                    pointBackgroundColor: 'rgb(185, 107, 107)',
                    // --- END FIX ---
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(185, 107, 107)'
                }]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(61, 53, 42, 0.4)' },
                        grid: { color: 'rgba(61, 53, 42, 0.4)' },
                        pointLabels: {
                            color: '#4a3f35',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: '#8b7e66',
                            backdropColor: 'rgba(245, 232, 200, 0.75)',
                            stepSize: 25
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        };
        ui.dossierChart = new Chart(ctx, chartConfig);
    }

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

/**
 * Populates the new Dossier tab with character data.
 */
function updateDossierTab() {
    const char = gameState.character;
    const ui = gameState.ui;
    if (!ui.dossierPanel) return; // Don't run if not initialized

    // Header
    if (ui.dossierVillageName) ui.dossierVillageName.textContent = char.village || 'Unknown';
    if (ui.dossierVillageCrest && char.village) {
        const village = char.village.toLowerCase();
        // Simple kanji representation
        ui.dossierVillageCrest.textContent = village.includes('konoha') ? '葉' : village.includes('suna') ? '砂' : village.includes('iwa') ? '岩' : village.includes('kiri') ? '霧' : village.includes('kumo') ? '雲' : '?';
    }

    // Main Info
    if (ui.dossierCharName) ui.dossierCharName.textContent = char.name || 'Shinobi';
    if (ui.dossierRank) ui.dossierRank.textContent = char.currentRank || 'N/A';
    if (ui.dossierStatus) ui.dossierStatus.textContent = char.injuries.length > 0 ? 'Injured' : 'Active';

    // Team Info
    if (char.team) {
        if(ui.dossierSenseiName) ui.dossierSenseiName.textContent = char.team.sensei.name;
        if(ui.dossierTeam1Name) ui.dossierTeam1Name.textContent = char.team.teammates[0].name;
        if(ui.dossierTeam2Name) ui.dossierTeam2Name.textContent = char.team.teammates[1].name;
    } else {
        if(ui.dossierSenseiName) ui.dossierSenseiName.textContent = 'N/A';
        if(ui.dossierTeam1Name) ui.dossierTeam1Name.textContent = 'N/A';
        if(ui.dossierTeam2Name) ui.dossierTeam2Name.textContent = 'N/A';
    }

    // Mission Counts
    const missionCounts = calculateMissionCounts(char.missionHistory);
    if(ui.dossierMissionsS) ui.dossierMissionsS.textContent = missionCounts.S;
    if(ui.dossierMissionsA) ui.dossierMissionsA.textContent = missionCounts.A;
    if(ui.dossierMissionsB) ui.dossierMissionsB.textContent = missionCounts.B;
    if(ui.dossierMissionsC) ui.dossierMissionsC.textContent = missionCounts.C;
    if(ui.dossierMissionsD) ui.dossierMissionsD.textContent = missionCounts.D;

    // Radar Chart and Specialty
    const radarStats = calculateRadarStats(char);
    if (ui.dossierSpeciality) ui.dossierSpeciality.textContent = determineSpecialty(radarStats);

    if (ui.dossierChart) {
        ui.dossierChart.data.datasets[0].data = [
            radarStats.TAI,
            radarStats.NIN,
            radarStats.TOOL,
            radarStats.BLOOD,
            radarStats.GEN
        ];
        ui.dossierChart.update();
    }
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

    const healthPercent = char.maxHealth > 0 ? (char.health / char.maxHealth) * 100 : 0;
    if (ui.healthBar) {
        ui.healthBar.style.width = `${healthPercent}%`;
        ui.healthBar.title = `${Math.round(char.health)} / ${Math.round(char.maxHealth)}`;
    }

    const chakraPercent = char.maxChakra > 0 ? (char.chakra / char.maxChakra) * 100 : 0;
    if (ui.chakraBar) {
        ui.chakraBar.style.width = `${chakraPercent}%`;
        ui.chakraBar.title = `${Math.round(char.chakra)} / ${Math.round(char.maxChakra)}`;
    }

    const staminaPercent = char.maxStamina > 0 ? (char.stamina / char.maxStamina) * 100 : 0;
    if (ui.staminaBar) {
        ui.staminaBar.style.width = `${staminaPercent}%`;
        ui.staminaBar.title = `${Math.round(char.stamina)} / ${Math.round(char.maxStamina)}`;
    }

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
    
    if (ui.charKekkeiGenkai) {
        if (char.kekkeiGenkai) {
            const status = char.kekkeiGenkai.awakened ? "Awakened" : "Dormant";
            ui.charKekkeiGenkai.textContent = `${char.kekkeiGenkai.name} (${status})`;
        } else {
            ui.charKekkeiGenkai.textContent = "None";
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

    if (char.currentActivity === 'Incapacitated' || char.currentActivity === 'Hospitalized') {
        if(ui.actionButtons.innerHTML !== '') {
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
        updateDossierTab();
    }
    
    const skillsTab = document.querySelector('.tab-button[data-tab="skills-panel"]');
    if (skillsTab) skillsTab.classList.toggle('disabled', !char.skills);
    const jutsuTab = document.querySelector('.tab-button[data-tab="jutsu-panel"]');
    if (jutsuTab) jutsuTab.classList.toggle('disabled', !char.skills);
    const dossierTab = document.querySelector('.tab-button[data-tab="dossier-panel"]');
    if (dossierTab) dossierTab.classList.toggle('disabled', !char.skills);
}

export function updateTimeControlsUI() {
    const ui = gameState.ui;
    if (ui.pauseResumeButton) ui.pauseResumeButton.textContent = gameState.time.isPaused ? "Resume" : "Pause";
    if (ui.currentTimeScale) ui.currentTimeScale.textContent = `${gameState.time.gameTimeScale}x`;
    ui.timeScaleButtons.forEach(button => {
        button.classList.toggle('active', parseInt(button.dataset.speed) === gameState.time.gameTimeScale && !gameState.time.isPaused);
    });
}

export function hideTimeControls() {
    const ui = gameState.ui;
    if (ui.pauseResumeButton) ui.pauseResumeButton.style.display = 'none';
    ui.timeScaleButtons.forEach(button => {
        button.style.display = 'none';
    });
}

export function showTimeControls() {
    const ui = gameState.ui;
    if (ui.pauseResumeButton) ui.pauseResumeButton.style.display = 'flex';
    ui.timeScaleButtons.forEach(button => {
        button.style.display = 'flex';
    });
}

export function addToNarrative(message, cssClass = "game-message", minDelay = 1000) {
    const time = gameState.time;
    const gameTime = { year: time.year, month: time.monthOfYear, day: time.dayOfMonth, hour: time.currentHour, minute: time.currentMinute };
    const formattedMessage = formatMessage(message);
    gameState.narrativeUpdateQueue.push({ message: formattedMessage, cssClass, timestamp: Date.now(), minDelay, gameTime });
}

export function addToCombatLog(message, cssClass = "game-message") {
    const scroll = gameState.ui.narrativeLog;
    if (!scroll) return;

    const p = document.createElement('p');
    p.className = cssClass;
    
    const formattedMessage = formatMessage(message);
    p.innerHTML = `<span class="timestamp">[COMBAT]</span> ${formattedMessage}`;
    
    scroll.appendChild(p);
    setTimeout(() => { p.style.opacity = '1'; }, 10);
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
        timerDisplay.textContent = `ACTION REQUIRED: ${Math.max(0, timeLeft).toFixed(1)}s`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            onResolve(null, 0);
        }
    }, 100);

    choices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'game-button cmi-button';
        button.textContent = choice.text;
        button.onclick = () => {
            clearInterval(interval);
            onResolve(choice.action, timeLeft);
        };
        cmiContainer.appendChild(button);
    });
}

export function setRestDirective() {
    setDirective(null);
}

export function showVillageMenu() {
    clearActionButtons();
    addToNarrative("You are in the village. What will you do?", "system-message");
    
    addActionButton("Undertake Training", showDirectiveOptions);
    addActionButton("Visit Shinobi Tool Shop", showShopUI);
    addActionButton("Visit Village Hospital", showHospitalUI);
    addActionButton("Rest & Recuperate", setRestDirective, "game-button secondary");
}

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
            const costRyo = remainingDays * 75;
            const timeInDays = Math.ceil(remainingDays / 2);

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

    for (const shopItemId in SHOP_ITEMS) {
        const shopItem = SHOP_ITEMS[shopItemId];
        const baseItemData = ITEMS[shopItem.grants.itemId];
        
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
                addItemToInventory(shopItem.grants.itemId, shopItem.grants.quantity);
                addToNarrative(`You purchased ${shopItem.name}.`, "skill-gain-message");
                showShopUI();
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

    if (char.currentRank === 'Genin' && char.team) {
        addToNarrative(`Set your downtime training directive. **(Current: ${currentDirectiveText})**`, "system-message");
        addActionButton("Rest & Recuperate", setRestDirective, "game-button secondary");
        
        addDirectiveButton("Team Sparring", 'SKILL', { skillGroup: 'social', skillName: 'Team Sparring' });
        addDirectiveButton("Formation & Strategy Drills", 'SKILL', { skillGroup: 'social', skillName: 'Formation Drills' });
        addDirectiveButton("Build Bonds with Teammates", 'SKILL', { skillGroup: 'social', skillName: 'Build Bonds' });
        
        if (char.affinityDiscovered) {
             addDirectiveButton("Elemental Training", 'SKILL', { skillGroup: 'chakra', skillName: 'Elemental Training' });
        }
        addDirectiveButton("Advanced Jutsu Research", 'SKILL', { skillGroup: 'academic', skillName: 'Advanced Jutsu Research' });
        
        addActionButton("Individual Training", showIndividualTrainingOptions);
        addActionButton("Learn a Specific Jutsu", showJutsuLearningOptions);

    } else if (char.currentRank === 'Academy Student' || (char.currentRank === 'Genin' && !char.team)) {
        if (char.currentRank === 'Genin') {
            addToNarrative(`While awaiting your team assignment, you focus on personal training. **(Current: ${currentDirectiveText})**`, "system-message");
        } else {
            addToNarrative(`Set your training directive. **(Current: ${currentDirectiveText})**`, "system-message");
        }
        addActionButton("Rest & Recuperate", setRestDirective, "game-button secondary");
        
        addDirectiveButton("Practice Taijutsu", 'SKILL', { skillGroup: 'physical', skillName: 'Practice Taijutsu' });
        addDirectiveButton("Practice Shurikenjutsu", 'SKILL', { skillGroup: 'physical', skillName: 'Practice Shurikenjutsu' });
        addDirectiveButton("Practice Chakra Control", 'SKILL', { skillGroup: 'chakra', skillName: 'Practice Chakra Control' });
        addDirectiveButton("Academic Study", 'SKILL', { skillGroup: 'academic', skillName: 'Academic Study' });
        
        addActionButton("Learn a Specific Jutsu", showJutsuLearningOptions);

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