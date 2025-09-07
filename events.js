// events.js - Event handling and activity logic for Shinobi's Vow

import { addXp, unlockJutsu } from './skills.js';
import { addToNarrative, updateUI } from './ui.js';
import { recalculateVitals } from './character.js';
import { 
    AGE_1_MILESTONES, AGE_2_MILESTONES, AGE_3_MILESTONES, AGE_4_MILESTONES, AGE_5_MILESTONES,
    VIGNETTE_EVENTS, VIGNETTE_CHANCE_PER_DAY, ACADEMY_MILESTONES, REQUIRED_CLASSES_PER_WEEK,
    CLASS_CHANCE_PER_DAY, TRAINING_DIRECTIVES, JUTSU_LIBRARY, ELEMENTS, 
    // Import all event pools
    ACADEMY_TAIJUTSU_EVENTS, ACADEMY_SHURIKENJUTSU_EVENTS, ACADEMY_CHAKRA_CONTROL_EVENTS,
    ACADEMY_STUDY_EVENTS, JUTSU_LEARNING_EVENTS,
    GENIN_TAIJUTSU_EVENTS, GENIN_SHURIKENJUTSU_EVENTS, GENIN_CHAKRA_CONTROL_EVENTS,
    // Genin Narrative
    TEAM_SPARRING_EVENTS, FORMATION_DRILL_EVENTS, BUILD_BONDS_EVENTS, ELEMENTAL_TRAINING_EVENTS, ADVANCED_JUTSU_RESEARCH_EVENTS,
    AFFINITY_DISCOVERY_CHANCE_PER_MINUTE, KEKKEI_GENKAI_DISCOVERY_CHANCE_PER_DAY, KEKKEI_GENKAI_AWAKENING_THRESHOLDS, JUTSU_DISCOVERY_EVENTS
} from './constants.js';


// --- NEW: Affinity Discovery Logic ---
/**
 * Checks if the character discovers their chakra affinity through training.
 * @param {object} char - The character object.
 * @param {number} gameMinutesPassed - The number of minutes passed this tick.
 */
function checkForAffinityDiscovery(char, gameMinutesPassed) {
    if (char.affinityDiscovered) return;

    // This check is specifically for the "Practice Chakra Control" directive
    if (char.currentDirective?.skillName !== 'Practice Chakra Control') return;

    const discoveryChance = AFFINITY_DISCOVERY_CHANCE_PER_MINUTE * gameMinutesPassed;
    const intellectBonus = 1 + (char.currentStats.intellect * 0.01);
    const finalChance = discoveryChance * intellectBonus;

    if (Math.random() < finalChance) {
        const affinityMilestone = ACADEMY_MILESTONES.find(m => m.name === "Chakra Affinity Test");
        if (affinityMilestone) {
            addToNarrative("Through intense focus on your chakra, you feel a sudden, instinctual pull...", "event-message");
            const outcome = affinityMilestone.resolve(char);
            setTimeout(() => {
                addToNarrative(outcome.narrative, outcome.cssClass || "system-message", 1000);
                updateUI();
            }, 2000);
        }
    }
}

// --- NEW: Kekkei Genkai Discovery Logic ---

/**
 * Handles the narrative and mechanical awakening of a Kekkei Genkai.
 * @param {object} char - The character object.
 */
function triggerKekkeiGenkaiAwakening(char) {
    if (!char.kekkeiGenkai || char.kekkeiGenkai.awakened) return;

    char.kekkeiGenkai.awakened = true;
    const kgName = char.kekkeiGenkai.name;

    addToNarrative(`**A torrent of power erupts from within!** You feel a strange, new sensation as your chakra pathways realign!`, 'event-message success');
    setTimeout(() => {
        addToNarrative(`You have awakened your bloodline limit: **${kgName}**!`, 'skill-gain-message', 1000);
        // Future logic can add special KG-related jutsu or skills here.
        updateUI();
    }, 3000);
}

/**
 * Checks for a spontaneous, random awakening of a Kekkei Genkai.
 * @param {object} char - The character object.
 */
function checkForSpontaneousKGAwakening(char) {
    if (!char.kekkeiGenkai || char.kekkeiGenkai.awakened) return;

    if (Math.random() < KEKKEI_GENKAI_DISCOVERY_CHANCE_PER_DAY) {
        triggerKekkeiGenkaiAwakening(char);
    }
}

