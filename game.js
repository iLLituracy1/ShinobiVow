// game.js - Core game logic and loop for Shinobi's Vow

import { initializeUI, updateUI, updateTimeControlsUI, addToNarrative, clearActionButtons, showDirectiveOptions, processNarrativeQueue, showVillageMenu, hideTimeControls, showTimeControls } from './ui.js';
import { generateNewShinobi, recalculateVitals, getCharacterSkillValue, generateGeninTeam } from './character.js';
import { initializeSkills, addXp } from './skills.js';
import { scheduleMilestoneEvent, handleFormativeYearsCycle, handleDowntimeDailyCycle, handleDirectiveTraining } from './events.js';
import { processMissionDay, checkForMissionAssignment } from './mission.js';
import { processActiveEffects, recalculateCurrentStats } from './characterEffects.js';
import { addItemToInventory } from './inventory.js'; 
import { GENIN_STARTER_PACK } from './constants.js'; 


// Global game state object
window.gameState = {
    // Current character's state
    character: {
        name: "Nameless Shinobi",
        age: 0,
        village: "Unknown Village",
        currentRank: null,
        // --- STATS ---
        baseStats: { strength: 0.0, agility: 0.0, stamina: 0.0, chakraPool: 0.0, intellect: 0.0, perception: 0.0, willpower: 0.0 },
        currentStats: { strength: 0.0, agility: 0.0, stamina: 0.0, chakraPool: 0.0, intellect: 0.0, perception: 0.0, willpower: 0.0 },
        familyBackground: "Unknown",
        chakraAffinity: { type: "None", elements: [] },
        kekkeiGenkai: null,
        affinityDiscovered: false,
        traits: [],
        health: 100.0, maxHealth: 100.0,
        chakra: 100.0, maxChakra: 100.0,
        stamina: 100.0, maxStamina: 100.0,
        morale: 100.0,
        statusEffects: [],
        injuries: [],
        inventory: [], 
        currentActivity: "Idle",
        currentMission: null,
        currentDirective: null,
        classesThisWeek: 0,
        aptitudes: {},
        scheduledMilestone: null,
        lastMilestoneYear: -1,
        lastExamYear: -1,
        ryo: 0,
        team: null,
        missionHistory: [],
        currentMissionRole: null,
        dateOfLastPromotion: null,
        scheduledTeamAssignmentDate: null,
        combatStats: {
            CEXP: 0, // Combat Experience
            familiarity: {}, // e.g., { 'rogue_genin_brawler': 1 }
        }
    },
    
    // Game time management
    time: {
        totalGameMinutes: 0.0,
        currentMinute: 0, currentHour: 0, dayOfMonth: 1, monthOfYear: 1, year: 0,
        gameTimeScale: 1,
        isPaused: false,
    },
    
    // *** NEW: The core state manager for the game loop ***
    mode: 'Simulating', // Can be 'Simulating', 'Combat', 'Paused', 'CMI'

    // Meta-progression
    legendPoints: 0,
    libraryOfLegends: [],
    meta: {
        villageChances: {}, affinityChances: {}, traitChances: {}, statDistributionShift: {}
    },

    // UI elements references
    ui: {},

    // Game loop control
    isGameActive: false,
    gameLoopInterval: null,
    narrativeUpdateQueue: [],
    lastNarrativeUpdateTime: 0
};


// --- Core Game Functions ---

function initializeGame() {
    console.log("Game Initializing...");
    initializeUI();
    document.getElementById('startGameButton').addEventListener('click', startNewShinobiLife);
    if (gameState.ui.pauseResumeButton) {
        gameState.ui.pauseResumeButton.addEventListener('click', togglePauseResume);
    }
    gameState.ui.timeScaleButtons.forEach(button => {
        button.addEventListener('click', () => changeGameSpeed(parseInt(button.dataset.speed)));
    });
    
    // Start the perpetual game loop
    if (gameState.gameLoopInterval) clearInterval(gameState.gameLoopInterval);
    gameState.gameLoopInterval = setInterval(gameLoop, GAME_TICK_INTERVAL_MS);
    
    updateUI();
    updateTimeControlsUI();
    addToNarrative("Welcome, future Shinobi. Your journey begins with the turn of fate.", "system-message");
    addToNarrative("Press 'Start New Shinobi Life' to begin your first character's journey.");
}

