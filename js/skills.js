// skills.js - Skill system management for Shinobi's Vow

import { SKILL_DEFINITIONS, SKILL_CATEGORY_COSTS, SKILL_LEVEL_UP_NARRATIVES } from './constants.js';
import { addToNarrative } from './ui.js';

export const calculateXpToNext = (baseXp, level) => {
    return Math.floor(baseXp * Math.pow(level + 1, 1.8));
};

// In skills.js

export function initializeSkills(character) {
    if (character.skills) {
        console.warn("Character already has skills initialized. Aborting.");
        return;
    }

    character.skills = {}; 

    for (const categoryKey in SKILL_DEFINITIONS) {
        character.skills[categoryKey] = {};
        for (const skillName in SKILL_DEFINITIONS[categoryKey]) {
            const skillDef = SKILL_DEFINITIONS[categoryKey][skillName];
            const baseCost = SKILL_CATEGORY_COSTS[skillDef.category];

            character.skills[categoryKey][skillName] = {
                level: 0,
                xp: 0,
                xpToNext: calculateXpToNext(baseCost, 0),
                baseCost: baseCost 
            };
        }
    }

    // --- Grant the three learnable Academy Jutsu ---
    const academyJutsu = ['Transformation Jutsu', 'Substitution Jutsu', 'Clone Jutsu'];
    academyJutsu.forEach(jutsuName => {
        if (!character.skills.jutsu[jutsuName]) {
             const baseCost = SKILL_CATEGORY_COSTS.jutsu;
             character.skills.jutsu[jutsuName] = {
                level: 0, // Start as unlearned
                xp: 0,
                xpToNext: calculateXpToNext(baseCost, 0),
                baseCost: baseCost
             };
        }
    });
    
    console.log("Character skills initialized. Academy Jutsu granted.");
}

export function addXp(skill, amount, skillName) {
    if (!skill) {
        console.error("Attempted to add XP to a null skill: " + skillName);
        return false;
    }

    const aptitudes = gameState.character.aptitudes;
    const aptitudeBonus = skillName ? (aptitudes[skillName] || 0) : 0;
    const finalAmount = amount * (1 + aptitudeBonus);
    skill.xp += finalAmount;
    let leveledUp = false;

    let baseCost = skill.baseCost; 
    if (baseCost === undefined) {
        console.error(`Skill ${skillName} is missing a baseCost property. XP calculation may be incorrect.`);
        baseCost = 1000; 
    }

    while (skill.xp >= skill.xpToNext) {
        const oldLevel = skill.level; // Keep track of the level before the increment
        skill.level++;
        skill.xp -= skill.xpToNext;
        skill.xpToNext = calculateXpToNext(baseCost, skill.level);
        leveledUp = true;

        // --- Narrative Level-Up Notification ---
        // Trigger on level 1, and every 5 levels thereafter.
        if (skillName && (skill.level === 1 || skill.level % 5 === 0)) {
            // Find the specific narrative, or use the default if one isn't defined.
            const narrative = SKILL_LEVEL_UP_NARRATIVES[skillName] || SKILL_LEVEL_UP_NARRATIVES.default;
            // Add the formatted message to the narrative log.
            addToNarrative(`You've reached a new plateau in your training. ${narrative}`, 'skill-gain-message');
        }
    }
    return leveledUp;
}