/**
 * Checks if the character meets the training thresholds to awaken their Kekkei Genkai.
 * Called from addXp on every level-up.
 * @param {object} char - The character object.
 * @param {string} skillName - The name of the skill that just leveled up.
 * @param {number} newLevel - The new level of the skill.
 */
export function checkForKekkeiGenkaiAwakening(char, skillName, newLevel) {
    if (!char.kekkeiGenkai || char.kekkeiGenkai.awakened) return;

    const kg = char.kekkeiGenkai;

    if (kg.elements.length === 2) { // Elemental KG
        const threshold = KEKKEI_GENKAI_AWAKENING_THRESHOLDS.ELEMENTAL;
        const skill1Name = `Ninjutsu${kg.elements[0]}`;
        const skill2Name = `Ninjutsu${kg.elements[1]}`;
        
        const skill1 = char.skills.chakra[skill1Name];
        const skill2 = char.skills.chakra[skill2Name];

        if (skill1 && skill2 && skill1.level >= threshold && skill2.level >= threshold) {
            triggerKekkeiGenkaiAwakening(char);
        }
    } else { // Special KG (like Crystal Release)
        const threshold = KEKKEI_GENKAI_AWAKENING_THRESHOLDS.SPECIAL;
        if (kg.name === "Crystal Release") {
            const theory = char.skills.academic.NinjutsuTheory;
            const control = char.skills.chakra.ChakraControl;
            if (theory && control && theory.level >= threshold && control.level >= threshold) {
                triggerKekkeiGenkaiAwakening(char);
            }
        }
    }
}

/**
 * Schedules a major milestone event for a random day within the character's current year of age (Ages 1-5).
 * @param {number} age - The current age of the character (1-5).
 */
export function scheduleMilestoneEvent(age) {
    const char = gameState.character;
    if (char.scheduledMilestone && char.scheduledMilestone.year === gameState.time.year) {
        return;
    }
    const randomMonth = Math.floor(Math.random() * 12) + 1;
    const randomDay = Math.floor(Math.random() * 30) + 1;
    char.scheduledMilestone = {
        year: gameState.time.year,
        month: randomMonth,
        day: randomDay,
        age: age
    };
}

/**
 * Triggers the scheduled milestone event for ages 1-5 if the current game date matches.
 */
function triggerScheduledMilestone() {
    const char = gameState.character;
    const time = gameState.time;
    if (char.scheduledMilestone && char.scheduledMilestone.year === time.year && char.scheduledMilestone.month === time.monthOfYear && char.scheduledMilestone.day === time.dayOfMonth) {
        let eventPool;
        switch (char.scheduledMilestone.age) {
            case 1: eventPool = AGE_1_MILESTONES; break;
            case 2: eventPool = AGE_2_MILESTONES; break;
            case 3: eventPool = AGE_3_MILESTONES; break;
            case 4: eventPool = AGE_4_MILESTONES; break;
            case 5: eventPool = AGE_5_MILESTONES; break;
            default: return;
        }
        const event = eventPool[Math.floor(Math.random() * eventPool.length)];
        const outcome = event.resolve(char);
        addToNarrative(`**Milestone (Age ${char.scheduledMilestone.age}): ${event.name}** - ${event.message}`, "event-message", 3000);
        setTimeout(() => {
            addToNarrative(outcome.narrative, "system-message", 1000);
            for (const stat in outcome.statChanges) {
                if (char.baseStats[stat] !== undefined) char.baseStats[stat] += outcome.statChanges[stat];
            }
            if (outcome.moraleChange) char.morale = Math.max(0, Math.min(100, char.morale + outcome.moraleChange));
            if (outcome.health) char.health = Math.max(0, Math.min(char.maxHealth, char.health + outcome.health));
            if (outcome.aptitude) {
                addToNarrative(`You have gained a natural aptitude for **${outcome.aptitude.name}**!`, "skill-gain-message", 0);
            }
            recalculateVitals();
            updateUI();
        }, 3000);
        char.scheduledMilestone = null;
    }
}

/**
 * A chance to trigger a small, flavorful vignette event.
 */