function resetCharacterState() {
    gameState.character = {
        name: "Nameless Shinobi",
        age: 0, 
        village: "Unknown", 
        currentRank: null,
        baseStats: { strength: 0.0, agility: 0.0, stamina: 0.0, chakraPool: 0.0, intellect: 0.0, perception: 0.0, willpower: 0.0 },
        currentStats: { strength: 0.0, agility: 0.0, stamina: 0.0, chakraPool: 0.0, intellect: 0.0, perception: 0.0, willpower: 0.0 },
        familyBackground: "Unknown",
        chakraAffinity: { type: "None", elements: [] },
        kekkeiGenkai: null,
        affinityDiscovered: false,
        traits: [],
        health: 100.0, 
        maxHealth: 100.0, 
        chakra: 100.0, 
        maxChakra: 100.0, 
        stamina: 100.0, 
        maxStamina: 100.0, 
        morale: 100.0,
        statusEffects: [], 
        injuries: [], 
        inventory: [], 
        currentActivity: "Idle",
        currentMission: null, 
        classesThisWeek: 0, 
        currentDirective: null,
        aptitudes: {},
        scheduledMilestone: null,
        lastMilestoneYear: -1,
        lastExamYear: -1,
        ryo: 0,
        team: null,
        missionHistory: [],
        currentMissionRole: null,
        dateOfLastPromotion: null,
        scheduledTeamAssignmentDate: null,
        combatStats: {
            CEXP: 0,
            familiarity: {},
        }
    };
    gameState.time = { 
        totalGameMinutes: 0.0, currentMinute: 0, currentHour: 0, dayOfMonth: 1, monthOfYear: 1, year: 0, 
        gameTimeScale: 1, isPaused: false
    };
    gameState.narrativeUpdateQueue = [];
    gameState.lastNarrativeUpdateTime = 0;
    gameState.mode = 'Simulating'; // Reset mode
    if(gameState.ui.narrativeLog) gameState.ui.narrativeLog.innerHTML = '';
}


function applyLegendPointEffects() {
    console.log("Applying Legend Point effects (placeholder).");
}

function startNewShinobiLife() {
    if (gameState.isGameActive) {
        addToNarrative(`The life of ${gameState.character.name} comes to an end. A new generation begins...`, "system-message");
    }
    resetCharacterState();
    applyLegendPointEffects();
    generateNewShinobi();
    gameState.isGameActive = true;
    clearActionButtons();
    addToNarrative(`You are born into the ${gameState.character.village}. Your journey begins.`, "system-message");
    const stats = gameState.character.baseStats;
    addToNarrative(`Your innate potential is revealed: Strength ${stats.strength.toFixed(1)}, Agility ${stats.agility.toFixed(1)}, etc.`, "system-message");
    addToNarrative(`Your early years (0-5) will be shaped by random events. You have no direct control here.`, "system-message");
    gameState.character.currentActivity = "Early Childhood (0-5)";
    gameState.time.gameTimeScale = 1;
    gameState.time.isPaused = false;
    clearActionButtons(); 
    updateUI();
    updateTimeControlsUI();
}

// --- Game Loop Implementation (REFACTORED) ---
const GAME_TICK_INTERVAL_MS = 100;

// DEPRECATED: The loop is now perpetual. Control is handled by gameState.mode and gameState.time.isPaused.
export function startGameLoop() { console.warn("startGameLoop is deprecated."); }
export function stopGameLoop() { console.warn("stopGameLoop is deprecated."); }

