// character.js - Character generation logic for Shinobi's Vow

import { 
    villageNames, 
    FAMILY_BACKGROUNDS, 
    KEKKEI_GENKAI_POOL,
    AFFINITY_TYPES,
    ELEMENTS,
    AFFINITY_STRENGTHS,
    TRAIT_POOL,
    JONIN_SENSEI_ARCHETYPES,
    GENIN_TEAMMATE_ARCHETYPES
} from './constants.js';

/**
 * [KEPT FOR OTHER USES] Generates a random stat using a normal distribution.
 * No longer used for initial character stat generation, but may be useful for events.
 */
function generateRandomStat(mean, stdDev, min = 1, max = 10) {
    let sum = 0;
    const numRolls = 5;
    for (let i = 0; i < numRolls; i++) {
        sum += Math.random();
    }
    const stat = (sum / numRolls) * (2 * stdDev) + (mean - stdDev);
    return Math.max(min, Math.min(max, parseFloat(stat.toFixed(1))));
}

/**
 * REWORKED: Now determines background first and returns the full background object.
 */
function generateFamilyBackground() {
    let chosenBackground = FAMILY_BACKGROUNDS[0]; // Default
    let adjustedBackgrounds = FAMILY_BACKGROUNDS.map(bg => ({ ...bg }));
    
    let totalChance = adjustedBackgrounds.reduce((sum, bg) => sum + bg.chance, 0);
    let randBG = Math.random() * totalChance;
    let currentWeight = 0;
    for (const bg of adjustedBackgrounds) {
        currentWeight += bg.chance;
        if (randBG < currentWeight) {
            chosenBackground = bg;
            break;
        }
    }
    return chosenBackground;
}


// Separate function to generate a potential Kekkei Genkai
function generateKekkeiGenkai(background) {
    const baseChance = background.kgModifier || 0;
    if (Math.random() < baseChance) {
        const kg = KEKKEI_GENKAI_POOL[Math.floor(Math.random() * KEKKEI_GENKAI_POOL.length)];
        return {
            name: kg.name,
            elements: kg.elements,
            awakened: false 
        };
    }
    return null; // No Kekkei Genkai
}

/**
 * Orchestrates the full creation of a new shinobi character using the new "Stat Potential" system.
 */
export function generateNewShinobi() {
    const char = gameState.character;
    
    let villageWeightedChances = {};
    let totalWeight = 0;
    villageNames.forEach(v => {
        let baseChance = 1.0 / villageNames.length;
        let adjustedChance = baseChance + (gameState.meta.villageChances[v] || 0);
        villageWeightedChances[v] = adjustedChance;
        totalWeight += adjustedChance;
    });
    let rand = Math.random() * totalWeight;
    let currentWeight = 0;
    for (const v of villageNames) {
        currentWeight += villageWeightedChances[v];
        if (rand < currentWeight) {
            char.village = v;
            break;
        }
    }

    char.traits = generateInheritedTraits();
    const background = generateFamilyBackground();
    char.familyBackground = background.name;
    char.kekkeiGenkai = generateKekkeiGenkai(background);

    const statRanges = {
        "Legendary Heritage": { min: 90, max: 110 },
        "Established Ninja Clan": { min: 65, max: 80 },
        "Minor Ninja Family": { min: 50, max: 65 },
        "Civilian Family": { min: 35, max: 50 }
    };

    const range = statRanges[char.familyBackground];
    const totalStatPool = Math.random() * (range.max - range.min) + range.min;
    
    const statNames = Object.keys(char.baseStats);
    statNames.forEach(statName => {
        char.baseStats[statName] = 1.0;
    });

    let pointsToDistribute = totalStatPool - statNames.length;
    while (pointsToDistribute > 0) {
        const randomStat = statNames[Math.floor(Math.random() * statNames.length)];
        const increment = 0.1;
        char.baseStats[randomStat] += increment;
        pointsToDistribute -= increment;
    }

    statNames.forEach(statName => {
        char.baseStats[statName] = parseFloat(char.baseStats[statName].toFixed(1));
    });

    // Initialize currentStats as a copy of baseStats
    char.currentStats = { ...char.baseStats };

    char.chakraAffinity = generateChakraAffinities();
    char.affinityDiscovered = false; 
    
    recalculateVitals();
    char.name = `Child of ${char.village}`;
}

/**
 * NEW: Generates a Genin team for the player upon graduation.
 */
export function generateGeninTeam(character) {
    const availableSensei = [...JONIN_SENSEI_ARCHETYPES];
    const senseiIndex = Math.floor(Math.random() * availableSensei.length);
    const sensei = availableSensei.splice(senseiIndex, 1)[0];

    const availableTeammates = [...GENIN_TEAMMATE_ARCHETYPES];
    const teammates = [];
    
    const teammate1Index = Math.floor(Math.random() * availableTeammates.length);
    teammates.push(availableTeammates.splice(teammate1Index, 1)[0]);
    
    const teammate2Index = Math.floor(Math.random() * availableTeammates.length);
    teammates.push(availableTeammates.splice(teammate2Index, 1)[0]);

    return {
        sensei: { name: sensei.name, personality: sensei.personality },
        teammates: [
            { name: teammates[0].name, personality: teammates[0].personality },
            { name: teammates[1].name, personality: teammates[1].personality }
        ]
    };
}