function triggerVignetteEvent() {
    if (Math.random() < VIGNETTE_CHANCE_PER_DAY) {
        const event = VIGNETTE_EVENTS[Math.floor(Math.random() * VIGNETTE_EVENTS.length)];
        addToNarrative(event.message, "system-message", 2000);
        if (event.statChanges) {
            for (const stat in event.statChanges) {
                if (gameState.character.baseStats[stat] !== undefined) gameState.character.baseStats[stat] += event.statChanges[stat];
            }
        }
        if (event.moraleChange) gameState.character.morale = Math.max(0, Math.min(100, gameState.character.morale + event.moraleChange));
        updateUI();
    }
}

/**
 * The main daily cycle for the formative years (ages 1-5).
 */
export function handleFormativeYearsCycle() {
    triggerScheduledMilestone();
    triggerVignetteEvent();
    checkForSpontaneousKGAwakening(gameState.character); // Add KG check
}

// --- ACADEMY PHASE LOGIC (Ages 6+) ---

/**
 * Handles triggering special Academy milestones like the affinity test.
 */
function handleAcademyMilestone() {
    const year = gameState.time.year;
    if (gameState.character.lastMilestoneYear === year || ACADEMY_MILESTONES.length === 0) return;

    if (Math.random() < 0.0003) { // 0.0003% chance per day to trigger the yearly milestone
        const milestone = ACADEMY_MILESTONES[Math.floor(Math.random() * ACADEMY_MILESTONES.length)];
        const outcome = milestone.resolve(gameState.character);
        
        addToNarrative(`**Milestone: ${milestone.name}** - ${milestone.message}`, "event-message", 3000);
        setTimeout(() => {
            addToNarrative(outcome.narrative, outcome.cssClass || "system-message", 1000);
            if(outcome.statChanges) { /* apply changes if any */ }
            updateUI();
        }, 3000);
        
        gameState.character.lastMilestoneYear = year;
    }
}

function handleMandatoryAcademyClasses() {
    if (gameState.character.classesThisWeek < REQUIRED_CLASSES_PER_WEEK) {
        if (Math.random() < CLASS_CHANCE_PER_DAY) {
            gameState.character.classesThisWeek++;
            const skills = gameState.character.skills;
            const xpGain = 10;
            
            addXp(skills.physical.Taijutsu, xpGain, 'Taijutsu');
            addXp(skills.physical.Shurikenjutsu, xpGain, 'Shurikenjutsu');
            addXp(skills.chakra.ChakraControl, xpGain, 'ChakraControl');
            addXp(skills.academic.NinjutsuTheory, xpGain, 'NinjutsuTheory');

            addToNarrative(`You attend your mandatory Academy class. The lessons provide a sliver of broad experience.`, "system-message", 5000);
            updateUI();
        }
    }
}

/**
 * Main handler for free time training based on the character's directive.
 * 
 * @param {number} gameMinutesPassed - The number of game minutes that have passed this tick.
 */