async function gameLoop() {
    // The loop now ALWAYS runs, but what it does is determined by the game's state.
    // This prevents deadlocks.
    if (!gameState.isGameActive || gameState.time.isPaused) {
        processNarrativeQueue(); // Process narrative even when paused
        return;
    }
    
    // *** THE CORE DECOUPLING LOGIC ***
    // If the game is in any mode other than 'Simulating', the main time-advancing loop does nothing.
    if (gameState.mode !== 'Simulating') {
        processNarrativeQueue();
        return;
    }
    
    const baseGameMinutesPerTick = (GAME_TICK_INTERVAL_MS / 1000) * 0.5;
    const gameMinutesPassedThisTick = baseGameMinutesPerTick * gameState.time.gameTimeScale;
    
    const oldTotalMinutes = gameState.time.totalGameMinutes;
    const oldYear = Math.floor(oldTotalMinutes / (365 * 1440));
    const oldDay = Math.floor(oldTotalMinutes / 1440);
    const oldWeek = Math.floor(oldDay / 7);

    gameState.time.totalGameMinutes += gameMinutesPassedThisTick;
    
    await processActiveEffects(gameState.character, gameMinutesPassedThisTick);

    const currentTotalDays = Math.floor(gameState.time.totalGameMinutes / 1440);
    const currentWeek = Math.floor(currentTotalDays / 7);
    const currentYear = Math.floor(currentTotalDays / 365);
    const timeInDay = gameState.time.totalGameMinutes % 1440;
    gameState.time.currentHour = Math.floor(timeInDay / 60);
    gameState.time.currentMinute = Math.floor(timeInDay % 60);
    const dayInYear = currentTotalDays % 365;
    gameState.time.monthOfYear = Math.floor(dayInYear / 30) + 1;
    gameState.time.dayOfMonth = (dayInYear % 30) + 1;
    gameState.time.year = currentYear;
    
    const char = gameState.character;
    const time = gameState.time;
    const age = char.age;

    // --- Event Triggers ---
    if (currentYear > oldYear) {
        char.age = currentYear;
        addToNarrative(`You are now ${char.age} years old.`, "age-up-message");
        
        if (age >= 1 && age <= 5) {
            scheduleMilestoneEvent(age);
        } else if (age === 6 && char.currentRank === null) {
            addToNarrative(`At age 6, you enroll in the Shinobi Academy. Your formal training begins.`, "system-message");
            initializeSkills(char);
            char.currentActivity = "Academy Student";
            char.currentRank = "Academy Student";
            showDirectiveOptions();
        } else if (age >= 12 && char.currentRank === "Academy Student") {
            addToNarrative("You are another year older, another year wiser. The annual graduation exam approaches.", "system-message");
        }
    }

    if (currentWeek > oldWeek) {
        if(char.currentRank === "Academy Student") char.classesThisWeek = 0;
    }
    
    // --- DAILY CHECK ---
    if (currentTotalDays > oldDay) {
        if (time.monthOfYear === 3 && time.dayOfMonth === 15) {
            if (age >= 12 && char.currentRank === "Academy Student" && time.year > char.lastExamYear) {
                attemptAcademyExam(); 
                return; 
            }
        }
        
        if (char.scheduledTeamAssignmentDate && time.totalGameMinutes >= char.scheduledTeamAssignmentDate) {
            triggerTeamAssignmentEvent();
            return; 
        }

        if (char.currentActivity === 'Incapacitated' || char.currentActivity === 'Hospitalized') {
            if (currentTotalDays % 3 === 0) {
                addToNarrative("You remain bedridden, slowly recovering from your injuries.", "system-message");
            }
        } else if (char.currentActivity === 'Returning to Village') {
            char.currentActivity = 'Downtime';
            addToNarrative("You have returned to the village and reported the mission's outcome.", "system-message");
            showVillageMenu();
        } else if (char.currentMission) {
            processMissionDay(); 
        } else { // Downtime Logic
            if (age >= 1 && age <= 5) { 
                handleFormativeYearsCycle();
            } else if (char.currentRank === 'Academy Student' && age >= 6) {
                handleDowntimeDailyCycle();
            } else if (char.currentRank === 'Genin' && char.team) {
                handleDowntimeDailyCycle(); 
                addXp(char.skills.social.Teamwork, 50, 'Teamwork');
                addXp(char.skills.physical.Taijutsu, 25, 'Taijutsu');
                if (currentTotalDays % 3 === 0) {
                    addToNarrative("You spend the morning in grueling team training drills with your sensei and squadmates.", "system-message");
                }
                checkForMissionAssignment(); 
            }
        }
    }

    // --- Continuous Activity Logic ---
    let healingMultiplier = 1.0;
    if (char.currentActivity === "Resting") {
        healingMultiplier = 2.5;
    } 
    else {
        if (!char.currentMission && age >= 6) {
            handleDirectiveTraining(gameMinutesPassedThisTick);
        }
    }

    const stats = char.currentStats;
    const baseHealthRegen = 0.04;
    const baseChakraRegen = 0.08;
    const baseStaminaRegen = 0.12;
    const baseMoraleRegen = 0.01;

    const healthGain = (baseHealthRegen * (1 + stats.stamina * 0.02)) * gameMinutesPassedThisTick * healingMultiplier;
    const chakraGain = (baseChakraRegen * (1 + stats.chakraPool * 0.02)) * gameMinutesPassedThisTick * healingMultiplier;
    const staminaGain = (baseStaminaRegen * (1 + stats.stamina * 0.02)) * gameMinutesPassedThisTick * healingMultiplier;
    const moraleGain = (baseMoraleRegen * (1 + stats.willpower * 0.02)) * gameMinutesPassedThisTick * healingMultiplier;

    char.health = Math.min(char.maxHealth, char.health + healthGain);
    char.chakra = Math.min(char.maxChakra, char.chakra + chakraGain);
    char.stamina = Math.min(char.maxStamina, char.stamina + staminaGain);
    char.morale = Math.min(100, char.morale + moraleGain);

    recalculateCurrentStats(char);
    recalculateVitals(char);

    processNarrativeQueue();
    updateUI();
}