function generateChakraAffinities() {
    let result = { type: "None", elements: [], strength: null };
    let totalChance = AFFINITY_TYPES.reduce((sum, t) => sum + t.chance, 0);
    
    let adjustedAffinityTypes = AFFINITY_TYPES.map(a => ({
        ...a,
        chance: a.chance + (gameState.meta.affinityTypeChances?.[a.type] || 0)
    }));
    totalChance = adjustedAffinityTypes.reduce((sum, t) => sum + t.chance, 0);

    let randType = Math.random() * totalChance;
    let currentTypeWeight = 0;
    let selectedType = "None";
    for (const typeInfo of adjustedAffinityTypes) {
        currentTypeWeight += typeInfo.chance;
        if (randType < currentTypeWeight) {
            selectedType = typeInfo.type;
            break;
        }
    }
    result.type = selectedType;

    if (selectedType === "Single" || selectedType === "Dual") {
        let availableElements = [...ELEMENTS];
        let elementWeightedChances = {};
        let totalElementWeight = 0;
        availableElements.forEach(el => {
            let baseElementChance = 1.0 / availableElements.length;
            let adjustedElementChance = baseElementChance + (gameState.meta.affinityChances[el] || 0);
            elementWeightedChances[el] = adjustedElementChance;
            totalElementWeight += adjustedElementChance;
        });

        const selectElement = () => {
            let elementRand = Math.random() * totalElementWeight;
            let currentElementWeight = 0;
            for (const el of availableElements) {
                currentElementWeight += elementWeightedChances[el];
                if (elementRand < currentElementWeight) return el;
            }
            return availableElements[0];
        };

        result.elements.push(selectElement());
        if (selectedType === "Dual") {
            availableElements = availableElements.filter(el => el !== result.elements[0]);
            totalElementWeight = 0;
            for (const el of availableElements) totalElementWeight += elementWeightedChances[el];
            if (availableElements.length > 0) result.elements.push(selectElement());
        }
        result.strength = AFFINITY_STRENGTHS[Math.floor(Math.random() * AFFINITY_STRENGTHS.length)];
    } 
    return result;
}

function generateInheritedTraits() {
    const selectedTraits = [];
    const numTraits = Math.random() < 0.3 ? 2 : 1;
    let availableTraits = [...TRAIT_POOL];

    availableTraits.forEach(trait => {
        if (trait.metaUnlockable && gameState.meta.traitChances[trait.name]) {
            trait.chance += gameState.meta.traitChances[trait.name];
        }
    });

    for (let i = 0; i < numTraits; i++) {
        let totalTraitChance = availableTraits.reduce((sum, t) => sum + t.chance, 0);
        if (totalTraitChance === 0) break;
        let randTrait = Math.random() * totalTraitChance;
        let currentTraitWeight = 0;
        let chosenTrait = null;
        for (const trait of availableTraits) {
            currentTraitWeight += trait.chance;
            if (randTrait < currentTraitWeight) {
                chosenTrait = trait;
                break;
            }
        }
        if (chosenTrait) {
            selectedTraits.push(chosenTrait);
            availableTraits = availableTraits.filter(t => t.name !== chosenTrait.name);
        }
    }
    return selectedTraits;
}

export function recalculateVitals() {
    const char = gameState.character;
    const stats = char.currentStats;

    const oldMaxHealth = char.maxHealth;
    const oldMaxChakra = char.maxChakra;
    const oldMaxStamina = char.maxStamina; 

    const newMaxHealth = (stats.stamina * 10) + (stats.strength * 2.5) + 50;
    const newMaxChakra = (stats.chakraPool * 10) + (stats.willpower * 2.5) + 50;
    const newMaxStamina = (stats.stamina * 5) + (stats.agility * 2.5) + 50; // *** NEW FORMULA ***

    char.maxHealth = newMaxHealth;
    char.maxChakra = newMaxChakra;
    char.maxStamina = newMaxStamina; 

    if (newMaxHealth > oldMaxHealth) {
        char.health += (newMaxHealth - oldMaxHealth);
    }
    if (newMaxChakra > oldMaxChakra) {
        char.chakra += (newMaxChakra - oldMaxChakra);
    }
    if (newMaxStamina > oldMaxStamina) { 
        char.stamina += (newMaxStamina - oldMaxStamina);
    }

    char.health = Math.min(char.health, char.maxHealth);
    char.chakra = Math.min(char.chakra, char.maxChakra);
    char.stamina = Math.min(char.stamina, char.maxStamina); 
}

/**
 * Gets the value of a character's skill or stat by its name.
 * Handles both skills (returning level) and stats (returning value).
 * @param {object} character - The character object from gameState.
 * @param {string} skillOrStatName - The name of the skill (e.g., 'Taijutsu') or stat (e.g., 'agility').
 * @returns {number} The level of the skill or value of the stat, or 0 if not found.
 */
export function getCharacterSkillValue(character, skillOrStatName) {
    // Check stats first (case-insensitive for robustness)
    const statName = skillOrStatName.toLowerCase();
    // *** Use currentStats ***
    if (character.currentStats[statName] !== undefined) {
        return character.currentStats[statName];
    }

    // Check skills
    for (const category in character.skills) {
        if (character.skills[category][skillOrStatName]) {
            return character.skills[category][skillOrStatName].level;
        }
    }
    
    console.warn(`Could not find skill or stat named: ${skillOrStatName}`);
    return 0;
}