export function handleDirectiveTraining(gameMinutesPassed) {
    const char = gameState.character;
    const directive = char.currentDirective;
    if (!directive) return;

    // --- NEW: Add affinity discovery check here ---
    checkForAffinityDiscovery(char, gameMinutesPassed);

    const baseXPPerMinute = 0.2; 
    const xpAmount = baseXPPerMinute * gameMinutesPassed;

    if (directive.type === 'JUTSU') {
        const { jutsuName } = directive;
        const jutsu = char.skills.jutsu[jutsuName];
        const jutsuLibraryData = JUTSU_LIBRARY[jutsuName];

        if (jutsu && jutsuLibraryData) {
            const theoryBonus = 1 + (char.skills.academic.NinjutsuTheory.level * 0.02);
            let xpMultiplier = theoryBonus;
            
            const element = jutsuLibraryData.tags.element;
            if (element !== 'Non-Elemental' && ELEMENTS.includes(element)) {
                const schoolSkillName = 'Ninjutsu' + element;
                const elementalSchool = char.skills.chakra[schoolSkillName];
                
                if (elementalSchool) {
                    const schoolBonus = 1 + (elementalSchool.level * 0.05);
                    xpMultiplier *= schoolBonus;
                }
            }
            
            const finalXpAmount = xpAmount * xpMultiplier;

            addXp(jutsu, finalXpAmount, jutsuName);
            addXp(char.skills.chakra.ChakraControl, finalXpAmount * 0.25, 'ChakraControl');
            addXp(char.skills.chakra.HandSealSpeed, finalXpAmount * 0.15, 'HandSealSpeed');
            addXp(char.skills.chakra.FormTransformation, finalXpAmount * 0.20, 'FormTransformation');
            
            const keywords = jutsuLibraryData.tags.keywords || [];
            if (element !== 'Non-Elemental' && ELEMENTS.includes(element)) {
                const schoolSkillName = 'Ninjutsu' + element;
                const elementalSchool = char.skills.chakra[schoolSkillName];
                if (elementalSchool) {
                    addXp(elementalSchool, finalXpAmount * 0.10, schoolSkillName);
                    addXp(char.skills.chakra.NatureTransformation, finalXpAmount * 0.15, 'NatureTransformation');
                }
            } else if (keywords.includes('Genjutsu')) {
                addXp(char.skills.chakra.Genjutsu, finalXpAmount * 0.20, 'Genjutsu');
            }
        }
        return;
    }

    if (directive.type === 'SKILL') {
        const directiveData = TRAINING_DIRECTIVES[directive.skillName];
        if (!directiveData) {
            console.warn(`No training data found for directive: ${directive.skillName}`);
            return;
        }
    
        const statGain = 0.00005 * gameMinutesPassed;
    
        for (const skillName in directiveData.xp) {
            const multiplier = directiveData.xp[skillName];
            const skillGroup = Object.keys(char.skills).find(group => char.skills[group]?.[skillName]);
            if (skillGroup) {
                addXp(char.skills[skillGroup][skillName], xpAmount * multiplier, skillName);
            }
        }
    
        for (const stat in directiveData.stats) {
            const multiplier = directiveData.stats[stat];
            if (char.baseStats[stat] !== undefined) {
                char.baseStats[stat] += statGain * multiplier;
            }
        }
    
        if (directive.skillName === 'Elemental Training') {
            if (char.affinityDiscovered && char.chakraAffinity.elements.length > 0) {
                const numElements = char.chakraAffinity.elements.length;
                const splitXpAmount = xpAmount / numElements; 
    
                for (const element of char.chakraAffinity.elements) {
                    const schoolSkillName = 'Ninjutsu' + element;
                    const skill = char.skills.chakra[schoolSkillName];
                    if (skill) {
                        addXp(skill, splitXpAmount, schoolSkillName);
                    }
                }
            }
        }
    }
}

function triggerDirectiveNarrativeEvent() {
    const char = gameState.character;
    const directive = char.currentDirective;
    if (!directive) return;

    let eventPool;

    //  Select event pool based on rank and directive
     if (directive.type === 'SKILL') {
        switch (directive.skillName) {
            // Academy / Individual Training
            case 'Practice Taijutsu':
                eventPool = (char.currentRank === 'Genin') ? GENIN_TAIJUTSU_EVENTS : ACADEMY_TAIJUTSU_EVENTS;
                break;
            case 'Practice Shurikenjutsu':
                eventPool = (char.currentRank === 'Genin') ? GENIN_SHURIKENJUTSU_EVENTS : ACADEMY_SHURIKENJUTSU_EVENTS;
                break;
            case 'Practice Chakra Control':
                eventPool = (char.currentRank === 'Genin') ? GENIN_CHAKRA_CONTROL_EVENTS : ACADEMY_CHAKRA_CONTROL_EVENTS;
                break;
            case 'Academic Study':
                eventPool = ACADEMY_STUDY_EVENTS;
                break;

            // Genin-only Team/Specialist Training
            case 'Team Sparring':
                eventPool = TEAM_SPARRING_EVENTS;
                break;
            case 'Formation Drills':
                eventPool = FORMATION_DRILL_EVENTS;
                break;
            case 'Build Bonds':
                eventPool = BUILD_BONDS_EVENTS;
                break;
            case 'Elemental Training':
                eventPool = ELEMENTAL_TRAINING_EVENTS;
                break;
            case 'Advanced Jutsu Research':
                eventPool = ADVANCED_JUTSU_RESEARCH_EVENTS;
                break;
        }
    } else if (directive.type === 'JUTSU') {
        eventPool = JUTSU_LEARNING_EVENTS;
    }

    if (!eventPool || eventPool.length === 0) return;

    const event = eventPool[Math.floor(Math.random() * eventPool.length)];
    let chosenOutcome = event.outcomes.find(o => o.condition(char))?.result || event.outcomes[event.outcomes.length - 1].result;

    if (chosenOutcome) {
        addToNarrative(`**${event.name}:** ${event.message}`, "event-message", 1000);
        
        const narrativeText = typeof chosenOutcome.narrative === 'function' ? chosenOutcome.narrative(char) : chosenOutcome.narrative;
        addToNarrative(narrativeText, chosenOutcome.cssClass || "system-message", 500);
        
        if (chosenOutcome.statChanges) {
            for (const stat in chosenOutcome.statChanges) {
                if (char.baseStats[stat] !== undefined) {
                    char.baseStats[stat] += chosenOutcome.statChanges[stat];
                }
            }
        }
        if (chosenOutcome.statChanges?.morale) char.morale = Math.max(0, Math.min(100, char.morale + chosenOutcome.statChanges.morale));
        if (chosenOutcome.statChanges?.health) char.health = Math.max(0, Math.min(char.maxHealth, char.health + chosenOutcome.statChanges.health));
        if (chosenOutcome.statChanges?.chakra) char.chakra = Math.max(0, Math.min(char.maxChakra, char.chakra + chosenOutcome.statChanges.chakra));
        
        if (chosenOutcome.xpGain) {
            const { group, skill, amount } = chosenOutcome.xpGain;
            if (char.skills[group] && char.skills[group][skill]) {
                addXp(char.skills[group][skill], amount, skill);
            }
        }

        recalculateVitals();
        updateUI(); 
    }
}