// --- Time & Player Choice Controls ---

export function togglePauseResume() {
    gameState.time.isPaused = !gameState.time.isPaused;
    updateTimeControlsUI();
}

export function changeGameSpeed(newSpeed) {
    if (gameState.time.isPaused) togglePauseResume();
    gameState.time.gameTimeScale = newSpeed;
    updateTimeControlsUI();
}

export function setDirective(directive) {
    const char = gameState.character;
    let activityText = "Idle";

    if (!directive) {
        char.currentDirective = null;
        char.currentActivity = "Resting";
        addToNarrative(`You take a break from your rigorous training to rest and recuperate.`, "system-message");
    } else {
        char.currentDirective = directive;
        if (directive.type === 'JUTSU') activityText = `Training: ${directive.jutsuName}`;
        else if (directive.type === 'SKILL') activityText = `Training: ${directive.skillName}`;
        
        if (char.currentRank === 'Genin') {
            if (char.team) {
                char.currentActivity = `Downtime (${activityText})`;
            } else {
                char.currentActivity = `Awaiting Team Assignment (${activityText})`;
            }
        } else {
            char.currentActivity = `Academy Student (${activityText})`;
        }
        addToNarrative(`New directive set. You will now focus your free time on **${activityText}**.`, "system-message");
    }
    
    showDirectiveOptions(); 
    updateUI();
}

export function handleHospitalTreatment(injuryId, costRyo, timeInDays) {
    const char = gameState.character;

    if (char.ryo < costRyo) {
        addToNarrative("You cannot afford this treatment.", "system-message error");
        return;
    }

    char.ryo -= costRyo;
    addToNarrative(`You pay ${costRyo} Ryo for intensive medical care.`, "system-message");

    const injuryIndex = char.injuries.findIndex(inj => inj.id === injuryId);
    if (injuryIndex > -1) {
        const injuryName = char.injuries[injuryIndex].name;
        char.injuries.splice(injuryIndex, 1);
        addToNarrative(`The medics begin treatment for your **${injuryName}**. You will be bedridden for ${timeInDays} days...`, "event-message");
    }

    const timeToAdvanceMinutes = timeInDays * 1440;
    advanceGameTime(timeToAdvanceMinutes, 'Hospitalized');

    addToNarrative("Your treatment is complete. You feel much better.", "system-message success");
    recalculateCurrentStats(char);
    recalculateVitals();
    showVillageMenu();
    updateUI();
}

export function advanceGameTime(minutesToAdvance, newActivity) {
    const wasPaused = gameState.time.isPaused;
    gameState.time.isPaused = true;
    
    if(newActivity) gameState.character.currentActivity = newActivity;

    const targetTotalMinutes = gameState.time.totalGameMinutes + minutesToAdvance;
    
    const timeStep = 60; 

    while (gameState.time.totalGameMinutes < targetTotalMinutes) {
        const minutesThisTick = Math.min(timeStep, targetTotalMinutes - gameState.time.totalGameMinutes);
        
        gameState.time.totalGameMinutes += minutesThisTick;
        processActiveEffects(gameState.character, minutesThisTick);
    }

    const currentTotalDays = Math.floor(gameState.time.totalGameMinutes / 1440);
    const timeInDay = gameState.time.totalGameMinutes % 1440;
    gameState.time.currentHour = Math.floor(timeInDay / 60);
    gameState.time.currentMinute = Math.floor(timeInDay % 60);
    const dayInYear = currentTotalDays % 365;
    gameState.time.monthOfYear = Math.floor(dayInYear / 30) + 1;
    gameState.time.dayOfMonth = (dayInYear % 30) + 1;
    gameState.time.year = Math.floor(currentTotalDays / 365);
    gameState.character.age = gameState.time.year;


    if (!wasPaused) {
        gameState.time.isPaused = false;
    }
}


