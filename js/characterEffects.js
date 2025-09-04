// characterEffects.js - Manages the application and processing of injuries and status effects.

import { INJURY_POOL, STATUS_EFFECT_POOL } from './constants.js';
import { addToNarrative, updateUI } from './ui.js';
import { recalculateVitals } from './character.js';

/**
 * The main processing function called every game tick.
 * @param {object} character - The character object.
 * @param {number} minutesPassed - The number of game minutes that have passed.
 */
export async function processActiveEffects(character, minutesPassed) {
    let effectsChanged = false;

    const healingMultiplier = (character.currentActivity === 'Resting') ? 2.5 : 1.0;

    // Process Injuries
    for (let i = character.injuries.length - 1; i >= 0; i--) {
        const injury = character.injuries[i];
        if (injury.durationInMinutes > 0) {
            let effectiveMinutes = minutesPassed;
            if (injury.severity === 'Minor') {
                effectiveMinutes *= healingMultiplier;
            }

            injury.durationInMinutes -= effectiveMinutes;

            if (injury.durationInMinutes <= 0) {
                const healedInjury = character.injuries.splice(i, 1)[0]; // Get the injury we just healed
                effectsChanged = true;
                addToNarrative(`Your injury has healed: **${healedInjury.name}**.`, 'skill-gain-message');

                // Check if the character should no longer be incapacitated.
                if (character.currentActivity === 'Incapacitated' && healedInjury.causesIncapacitation) {
                    // Check if there are ANY OTHER incapacitating injuries left.
                    const hasOtherIncapacitatingInjuries = character.injuries.some(inj => inj.causesIncapacitation);
                    
                    if (!hasOtherIncapacitatingInjuries) {
                        character.currentActivity = 'Downtime';
                        addToNarrative("You feel well enough to resume your duties.", "system-message success");
                        const { showVillageMenu } = await import('./ui.js');
                        showVillageMenu();
                    }
                }
            }
        }
    }

    // Process Status Effects (Code is unchanged, but included for completeness)
    let appliedPerTickEffects = false;
    for (let i = character.statusEffects.length - 1; i >= 0; i--) {
        const status = character.statusEffects[i];
        if (status.durationInMinutes > 0) {
            status.durationInMinutes -= minutesPassed;
            
            for (const effect of status.effects) {
                if (effect.type === 'VITAL_DEGEN') {
                    const vital = effect.vital;
                    if (character[vital] !== undefined) {
                         character[vital] += effect.amountPerMinute * minutesPassed;
                         appliedPerTickEffects = true;
                    }
                }
            }
            if (status.durationInMinutes <= 0) {
                addToNarrative(`The status effect has worn off: **${status.name}**.`, 'system-message');
                character.statusEffects.splice(i, 1);
                effectsChanged = true;
            }
        }
    }

    if (effectsChanged || appliedPerTickEffects) {
        recalculateCurrentStats(character);
        recalculateVitals();
    }
}

/**
 * Recalculates the character's currentStats based on baseStats and all active modifiers.
 * @param {object} character - The character object.
 */
export function recalculateCurrentStats(character) {
    // Start with a clean copy of base stats
    character.currentStats = { ...character.baseStats };

    const allConditions = [...character.injuries, ...character.statusEffects];

    for (const condition of allConditions) {
        for (const effect of condition.effects) {
            if (effect.type === 'STAT_MOD_PERCENT') {
                const stat = effect.stat;
                const baseValue = character.baseStats[stat];
                if (baseValue !== undefined) {
                    character.currentStats[stat] += baseValue * effect.modifier;
                    character.currentStats[stat] = Math.max(1, character.currentStats[stat]);
                }
            }
            // Add other effect types here in the future
            if (effect.type === 'VITAL_MOD_PERCENT') {
                 const vital = effect.vital; // e.g., 'maxChakra'
                 if (character[vital] !== undefined) {
                    character[vital] += character[vital] * effect.modifier;
                 }
            }
        }
    }

    for (const stat in character.currentStats) {
        character.currentStats[stat] = parseFloat(character.currentStats[stat].toFixed(1));
    }
}


/**
 * Applies a new injury to the character.
 * @param {string} injuryId - The ID of the injury from INJURY_POOL.
 */
export function applyInjury(injuryId) {
    const character = gameState.character;
    const injuryData = INJURY_POOL[injuryId];

    if (!injuryData) {
        console.error(`Attempted to apply non-existent injury: ${injuryId}`);
        return;
    }

    if (injuryData.durationInMinutes === -1 && character.injuries.some(inj => inj.id === injuryId)) {
        return;
    }
    
    const injuryInstance = { ...JSON.parse(JSON.stringify(injuryData)), id: injuryId };

    character.injuries.push(injuryInstance);
    addToNarrative(`You have sustained an injury: **${injuryData.name}**!`, 'system-message error');

    for (const effect of injuryData.effects) {
        if (effect.type === 'APPLY_STATUS') {
            applyStatusEffect(effect.statusId);
        }
    }

    // *** THE FIX ***
    // If the injury is incapacitating, this module is now responsible for setting the state.
    if (injuryData.causesIncapacitation) {
        character.currentActivity = 'Incapacitated';
    }

    // Recalculate and update UI immediately for player feedback
    recalculateCurrentStats(character);
    recalculateVitals();
    updateUI();
}

/**
 * Applies a new status effect to the character.
 * @param {string} statusId - The ID of the status from STATUS_EFFECT_POOL.
 */
export function applyStatusEffect(statusId) {
    const character = gameState.character;
    const statusData = STATUS_EFFECT_POOL[statusId];

    if (!statusData) {
        console.error(`Attempted to apply non-existent status effect: ${statusId}`);
        return;
    }
    
    const existingStatus = character.statusEffects.find(stat => stat.id === statusId);
    if (existingStatus) {
        existingStatus.durationInMinutes = Math.max(existingStatus.durationInMinutes, statusData.durationInMinutes);
        return;
    }
    
    const statusInstance = { ...JSON.parse(JSON.stringify(statusData)), id: statusId };

    character.statusEffects.push(statusInstance);
    addToNarrative(`You are afflicted with: **${statusData.name}**.`, 'system-message warning');
    
    // Recalculate and update UI immediately for player feedback
    recalculateCurrentStats(character);
    recalculateVitals();
    updateUI();
}