/**
 * A low-chance check to see if the character discovers a new Jutsu
 * through their current training directive.
 * @returns {boolean} - True if a discovery event was triggered, false otherwise.
 */
function checkForJutsuDiscovery() {
    const JUTSU_DISCOVERY_CHANCE = 0.03; // 3% chance on a day that an event fires
    if (Math.random() > JUTSU_DISCOVERY_CHANCE) {
        return false;
    }

    const char = gameState.character;
    const directive = char.currentDirective;
    if (!directive || directive.type !== 'SKILL') {
        return false;
    }

    let discoveryContext = null;
    // Define which directives can lead to which kind of discovery
    if (['Team Sparring', 'Formation Drills'].includes(directive.skillName)) {
        discoveryContext = 'SenseiTeaching';
    } else if (directive.skillName === 'Advanced Jutsu Research') {
        discoveryContext = 'ScrollResearch';
    }

    if (discoveryContext) {
        const discoveryEvent = JUTSU_DISCOVERY_EVENTS[0]; // There's only one for now
        const outcome = discoveryEvent.resolve(char, discoveryContext);

        if (outcome) {
            addToNarrative(`**${discoveryEvent.name}:**`, "event-message", 1000);
            addToNarrative(outcome.narrative, outcome.cssClass || "system-message", 500);

            if (outcome.isJutsuDiscovery && outcome.jutsuNameToUnlock) {
                if (unlockJutsu(char, outcome.jutsuNameToUnlock)) {
                    updateUI(); // Update Jutsu tab immediately
                }
            }
            if (outcome.xpGain) {
                const { group, skill, amount } = outcome.xpGain;
                addXp(char.skills[group][skill], amount, skill);
            }
            if (outcome.moraleChange) {
                char.morale = Math.min(100, Math.max(0, char.morale + outcome.moraleChange));
            }
            
            recalculateVitals();
            updateUI();
            return true; // A discovery event happened
        }
    }

    return false; // No discovery event was triggered
}

export function handleDowntimeDailyCycle() {
    const char = gameState.character;
    
    if (char.currentRank === 'Academy Student') {
        handleMandatoryAcademyClasses();
        handleAcademyMilestone();
    }

    // Add KG check for academy students and Genin
    checkForSpontaneousKGAwakening(char);

    // DAILY NARRATIVE EVENT CHANCE
    if (Math.random() < 0.25) { 
       // Attempt a rare Jutsu discovery first. If it succeeds, it returns true and we skip the normal event.
       // If it fails (returns false), we proceed to trigger a regular narrative event.
       if (!checkForJutsuDiscovery()) {
           triggerDirectiveNarrativeEvent();
       }
    }
}