async function attemptAcademyExam() {
    const char = gameState.character;
    const time = gameState.time;
    
    char.lastExamYear = time.year; 
    gameState.time.isPaused = true;
    updateTimeControlsUI();
    clearActionButtons();
    hideTimeControls(); // <-- HIDE BUTTONS
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    addToNarrative("It is the annual Graduation Exam Day. All eligible students must participate. The instructors call your name. It is time.", "event-message");
    await delay(3000);

    const canAttemptJutsu = 
            getCharacterSkillValue(char, 'Transformation Jutsu') >= 1 &&
            getCharacterSkillValue(char, 'Substitution Jutsu') >= 1 &&
            getCharacterSkillValue(char, 'Clone Jutsu') >= 1;

    let averageScore = 0;

    if (!canAttemptJutsu) {
        addToNarrative("You step forward, but you have not yet mastered the three fundamental techniques. You are unable to even complete the practical portion.", "system-message error");
        await delay(3000);
        averageScore = 0;
    } else {
        const results = [];
        const gradeThresholds = { S: 28, A: 20, B: 13, C: 7, D: 4 };
        const ninjutsuThresholds = { S: 12, A: 8, B: 5, C: 2, D: 1 };
        const gradeToPoints = (grade) => ({ S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 }[grade] || 0);
        const calculateGrade = (score, thresholds) => {
            if (score >= thresholds.S) return 'S';
            if (score >= thresholds.A) return 'A';
            if (score >= thresholds.B) return 'B';
            if (score >= thresholds.C) return 'C';
            if (score >= thresholds.D) return 'D';
            return 'F';
        };

        addToNarrative("Part 1: Written Examination. The test covers shinobi history, strategy, and chakra theory.", "system-message");
        await delay(2000);
        const writtenScore = (getCharacterSkillValue(char, 'NinjutsuTheory') * 2) + (getCharacterSkillValue(char, 'intellect') / 8);
        const writtenGrade = calculateGrade(writtenScore, gradeThresholds);
        results.push(writtenGrade);
        addToNarrative(`You complete the test, your knowledge put to the ultimate test. Your result is... **Grade: ${writtenGrade}**`, `system-message ${writtenGrade < 'D' ? 'success' : 'error'}`);
        await delay(3000);
        
        addToNarrative("Part 2: Marksmanship. You head to the range to demonstrate your proficiency with shuriken and kunai.", "system-message");
        await delay(2000);
        const marksmanshipScore = (getCharacterSkillValue(char, 'Shurikenjutsu') * 2) + (getCharacterSkillValue(char, 'perception') / 8);
        const marksmanshipGrade = calculateGrade(marksmanshipScore, gradeThresholds);
        results.push(marksmanshipGrade);
        addToNarrative(`You take a deep breath and let your tools fly. Your accuracy is judged... **Grade: ${marksmanshipGrade}**`, `system-message ${marksmanshipGrade < 'D' ? 'success' : 'error'}`);
        await delay(3000);

        addToNarrative("Part 3: Taijutsu. You are paired against an instructor for a practical sparring match.", "system-message");
        await delay(2000);
        const taijutsuScore = (getCharacterSkillValue(char, 'Taijutsu') * 2) + (getCharacterSkillValue(char, 'strength') / 10) + (getCharacterSkillValue(char, 'agility') / 10);
        const taijutsuGrade = calculateGrade(taijutsuScore, gradeThresholds);
        results.push(taijutsuGrade);
        addToNarrative(`The instructor comes at you with controlled speed. You defend and counter as best you can. Your performance is evaluated... **Grade: ${taijutsuGrade}**`, `system-message ${taijutsuGrade < 'D' ? 'success' : 'error'}`);
        await delay(3000);
        
        addToNarrative("Part 4: Practical Ninjutsu. You must now demonstrate the three fundamental techniques.", "system-message");
        await delay(2000);
        const ninjutsuScore = (getCharacterSkillValue(char, 'Transformation Jutsu') + getCharacterSkillValue(char, 'Substitution Jutsu') + getCharacterSkillValue(char, 'Clone Jutsu')) / 3;
        const ninjutsuGrade = calculateGrade(ninjutsuScore, ninjutsuThresholds);
        results.push(ninjutsuGrade);
        addToNarrative(`You perform the hand seals and channel your chakra for the final test. Your execution of the jutsu is graded... **Grade: ${ninjutsuGrade}**`, `system-message ${ninjutsuGrade < 'D' ? 'success' : 'error'}`);
        await delay(4000);

        const totalPoints = results.reduce((sum, grade) => sum + gradeToPoints(grade), 0);
        averageScore = totalPoints / results.length;
    }
    
    addToNarrative("The instructors gather to tally the scores. Your future as a shinobi hangs in the balance...", "event-message");
    await delay(3000);

    if (averageScore >= 2.0) { 
        const passMessage = averageScore >= 3.5 
            ? `**OUTCOME: PASS WITH DISTINCTION!** Your exceptional, well-rounded performance has been noted.` 
            : `**OUTCOME: PASS!** You have met the requirements and demonstrated the core competencies of a shinobi.`;
        
        addToNarrative(`${passMessage} Congratulations, Genin.`, "system-message success");
        
        char.currentRank = "Genin";
        char.currentActivity = "Awaiting Team Assignment";
        char.dateOfLastPromotion = time.totalGameMinutes; 
        char.morale = Math.min(100, char.morale + 20);
        if (averageScore >= 3.5) char.baseStats.willpower += 0.8;
        
        addToNarrative("You are issued a standard Genin tool pouch containing basic equipment. You are also given your Shinobi Headband, denoting your official status as a Ninja.", "skill-gain-message");
        GENIN_STARTER_PACK.forEach(item => {
            addItemToInventory(item.id, item.quantity);
        });

        char.currentDirective = null;

        const daysUntilAssignment = Math.floor(Math.random() * 14) + 7;
        const assignmentDateInMinutes = (Math.floor(time.totalGameMinutes / 1440) + daysUntilAssignment) * 1440;
        char.scheduledTeamAssignmentDate = assignmentDateInMinutes;
        
        addToNarrative(`Report to the mission assignment desk in ${daysUntilAssignment} days for your team placement.`, "system-message");
        clearActionButtons();
        
    } else {
        const message = canAttemptJutsu ? `Your skills were found to be insufficient.` : `You were unprepared.`;
        addToNarrative(`**OUTCOME: FAILURE.** ${message} You will be required to repeat the year to address your weaknesses.`, "system-message error");
        char.morale = Math.max(0, char.morale - 20);
    }

    updateUI();
    
    showTimeControls(); // <-- SHOW BUTTONS
    changeGameSpeed(1);

    if (char.currentRank === "Academy Student") {
        showDirectiveOptions();
    }
}


async function triggerTeamAssignmentEvent() {
    const char = gameState.character;
    char.scheduledTeamAssignmentDate = null; 
    gameState.time.isPaused = true;
    updateTimeControlsUI();
    clearActionButtons();
    hideTimeControls(); // <-- HIDE BUTTONS
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    addToNarrative("A summons arrives from the Kage's tower. Your team assignment is ready.", "event-message");
    await delay(4000);

    const team = generateGeninTeam(char);
    char.team = team;

    addToNarrative(`You stand in a room with two other recent graduates. One is ${team.teammates[0].name}, a ${team.teammates[0].personality}. The other is ${team.teammates[1].name}, who seems to be a ${team.teammates[1].personality}.`, "system-message");
    await delay(5000);
    addToNarrative(`A Jonin enters. "I am ${team.sensei.name}," they say, their demeanor that of a ${team.sensei.personality}. "From this day forward, you are Team ${Math.floor(Math.random() * 10) + 1}. Meet me at Training Ground 7 at dawn. Your real training starts now."`, "system-message success");
    await delay(5000);
    
    char.currentActivity = "Downtime (Team Training)";
    showTimeControls(); // <-- SHOW BUTTONS
    changeGameSpeed(1); 
    showVillageMenu();
    updateUI();
}

document.addEventListener('DOMContentLoaded', initializeGame);

// --- DEBUGGING FUNCTIONS ---

function debug_flushNarrativeQueue() {
    if (!gameState.ui.narrativeLog) return;
    while (gameState.narrativeUpdateQueue.length > 0) {
        const { message, cssClass, gameTime } = gameState.narrativeUpdateQueue.shift();
        const p = document.createElement('p');
        p.className = cssClass;
        const dateStamp = `${String(gameTime.day).padStart(2, '0')}/${String(gameTime.month).padStart(2, '0')}/${gameTime.year}`;
        const timeStamp = `${String(gameTime.hour).padStart(2, '0')}:${String(gameTime.minute).padStart(2, '0')}`;
        p.innerHTML = `<span class="timestamp">[${dateStamp} ${timeStamp}]</span> ${message}`;
        gameState.ui.narrativeLog.appendChild(p);
        p.style.opacity = '1';
    }
    gameState.ui.narrativeLog.scrollTop = gameState.ui.narrativeLog.scrollHeight;
}

function debug_ageCharacterTo(targetAge) {
    if (!gameState.isGameActive) {
        console.error("Cannot age character. Start a new shinobi life first.");
        return;
    }
    if (targetAge <= gameState.character.age) {
        console.error(`Target age (${targetAge}) must be greater than current age (${gameState.character.age}).`);
        return;
    }

    console.log(`DEBUG: Fast-forwarding character to age ${targetAge}...`);
    const targetTotalMinutes = targetAge * 365 * 24 * 60;
    const timeStep = 1440;

    const wasPaused = gameState.time.isPaused;
    gameState.time.isPaused = true;

    while (gameState.time.totalGameMinutes < targetTotalMinutes) {
        const oldYear = Math.floor(gameState.time.totalGameMinutes / (365 * 1440));
        
        gameState.time.totalGameMinutes += timeStep;

        const currentTotalDays = Math.floor(gameState.time.totalGameMinutes / 1440);
        const currentYear = Math.floor(currentTotalDays / 365);
        
        const timeInDay = gameState.time.totalGameMinutes % 1440;
        gameState.time.currentHour = Math.floor(timeInDay / 60);
        gameState.time.currentMinute = Math.floor(timeInDay % 60);
        const dayInYear = currentTotalDays % 365;
        gameState.time.monthOfYear = Math.floor(dayInYear / 30) + 1;
        gameState.time.dayOfMonth = (dayInYear % 30) + 1;
        gameState.time.year = currentYear;

        if (currentYear > oldYear) {
            gameState.character.age = currentYear;
            addToNarrative(`You are now ${gameState.character.age} years old.`, "age-up-message");
            if (gameState.character.age >= 1 && gameState.character.age <= 5) {
                scheduleMilestoneEvent(gameState.character.age);
            } else if (gameState.character.age === 6 && gameState.character.currentRank === null) {
                addToNarrative(`At age 6, you enroll in the Shinobi Academy. Your formal training begins.`, "system-message");
                initializeSkills(gameState.character);
                gameState.character.currentActivity = "Academy Student";
                gameState.character.currentRank = "Academy Student";
            }
        }

        const age = gameState.character.age;
        if (age >= 1 && age <= 5) { 
            handleFormativeYearsCycle();
        } else if (age >= 6) {
            handleDowntimeDailyCycle();
            handleDirectiveTraining(timeStep); 
        }
    }
    
    recalculateCurrentStats(gameState.character);
    recalculateVitals();
    debug_flushNarrativeQueue();
    updateUI();
    
    if (gameState.character.age >= 6) {
        showDirectiveOptions();
    }
    
    if (!wasPaused) {
        gameState.time.isPaused = false;
    }
    addToNarrative(`**DEBUG:** Character instantly aged to ${gameState.character.age}. All formative events simulated.`, "system-message success");
    console.log(`DEBUG: Fast-forward complete. Character is now age ${gameState.character.age}.`);
}

if (window) {
    window.debug_ageCharacterTo = debug_ageCharacterTo;
    window.debug_flushNarrativeQueue = debug_flushNarrativeQueue;
}