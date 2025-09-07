// combat.js - Overhauled with Information Warfare mechanics

import { updateUI, addToCombatLog, showVillageMenu } from './ui.js';
import { JUTSU_LIBRARY, INJURY_POOL, ACTION_NARRATIVES, ELEMENTS, ELEMENTAL_RELATIONSHIPS } from './constants.js';
import { checkInventory, removeItemFromInventory } from './inventory.js';
import { recalculateVitals } from './character.js';
import { addXp } from './skills.js';

let combatInterval = null;

let combatState = {
    isActive: false, combatants: [], tick: 0, range: 'Short', onCombatEndCallback: null,
};

/**
 * Gets a specific skill or stat value from a combatant object.
 * This is a combat-specific helper that can handle both player and NPC data structures.
 */
function getCombatantSkillValue(combatant, skillOrStatName) {
    // Check stats first
    if (combatant.source.currentStats && combatant.source.currentStats[skillOrStatName] !== undefined) {
        return combatant.source.currentStats[skillOrStatName];
    }
    // Check player skills
    if (combatant.isPlayer) {
        for (const category in combatant.source.skills) {
            if (combatant.source.skills[category][skillOrStatName]) {
                return combatant.source.skills[category][skillOrStatName].level;
            }
        }
    } 
    // Check NPC skills
    else if (combatant.skillLevels && combatant.skillLevels[skillOrStatName] !== undefined) {
        return combatant.skillLevels[skillOrStatName];
    }
    return 0; // Return 0 if not found
}

/**
 * Calculates a total score for a combatant based on a check definition.
 */
function calculateCheckScore(combatant, checkDefinition) {
    if (!checkDefinition || !checkDefinition.base) return 0;

    let totalScore = 0;
    for (const key of checkDefinition.base) {
        const [type, name] = key.split(':');
        totalScore += getCombatantSkillValue(combatant, name);
    }
    
    return totalScore * (checkDefinition.multiplier || 1.0);
}

// --- Core Combat Functions ---

export function startCombat(opponents, onEndCallback) {
    if (combatState.isActive) return;
    
    gameState.mode = 'Combat';

    combatState = {
        isActive: true, tick: 0, range: 'Long', combatants: [],
        battlefield: { tags: [] }, onCombatEndCallback: onEndCallback,
        jutsuHistory: [], 
    };

    const createCombatant = (source, isPlayer = false, oppData = {}) => {
        let preferredRange = 'Mid';
        if (oppData.aiProfile === 'Brawler') preferredRange = 'Engaged';
        if (oppData.aiProfile === 'Ninjutsu Specialist') preferredRange = 'Long';
        if (oppData.aiProfile === 'Assassin') preferredRange = 'Short';

        return {
            source, isPlayer,
            id: isPlayer ? 'player' : `opponent_${combatState.combatants.length}`,
            name: isPlayer ? source.name : oppData.name || source.name,
            health: isPlayer ? source.health : oppData.maxHealth || source.maxHealth,
            maxHealth: oppData.maxHealth || source.maxHealth,
            chakra: isPlayer ? source.chakra : oppData.maxChakra || source.maxChakra,
            stamina: isPlayer ? source.stamina : oppData.maxStamina || source.maxStamina,
            maxStamina: isPlayer ? source.maxStamina : oppData.maxStamina || source.maxStamina,
            knownJutsu: isPlayer ? Object.keys(source.skills.jutsu) : oppData.knownJutsu || [],
            skillLevels: isPlayer ? null : oppData.skillLevels || {},
            equipment: isPlayer ? null : oppData.equipment || {},
            skillUsage: {},
            tempFamiliarity: 0, 
            actionGauge: 0, posture: 'Guarded', tags: [], resolve: 75, aggression: 50, casting: null,
            recentActions: [],
            momentum: 0,
            preferredRange: isPlayer ? 'Mid' : preferredRange,
            ...oppData
        };
    };
    
    combatState.combatants.push(createCombatant(gameState.character, true));
    opponents.forEach(opp => combatState.combatants.push(createCombatant(opp.source || opp, false, opp)));

    addToCombatLog("--- COMBAT STARTS! ---", "event-message");
    combatInterval = setInterval(combatLoop, 1800);
}

const CombatPhases = {
    FEELING_OUT: 'feeling_out',
    ESCALATION: 'escalation',
    CLIMAX: 'climax',
    RESOLUTION: 'resolution'
};

function getCombatPhase(combatState) {
    const totalMaxHealth = combatState.combatants.reduce((sum, c) => sum + c.maxHealth, 0);
    const currentHealth = combatState.combatants.reduce((sum, c) => sum + c.health, 0);
    const healthPercent = currentHealth / totalMaxHealth;
    
    const ticksElapsed = combatState.tick;
    const highPowerJutsuUsed = combatState.jutsuHistory?.some(j => ['B', 'A', 'S'].includes(j.rank)) || false;
    
    if (healthPercent > 0.8 && ticksElapsed < 15) return CombatPhases.FEELING_OUT;
    if (healthPercent > 0.4 && !highPowerJutsuUsed) return CombatPhases.ESCALATION;
    if (healthPercent > 0.20) return CombatPhases.CLIMAX;
    return CombatPhases.RESOLUTION;
}

/**
 * Syncs the vitals from a combatant object back to the main gameState character object if it's the player.
 * @param {object} combatant - The combatant object from combatState.
 */
function updateSourceVitals(combatant) {
    if (combatant.isPlayer) {
        const playerChar = gameState.character;
        playerChar.health = combatant.health;
        playerChar.chakra = combatant.chakra;
        playerChar.stamina = combatant.stamina;
    }
}

function trackJutsuUsage(combatState, action) {
    if (!combatState.jutsuHistory) combatState.jutsuHistory = [];
    
    if (action.chakraCost > 0 || action.rank !== 'E') {
        combatState.jutsuHistory.push({
            name: action.name,
            rank: action.rank,
            tick: combatState.tick
        });
    }
}

function getPhaseAppropriateActions(allActions, phase) {
    switch (phase) {
        case CombatPhases.FEELING_OUT:
            return allActions.filter(a => 
                ['Strike', 'Guard', 'Create Distance', 'Dash', 'Throw Kunai', 'Analyze'].includes(a.name) ||
                (a.rank === 'E' || a.rank === 'D')
            );
            
        case CombatPhases.ESCALATION:
            return allActions.filter(a => 
                !['A', 'S'].includes(a.rank) || Math.random() < 0.2
            );
            
        case CombatPhases.CLIMAX:
            return allActions;
            
        case CombatPhases.RESOLUTION:
            const finishers = allActions.filter(a => 
                ['B', 'A', 'S'].includes(a.rank) || 
                a.tags.keywords?.includes('Powerful') ||
                a.basePower > 30
            );
            return finishers.length > 0 ? finishers : allActions;
            
        default:
            return allActions;
    }
}

function applyMomentumSystem(attacker, target, actionResult) {
    if (actionResult.hit) {
        attacker.momentum = (attacker.momentum || 0) + 1;
        target.momentum = Math.max(0, (target.momentum || 0) - 2); 

        if (attacker.momentum >= 3) {
            attacker.aggression = Math.min(100, attacker.aggression + 15);
            attacker.resolve = Math.min(100, attacker.resolve + 10);
            addToCombatLog(`**${attacker.name}** is building dangerous momentum, pressing the attack!`, 'event-message');
            attacker.momentum = 0;
        }
    } else {
        attacker.momentum = Math.max(0, (attacker.momentum || 0) - 1);
        if (actionResult.dodged) { // NEW: A successful dodge gives momentum to the defender
            target.momentum = (target.momentum || 0) + 1;
             if (target.momentum >= 3) {
                target.aggression = Math.min(100, target.aggression + 10);
                addToCombatLog(`**${target.name}**'s nimble evasion creates an opening!`, 'event-message');
                target.momentum = 0;
            }
        }
    }
}

function generateNarrativeAction(attacker, action, target) {
    const templates = ACTION_NARRATIVES[action.name] || ACTION_NARRATIVES.default;
    let selectedTemplates = [...templates];
      
    if (attacker.momentum >= 2) {
      selectedTemplates = templates.map(t => ({
          ...t,
          text: t.text.replace('launches', 'unleashes').replace('aims', 'decisively aims').replace('sends', 'hurls'),
          weight: t.weight * 1.5
      }));
    }
      
    const totalWeight = selectedTemplates.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
      
    for (const template of selectedTemplates) {
        random -= template.weight;
        if (random <= 0) {
            return template.text.replace(/{(\w+)}/g, (match, key) => {
                const vars = { attacker: attacker.name, target: target.name, action: action.name };
                return vars[key] || match;
            });
        }
    }
      
    return `**${attacker.name}** uses **${action.name}** against **${target.name}**!`;
}


function combatLoop() {
    if (!combatState.isActive) return;
    combatState.tick++;

    // --- Battlefield Tag Processing ---
    combatState.battlefield.tags = combatState.battlefield.tags.filter(tag => {
        tag.duration--;
        if (tag.duration <= 0) {
            addToCombatLog(`The **${tag.name}** dissipates.`, 'event-message');
            return false;
        }
        return true;
    });
    
    // --- Combatant Tag & Status Processing ---
    combatState.combatants.forEach(c => {
        c.tags = c.tags.filter(tag => {
            tag.duration--;
            if (tag.duration <= 0) {
                if (tag.name === 'Setup: Clones_Active') {
                     addToCombatLog(`**${c.name}**'s illusory clones dissipate.`, 'system-message');
                }
                if (tag.name === 'Grappled') {
                    addToCombatLog(`**${c.name}** breaks free from the grapple!`, 'event-message');
                }
                return false;
            }
            return true;
        });

        // Disguise check
        if (c.tags.some(t => t.name === 'Disguised')) {
            const opponent = combatState.combatants.find(opp => opp.id !== c.id && opp.health > 0);
            if (opponent) {
                const detectionChance = 0.05 + (opponent.source.currentStats.perception * 0.001);
                if (Math.random() < detectionChance) {
                    addToCombatLog(`**${opponent.name}**'s keen senses spot a flicker in the air, revealing **${c.name}**'s disguise!`, 'event-message');
                    c.tags = c.tags.filter(t => t.name !== 'Disguised');
                }
            }
        }
    });

    // --- End Condition Check ---
    const player = combatState.combatants.find(c => c.isPlayer);
    const activeOpponents = combatState.combatants.filter(c => !c.isPlayer && c.health > 0);
    if (player.health <= 0 || activeOpponents.length === 0) {
        endCombat(activeOpponents.length === 0);
        return;
    }

    // --- Action Gauge & Casting Processing ---
    let actorFound = false;
    for (const combatant of combatState.combatants) {
        if (combatant.health <= 0) continue;

        if (combatant.casting) {
            combatant.casting.ticksLeft--;
            if (combatant.casting.ticksLeft <= 0) {
                const { action, target } = combatant.casting;
                combatant.casting = null;
                executeAction(combatant, action, target, true);
                actorFound = true;
            } else {
                addToCombatLog(`**${combatant.name}** continues preparing their move...`, 'system-message');
            }
            break; 
        }
        const gaugeIncrease = (combatant.source.currentStats?.agility || 30) / 2;
        combatant.actionGauge += gaugeIncrease;
    }

    if (actorFound) return;
    
    // --- *** NEW GRAPPLE PREEMPTION LOGIC *** ---
    const grappledCombatant = combatState.combatants.find(c => c.tags.some(t => t.name === 'Grappled'));
    if (grappledCombatant) {
        const grappleTag = grappledCombatant.tags.find(t => t.name === 'Grappled');
        const grappler = combatState.combatants.find(c => c.id === grappleTag.casterId);

        // If grappler is dead or gone, the grapple breaks automatically
        if (!grappler || grappler.health <= 0) {
            grappledCombatant.tags = grappledCombatant.tags.filter(t => t.name !== 'Grappled');
        } else {
             // The grappled person gets priority to act if they can
            if (grappledCombatant.actionGauge >= 100) {
                grappledCombatant.actionGauge -= 100;
                executeAction(grappledCombatant, JUTSU_LIBRARY['Attempt to Escape Grapple'], grappler);
                return; // End this tick, only the grapple escape happens
            }
            // If the grappled person can't act, the grappler acts if they can
            else if (grappler.actionGauge >= 100) {
                grappler.actionGauge -= 100;
                const grappleAction = chooseGrappleAction(grappler, grappledCombatant);
                executeAction(grappler, grappleAction, grappledCombatant);
                return; // End this tick, only the grapple attack happens
            }
        }
    }
    // --- *** END NEW LOGIC *** ---

    // --- Standard Turn Logic (if no grapple preemption occurred) ---
    const readyCombatants = combatState.combatants
        .filter(c => 
            c.health > 0 && 
            c.actionGauge >= 100 && 
            !c.casting && 
            !c.tags.some(t => t.name === 'Airborne') &&
            !c.tags.some(t => t.name === 'Grappled') // Grappled combatants are handled above
        )
        .sort((a, b) => b.actionGauge - a.actionGauge);

    if (readyCombatants.length > 0) {
        const actor = readyCombatants[0];
        actor.actionGauge -= 100;
        const target = actor.isPlayer ? activeOpponents[0] : player;
        const action = chooseAction(actor, target);
        executeAction(actor, action, target);
    }
}


function chooseReaction(target, attacker, incomingAction) {
    const chakraPercent = target.chakra / target.maxChakra; // Correctly check against maxChakra

    // --- Priority 1: Check for smart, elemental defenses first ---
    const effectTag = incomingAction.tags.effect;
    const incomingElement = incomingAction.tags.element;
    const isProjectileOrAoE = (effectTag === 'Projectile' || effectTag === 'AoE' || effectTag === 'MultiProjectile' || effectTag === 'LineAoE');
    
    if (isProjectileOrAoE && incomingElement) {
        const defensiveJutsu = target.knownJutsu
            .map(name => JUTSU_LIBRARY[name])
            .filter(jutsu => jutsu && jutsu.type === 'Defensive' && jutsu.name !== 'Guard' && getActionIfUsable(target, jutsu.name));
        
        if (defensiveJutsu.length > 0) {
            const advantageousJutsu = defensiveJutsu.find(defJutsu => 
                ELEMENTAL_RELATIONSHIPS[defJutsu.tags.element] === incomingElement
            );

            // An advantageous counter is almost always the right move if affordable
            if (advantageousJutsu && chakraPercent > (advantageousJutsu.chakraCost / target.maxChakra + 0.1) && Math.random() < 0.95) {
                addToCombatLog(`**${target.name}** sees an elemental opening and prepares a perfect counter!`, 'system-message success');
                return advantageousJutsu;
            }

            // A generic defensive wall is a solid, but less preferred, option
            if (Math.random() < 0.50) {
                const chosenDefense = defensiveJutsu[Math.floor(Math.random() * defensiveJutsu.length)];
                 if (chakraPercent > (chosenDefense.chakraCost / target.maxChakra + 0.15)) { // Be a bit more cautious with non-optimal walls
                    addToCombatLog(`**${target.name}** reacts to the incoming jutsu with a defensive technique!`, 'system-message success');
                    return chosenDefense;
                }
            }
        }
    }
    
    // --- Priority 2: Consider Substitution as a last resort for powerful attacks ---
    const isThreatening = incomingAction.basePower >= 20 || ['D', 'C', 'B', 'A', 'S'].includes(incomingAction.rank);
    if (isThreatening) {
        const canSubstitute = getActionIfUsable(target, 'Substitution Jutsu');
        if (canSubstitute) {
            const rankChance = { 'D': 0.15, 'C': 0.50, 'B': 0.75, 'A': 0.90, 'S': 1.0 }[incomingAction.rank] || 0.10;
            
            // AI is increasingly unwilling to substitute as its chakra drops below 80%
            const chakraModifier = Math.max(0, (chakraPercent - 0.2) / 0.8);
            const finalChance = rankChance * chakraModifier;

            if (Math.random() < finalChance) {
                addToCombatLog(`Seeing the power of the incoming attack, **${target.name}** prepares to substitute!`, 'system-message success');
                return JUTSU_LIBRARY['Substitution Jutsu'];
            }
        }
    }

    return null; // If no smart reaction is found, take the hit.
}

/**
 * A simplified action choice for a combatant who is actively grappling a target.
 * They should only be focused on attacking or maintaining the grapple.
 */
function chooseGrappleAction(attacker, target) {
    // The ultimate grapple punishment: Kunai Stab.
    const canUseKunaiStab = getActionIfUsable(attacker, 'Kunai Stab');
    if (canUseKunaiStab) {
        return canUseKunaiStab;
    }

    // If no kunai is available, fall back to a powerful unarmed strike.
    const canUseHeavyStrike = getActionIfUsable(attacker, 'Heavy Strike');
    if (canUseHeavyStrike) {
        return canUseHeavyStrike;
    }
    
    // Default to a basic Strike if nothing else is available.
    return JUTSU_LIBRARY['Strike'];
}

function getDesperationBonus(combatant) {
    const healthPercent = combatant.health / combatant.maxHealth;
    
    if (healthPercent < 0.15) {
        if (!combatant.tags.some(t => t.name === 'Cornered')) {
            addToCombatLog(`**${combatant.name}** is on their last legs, fighting with the ferocity of a cornered beast!`, 'event-message');
            combatant.tags.push({ name: 'Cornered', duration: 999 });
        }
        return { aggression: 30, damageMultiplier: 1.40, ignoreGuardChance: 0.8 };
    }
    if (healthPercent < 0.30) {
        if (!combatant.tags.some(t => t.name === 'Critical')) {
            addToCombatLog(`Critically wounded, **${combatant.name}**'s attacks become dangerously unpredictable!`, 'event-message');
            combatant.tags.push({ name: 'Critical', duration: 999 });
        }
        return { aggression: 20, damageMultiplier: 1.25, ignoreGuardChance: 0.7 };
    }
    if (healthPercent < 0.50) {
         if (!combatant.tags.some(t => t.name === 'Wounded')) {
            addToCombatLog(`Wounded and angered, **${combatant.name}** presses the attack!`, 'event-message');
            combatant.tags.push({ name: 'Wounded', duration: 999 });
        }
        return { aggression: 10, damageMultiplier: 1.10, ignoreGuardChance: 0.3 };
    }
    
    return { aggression: 0, damageMultiplier: 1.0, ignoreGuardChance: 0.0 };
}

function shouldConsiderGuard(combatant) {
    const staminaPercent = combatant.stamina / combatant.maxStamina;
    
    if (staminaPercent >= 0.40) {
        return false;
    }

    let guardProbability = 0.50;
    const recentGuards = combatant.recentActions.filter(a => a === 'Guard').length;
    guardProbability -= (recentGuards * 0.25);
    
    const desperation = getDesperationBonus(combatant);
    if (Math.random() < desperation.ignoreGuardChance) {
        return false;
    }
    
    return Math.random() < Math.max(0, guardProbability);
}


function determineStance(combatant) {
    const desperation = getDesperationBonus(combatant);
    const effectiveAggression = combatant.aggression + desperation.aggression;
    
    const finalAggression = Math.max(20, effectiveAggression);
    
    if (combatant.resolve > 60 && finalAggression > 65) return 'Aggressive';
    if (combatant.resolve < 40 && finalAggression < 45) return 'Defensive';
    return 'Balanced';
}

function chooseAction(combatant, target) {
    debugCombatState(); 

    if (shouldConsiderGuard(combatant)) {
        console.log(`${combatant.name} chooses to Guard for stamina recovery.`);
        return JUTSU_LIBRARY['Guard'];
    }
    
    const phase = getCombatPhase(combatState);

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap', 'Taijutsu: Takedown', 'Shadow Shuriken Jutsu', 'Analyze', 'Struggle', 'Kunai Stab'];
    const knownAbilities = new Set([...innateAbilities, ...combatant.knownJutsu]);
    
    const allUsableActions = Array.from(knownAbilities)
        .map(name => JUTSU_LIBRARY[name])
        .filter(action => 
            action && 
            getActionIfUsable(combatant, action.name) && 
            !action.tags.keywords?.includes('Reaction-Only')
        );

    const usableActions = getPhaseAppropriateActions(allUsableActions, phase);

    if (usableActions.length === 0) {
        console.log(`${combatant.name} is exhausted and has no usable actions, defaulting to Struggle.`);
        return JUTSU_LIBRARY['Struggle'];
    }

    const scoredActions = usableActions.map(action => {
        let score = 10;
        const desperation = getDesperationBonus(combatant);
        const intellect = combatant.source.currentStats.intellect;

        if (combatant.aiProfile === 'Brawler') {
            if (action.tags.category === 'Taijutsu') score *= 2.5;
            else if (action.tags.category === 'Ninjutsu' || action.tags.category === 'Genjutsu') score *= 0.05;
            else if (action.tags.category === 'Tool') score *= 0.5;
        } else if (combatant.aiProfile === 'Ninjutsu Specialist') {
             if (action.tags.category === 'Ninjutsu') score *= 3.0;
             else if (action.tags.category === 'Taijutsu') score *= 0.2;
        } else if (combatant.aiProfile === 'Assassin') {
             if (action.tags.effect === 'Deception' || action.tags.keywords?.includes('Deceptive')) score *= 4.0;
             if (action.tags.category === 'Tool') score *= 2.0;
             if (action.type === 'Offensive') score *= 1.5;
        }


        if (action.name === 'Analyze') {
            if (combatant.tags.some(t => t.name === `Analysis_Complete_${target.id}`)) {
                score *= 0.01; // Heavily penalize re-analyzing
            } else if (phase === CombatPhases.FEELING_OUT && intellect > 30) {
                score *= 8.0;
            }
            if (desperation.damageMultiplier > 1.0 || (combatant.health / combatant.maxHealth > 0.8)) {
                score *= 0.1;
            }
        }
        
        if (action.name === 'Clone Jutsu' && combatant.tags.some(t => t.name === 'Setup: Clones_Active')) {
            score *= 0.05; // Heavily penalize using clones when they are already active
        }

        if (target.tags.some(t => t.name === 'Grappled')) {
            if (action.name === 'Strike' || action.name === 'Heavy Strike' || action.name === 'Kunai Stab') score *= 20.0;
        }

        const isBrawler = combatant.aiProfile === 'Brawler';
        const targetIsCaster = target.aiProfile === 'Ninjutsu Specialist';

        if (isBrawler && targetIsCaster && combatState.range === 'Engaged' && !target.tags.some(t => t.name === 'Grappled')) {
            if (action.tags.effect === 'Grapple') score *= 15.0;
        }
        if (targetIsCaster && combatant.isPlayer && combatState.range === 'Engaged' && target.aiProfile === 'Brawler') {
            if (action.tags.effect === 'Evasion' || action.tags.effect === 'Push') score *= 10.0;
        }

        if (combatant.tags.some(t => t.name === 'Disguised')) {
            if (action.type === 'Offensive') score *= 10.0; // Heavily incentivize attacking from disguise
        }
        
        if (target.posture === 'Exposed' || target.posture === 'Casting') {
            if (action.type === 'Offensive') score *= (5.0 + (action.basePower / 10));
        } else if (target.posture === 'Guarded') {
            if (action.tags.effect === 'StanceBreak') score *= 6.0;
        }
        
        if (combatant.posture === 'Exposed') {
            if (action.tags.effect === 'Evasion' || action.type === 'Defensive' || action.effect?.rangeChange) score *= 8.0;
            else if (action.type === 'Offensive') score *= 0.1;
        }

        const rankValue = { 'E': 1, 'D': 2, 'C': 3, 'B': 4, 'A': 5, 'S': 6 }[action.rank] || 1;
        switch (phase) {
            case CombatPhases.ESCALATION: if (rankValue > 1) score *= 2.0; break;
            case CombatPhases.CLIMAX: if (rankValue > 2) score *= 4.0; break;
            case CombatPhases.RESOLUTION: if (action.basePower > 25 || rankValue > 3) score *= 6.0; break;
        }

        if (desperation.damageMultiplier > 1.0 && action.type === 'Offensive') score *= 2.5 * desperation.damageMultiplier;

        if (action.effect?.rangeChange) {
            if (action.effect.rangeChange === combatant.preferredRange) score *= 2.0;
            else score *= 0.4;
        } else if (combatState.range !== combatant.preferredRange) score *= 0.6;
        
        const timesUsedRecently = combatant.recentActions.filter(a => a === action.name).length;
        score *= Math.pow(0.45, timesUsedRecently);

        if (action.chakraCost > combatant.chakra * 0.5) score *= 0.5;
        if (action.type === 'Counter') score *= 0.05;
        if (action.name === 'Guard' && combatant.stamina / combatant.maxStamina > 0.7) score *= 0.01;

        return { action, score };
    });

    scoredActions.sort((a, b) => b.score - a.score);

    // *** NEW DEBUGGER LOGIC ***
    if (!combatant.isPlayer) {
        console.log(`--- ${combatant.name}'s Top Action Candidates (Phase: ${phase}) ---`);
        for (let i = 0; i < Math.min(5, scoredActions.length); i++) {
            const { action, score } = scoredActions[i];
            console.log(`  #${i + 1}: ${action.name} (Score: ${score.toFixed(2)})`);
        }
        console.log('------------------------------------');
    }
    // *** END NEW DEBUGGER LOGIC ***
    
    const topTierCount = Math.min(scoredActions.length, (Math.random() < 0.7) ? 2 : 3);
    const topTier = scoredActions.slice(0, topTierCount);
    const chosen = topTier[Math.floor(Math.random() * topTier.length)];
    
    console.log(`${combatant.name} chooses action: ${chosen.action.name} with score ${chosen.score.toFixed(2)} (Phase: ${phase})`);

    return chosen.action;
}


function getActionIfUsable(combatant, actionName) {
    const action = JUTSU_LIBRARY[actionName];
    if (!action) return null;

    const isGrappled = combatant.tags.some(t => t.name === 'Grappled');
    // NEW LOGIC: Prevent using grapple-specific actions when not grappled.
    if (action.name === 'Attempt to Escape Grapple' && !isGrappled) {
        return null;
    }

    if (action.requiresItem) {
        if (combatant.isPlayer) {
            if (!checkInventory(action.requiresItem.id, 1)) return null;
        } else {
            if (!combatant.equipment || combatant.equipment[action.requiresItem.id] < 1) {
                return null;
            }
        }
    }
    
    if (isGrappled) {
        const allowedActions = ['Attempt to Escape Grapple', 'Strike', 'Kunai Stab'];
        if (!allowedActions.includes(action.name)) {
            return null;
        }
    }

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap', 'Taijutsu: Takedown', 'Shadow Shuriken Jutsu', 'Attempt to Escape Grapple', 'Analyze', 'Block', 'Dodge', 'Kunai Stab'];
    if (!innateAbilities.includes(actionName)) {
        if (combatant.isPlayer) {
            if (!combatant.source.skills?.jutsu[actionName] || combatant.source.skills.jutsu[actionName].level < 1) return null;
        }
    }
    
    const getSkillLevel = (comb, skillName) => {
        if (comb.isPlayer) {
            const skillGroup = Object.keys(comb.source.skills).find(group => comb.source.skills[group]?.[skillName]);
            return skillGroup ? comb.source.skills[skillGroup][skillName].level : 0;
        }
        return comb.skillLevels?.[skillName] || 0;
    };

    const taijutsuLevel = getSkillLevel(combatant, 'Taijutsu');
    const shurikenjutsuLevel = getSkillLevel(combatant, 'Shurikenjutsu');

    if (action.name === 'Leaf Whirlwind' && taijutsuLevel < 5) return null;
    if (action.name === 'Heavy Strike' && taijutsuLevel < 10) return null;
    if (action.name === 'Dynamic Entry' && taijutsuLevel < 15) return null;
    if (action.name === 'Taijutsu: Takedown' && taijutsuLevel < 8) return null;
    if (action.name === 'Shadow Shuriken Jutsu' && shurikenjutsuLevel < 20) return null;

    if (combatant.stamina < action.staminaCost || combatant.chakra < action.chakraCost) return null;
    if (action.tags.validRanges && !action.tags.validRanges.includes(combatState.range)) return null;

    return action;
}

function chooseCounterReaction(self, opponent, opponentAction) {
    const trapTag = self.tags.find(t => t.name === 'Setup: Trap_Ready');
    if (trapTag && opponentAction.name === 'Dash') {
        addToCombatLog(`**${opponent.name}** dashes forward... directly into the paper bomb trap set by **${self.name}**!`, 'event-message');
        
        const damage = trapTag.power || 75;
        opponent.health = Math.max(0, opponent.health - damage);
        opponent.posture = 'Exposed';
        self.resolve = Math.min(100, self.resolve + 20);
        opponent.resolve = Math.max(0, opponent.resolve - 25);
        addToCombatLog(`The explosion blasts **${opponent.name}** for **${damage}** damage! They are left Exposed!`, 'system-message error');

        self.tags = self.tags.filter(t => t.name !== 'Setup: Trap_Ready');
        return true;
    }
    return false;
}

/**
 * NEW: Decides if a character will Block or Dodge an incoming Taijutsu attack.
 */
function chooseTaijutsuReaction(target, attacker, incomingAction) {
    if (target.stamina < 10) return null; // Not enough stamina to react

    const agiDiff = target.source.currentStats.agility - attacker.source.currentStats.agility;
    const strDiff = target.source.currentStats.strength - attacker.source.currentStats.strength;

    let dodgeChance = 0.15 + (agiDiff * 0.02);
    let blockChance = 0.20 + (strDiff * 0.015);

    // AI Profile influences choice
    if (target.aiProfile === 'Assassin') dodgeChance += 0.2;
    if (target.aiProfile === 'Brawler') blockChance += 0.2;

    if (Math.random() < dodgeChance) return JUTSU_LIBRARY['Dodge'];
    if (Math.random() < blockChance) return JUTSU_LIBRARY['Block'];

    return null;
}

/**
 *  Resolves the outcome of a Block or Dodge reaction.
 */
function resolveTaijutsuReaction(reaction, reactor, attacker, originalAction) {
    reactor.stamina -= reaction.staminaCost;
    const narrativeText = generateNarrativeAction(reactor, reaction, attacker);
    addToCombatLog(narrativeText, "system-message");

    const getSkillLevel = (comb, skillName) => {
        if (comb.isPlayer) {
            const skillGroup = Object.keys(comb.source.skills).find(group => comb.source.skills[group]?.[skillName]);
            return skillGroup ? comb.source.skills[skillGroup][skillName].level : 0;
        }
        return comb.skillLevels?.[skillName] || 0;
    };
    
    let success = false;
    let actionResult = { hit: true, dodged: false };

    if (reaction.name === 'Dodge') {
        const reactorScore = reactor.source.currentStats.agility + getSkillLevel(reactor, 'Taijutsu') * 0.5;
        const attackerScore = attacker.source.currentStats.agility + getSkillLevel(attacker, 'Taijutsu') * 0.5;
        success = reactorScore > attackerScore * (0.8 + Math.random() * 0.4);

        if (success) {
            actionResult = { hit: false, dodged: true };
            const repositionEffect = reaction.effect?.reposition;

            if (repositionEffect && Math.random() < repositionEffect.chance) {
                combatState.range = repositionEffect.newRange;
                addToCombatLog(`**${reactor.name}** nimbly sidesteps, creating an opening and increasing the distance to **${combatState.range}**!`, "system-message success");
                reactor.momentum = (reactor.momentum || 0) + 1;
            } else {
                addToCombatLog(`**${reactor.name}** successfully evades the attack!`, "system-message success");
            }
        } else {
            addToCombatLog(`...but the dodge is too slow! The attack connects!`, "system-message error");
        }
    } else if (reaction.name === 'Block') {
        const reactorScore = reactor.source.currentStats.strength + getSkillLevel(reactor, 'Taijutsu');
        const attackerScore = attacker.source.currentStats.strength + getSkillLevel(attacker, 'Taijutsu');
        success = reactorScore > attackerScore * (0.9 + Math.random() * 0.3);
        
        if (success) {
            addToCombatLog(`**${reactor.name}** successfully blocks the attack, taking no damage!`, "system-message success");
            reactor.stamina -= (originalAction.basePower / 2);
            actionResult = { hit: false };
        } else {
            addToCombatLog(`...but the block isn't strong enough! The force breaks through!`, "system-message error");
            originalAction.basePower *= 0.6;
        }
    }

    applyMomentumSystem(attacker, reactor, actionResult);
    
    if (!success) {
        let totalDamage = originalAction.basePower * (1 + (getSkillLevel(attacker, originalAction.name) * 0.02));
        totalDamage *= getDesperationBonus(attacker).damageMultiplier;
        const finalDamage = Math.round(totalDamage);
        reactor.health = Math.max(0, reactor.health - finalDamage);
        addToCombatLog(`It hits **${reactor.name}** for ${finalDamage} damage!`, "system-message error");
    }

    // Sync vitals and update the UI
    updateSourceVitals(reactor);
    updateSourceVitals(attacker);
    updateUI();
}

function executeAction(attacker, action, target, isResolvingCast = false) {
    if (!action) action = JUTSU_LIBRARY['Guard'];
    
    // --- Skill Usage Tracking ---
    const incrementSkillUsage = (skillName, amount = 1) => {
        if (!attacker.skillUsage) attacker.skillUsage = {};
        attacker.skillUsage[skillName] = (attacker.skillUsage[skillName] || 0) + amount;
    };

    switch (action.tags.category) {
        case 'Taijutsu':
            incrementSkillUsage('Taijutsu');
            break;
        case 'Tool':
            incrementSkillUsage('Shurikenjutsu');
            break;
        case 'Ninjutsu':
            if (action.tags.element && ELEMENTS.includes(action.tags.element)) {
                incrementSkillUsage(`Ninjutsu${action.tags.element}`);
                incrementSkillUsage('NatureTransformation', 0.5); // Also train the core skill
            }
            incrementSkillUsage('ChakraControl', 0.5); // All ninjutsu uses control
            break;
        case 'Genjutsu':
            incrementSkillUsage('Genjutsu');
            incrementSkillUsage('ChakraControl', 0.5);
            break;
    }
    // --- End Skill Usage Tracking ---

    let actionResult = { hit: false, dodged: false };

    const getSkillLevel = (comb, skillName) => {
        if (comb.isPlayer) {
            const skillGroup = Object.keys(comb.source.skills).find(group => comb.source.skills[group]?.[skillName]);
            return skillGroup ? comb.source.skills[skillGroup][skillName].level : 0;
        }
        return comb.skillLevels?.[skillName] || 0;
    };

    trackJutsuUsage(combatState, action);
    if (!attacker.recentActions) attacker.recentActions = [];
    attacker.recentActions.push(action.name);
    if (attacker.recentActions.length > 5) attacker.recentActions.shift();

    if (action.requiresItem) {
        if (attacker.isPlayer) removeItemFromInventory(action.requiresItem.id, 1);
        else if (attacker.equipment[action.requiresItem.id]) attacker.equipment[action.requiresItem.id]--;
        addToCombatLog(`(${action.requiresItem.id} consumed)`, 'system-message');
    }

    let castTicks = 0;
    if (action.tags.complexity !== 'None' && !isResolvingCast) {
        if (action.tags.complexity === 'Simple') castTicks = 1;
        if (action.tags.complexity === 'Moderate') castTicks = 2;
        if (action.tags.complexity === 'Complex') castTicks = 3;
        
        const handSealSkill = getSkillLevel(attacker, 'HandSealSpeed');
        const jutsuMastery = attacker.isPlayer ? getSkillLevel(attacker, action.name) : 0;
        const reduction = Math.floor(handSealSkill / 10) + Math.floor(jutsuMastery / 25);
        castTicks = Math.max(0, castTicks - reduction);
    }

    if (castTicks > 0) {
        attacker.casting = { action, target, ticksLeft: castTicks };
        attacker.posture = 'Casting';
        let castMessage = `**${attacker.name}** begins preparing **${action.name}**!`;
        const category = action.tags.category;
        if (category === 'Ninjutsu' || category === 'Genjutsu') castMessage = `**${attacker.name}** begins weaving hand seals for **${action.name}**!`;
        else if (category === 'Tool') castMessage = `**${attacker.name}** begins preparing their equipment for **${action.name}**!`;
        else if (category === 'Taijutsu') castMessage = `**${attacker.name}** takes a deep breath, gathering focus for **${action.name}**!`;
        addToCombatLog(castMessage, "system-message");
        updateSourceVitals(attacker);
        if(target) updateSourceVitals(target);
        updateUI();
        return;
    }
    
    const chakraControl = getSkillLevel(attacker, 'ChakraControl');
    const staminaSkill = getSkillLevel(attacker, 'Taijutsu');
    const chakraCostReduction = 1 - (chakraControl * 0.005);
    const staminaCostReduction = 1 - (staminaSkill * 0.005);
    attacker.chakra = Math.max(0, attacker.chakra - (action.chakraCost || 0) * chakraCostReduction);
    attacker.stamina = Math.max(0, attacker.stamina - (action.staminaCost || 0) * staminaCostReduction);
    attacker.posture = 'Mobile';
    
    if (target) {
        const cloneTag = target.tags.find(t => t.name === 'Setup: Clones_Active');
        const isOffensive = action.type === 'Offensive';
        const hostileSupplementaryEffects = ['Debuff', 'Restraint', 'Mental', 'AoEDebuff'];
        const isHostileSupplementary = action.type === 'Supplementary' && hostileSupplementaryEffects.includes(action.tags.effect);
        const canHitClone = isOffensive || isHostileSupplementary;

        if (cloneTag && canHitClone) {
            if (Math.random() < 0.50) {
                const narrativeText = generateNarrativeAction(attacker, action, target);
                addToCombatLog(`${narrativeText} ...but it hits an illusion, which dissipates harmlessly! The real target was elsewhere.`, 'system-message success');
                cloneTag.duration = Math.max(0, cloneTag.duration - 2);
                applyMomentumSystem(attacker, target, { hit: false });
                updateSourceVitals(attacker);
                updateSourceVitals(target);
                updateUI();
                return;
            } else {
                 addToCombatLog(`**${attacker.name}**'s attack pierces the deception, targeting the real **${target.name}**!`, 'system-message warning');
            }
        }
    }

    const narrativeText = generateNarrativeAction(attacker, action, target);
    addToCombatLog(narrativeText, "system-message");

    if (action.name === 'Analyze') {
        const intelBonus = Math.floor(attacker.source.currentStats.intellect / 15);
        const familiarityGain = 1 + intelBonus;
        attacker.tempFamiliarity += familiarityGain;
        attacker.tags.push({ name: `Analysis_Complete_${target.id}`, duration: 999 }); 
        addToCombatLog(`**${attacker.name}** studies **${target.name}**'s movements, gaining tactical insight!`, 'skill-gain-message');
    } else if (action.name === 'Struggle') {
        attacker.posture = 'Exposed';
    } else if (action.name === 'Attempt to Escape Grapple') {
        const attackerStrength = attacker.source.currentStats.strength + getSkillLevel(attacker, 'Taijutsu') * 0.5;
        const targetStrength = target.source.currentStats.strength + getSkillLevel(target, 'Taijutsu') * 0.5;
        if (attackerStrength > targetStrength * (0.8 + Math.random() * 0.4)) {
            attacker.tags = attacker.tags.filter(t => t.name !== 'Grappled');
        } else {
            addToCombatLog(`...but fails to break **${target.name}**'s hold!`, 'system-message error');
        }
    } else if (!target || action.tags.range === 'Personal' || action.name === 'Guard') {
        if (action.name === 'Guard') {
            attacker.posture = 'Guarded';
            attacker.stamina = Math.min(attacker.maxStamina, attacker.stamina + (attacker.maxStamina * 0.15));
            addToCombatLog(`**${attacker.name}** catches their breath, recovering stamina.`, 'system-message success');
        }
        if (action.effect?.appliesTag) {
            attacker.tags.push({ ...action.effect.appliesTag, casterId: attacker.id });
            if (action.name === 'Clone Jutsu') addToCombatLog(`Illusory clones of **${attacker.name}** appear on the battlefield!`, 'event-message');
        }
    } else if (target) {
        if (action.effect?.check?.type === 'Contested' && action.tags.effect === 'Deception') {
            const attackerScore = calculateCheckScore(attacker, action.effect.check.attacker);
            const defenderScore = calculateCheckScore(target, action.effect.check.defender);
            if (attackerScore > defenderScore * (0.8 + Math.random() * 0.4)) {
                addToCombatLog(`**${attacker.name}** vanishes from sight!`, 'system-message success');
                attacker.tags.push({ name: 'Disguised', duration: 4 });
            } else {
                addToCombatLog(`...but **${target.name}** sees through the illusion!`, 'system-message warning');
            }
        }
        
        // --- TAIJUTSU REACTION ---
        let taijutsuReaction = null;
        if (action.tags.category === 'Taijutsu' && combatState.range === 'Engaged' && !target.tags.some(t => t.name === 'Grappled')) {
            taijutsuReaction = chooseTaijutsuReaction(target, attacker, action);
            if (taijutsuReaction) {
                resolveTaijutsuReaction(taijutsuReaction, target, attacker, action);
                return;
            }
        }

        if (chooseCounterReaction(target, attacker, action)) {
            updateSourceVitals(attacker);
            updateSourceVitals(target);
            updateUI(); 
            return; 
        }
        
        // --- NINJUTSU REACTION (SUBSTITUTION / DEFENSIVE JUTSU) ---
        const reaction = chooseReaction(target, attacker, action);
        if (reaction) {
            const reactionElement = reaction.tags.element;
            const actionElement = action.tags.element;
            if (reactionElement && actionElement && ELEMENTAL_RELATIONSHIPS[reactionElement] === actionElement) {
                target.chakra = Math.max(0, target.chakra - (reaction.chakraCost || 0));
                target.stamina = Math.max(0, target.stamina - (reaction.staminaCost || 0));
                addToCombatLog(generateNarrativeAction(target, reaction, attacker), "system-message");
                addToCombatLog(`The **${reaction.name}** completely negates the **${action.name}**!`, 'event-message');
                applyMomentumSystem(attacker, target, { hit: false });
                updateSourceVitals(attacker);
                updateSourceVitals(target);
                updateUI();
                return;
            } else {
                executeAction(target, reaction, attacker); 
                return;
            }
        }
        
        // --- *** NEW: DEFAULT AGILITY-BASED JUTSU DODGE *** ---
        // This is the new block. It runs if no special reaction was chosen.
        let attackConnects = true;
        if (action.type === 'Offensive' && action.tags.category !== 'Taijutsu') {
            // Calculate attacker's accuracy score based on the jutsu's defined check
            const attackerScore = calculateCheckScore(attacker, action.effect.check.attacker);
            
            // Calculate defender's evasion score based on agility and perception
            let defenderScore = getCombatantSkillValue(target, 'agility') + getCombatantSkillValue(target, 'perception') * 0.5;
            
            // Apply situational modifiers
            const effectTag = action.tags.effect;
            if (effectTag === 'AoE' || effectTag === 'LineAoE') {
                defenderScore *= 0.6; // 40% penalty to dodge AoE attacks
            }
            if (effectTag === 'FastProjectile' || effectTag === 'GuidedProjectile') {
                defenderScore *= 0.8; // 20% penalty against fast or guided projectiles
            }

            const dodged = defenderScore > attackerScore * (0.8 + Math.random() * 0.4);

            if (dodged) {
                attackConnects = false;
                actionResult = { hit: false, dodged: true };
                let dodgeMessage = `With a burst of speed, **${target.name}** dives out of the way of the **${action.name}**!`;
                if (action.tags.category === 'Tool') dodgeMessage = `**${target.name}** nimbly dodges the incoming projectile!`;
                addToCombatLog(dodgeMessage, "system-message success");
            } else {
                addToCombatLog(`**${target.name}** attempts to evade, but the attack is too fast to dodge completely!`, "system-message error");
            }
        }
        // --- *** END OF NEW DODGE LOGIC *** ---
        
        if (attackConnects) { // This now checks if the new dodge mechanic failed
            actionResult.hit = true;

            if (target.casting) {
                addToCombatLog(`The jutsu shatters **${target.name}**'s concentration, interrupting their technique! They are left Exposed!`, "event-message");
                target.casting = null;
                target.posture = 'Exposed';
            }

            if (action.basePower > 0) {
                let damageMultiplier = 1.0;
                let baseDamage = action.basePower;
                baseDamage *= (1 + (getSkillLevel(attacker, action.name) * 0.02));
                let skillBonus = 0;
                if (action.tags.category === 'Taijutsu') skillBonus = getSkillLevel(attacker, 'Taijutsu') * 0.2;
                if (action.tags.category === 'Tool') skillBonus = getSkillLevel(attacker, 'Shurikenjutsu') * 0.25;
                if (action.tags.category === 'Ninjutsu') {
                    const schoolSkillName = 'Ninjutsu' + action.tags.element;
                    skillBonus = getSkillLevel(attacker, schoolSkillName) * 0.3;
                }
                const statBonus = (action.tags.range === 'Melee' ? attacker.source.currentStats.strength * 0.5 : attacker.source.currentStats.intellect * 0.5);
                let totalDamage = baseDamage + statBonus + skillBonus;
                const disguiseTagIndex = attacker.tags.findIndex(t => t.name === 'Disguised');
                if (disguiseTagIndex !== -1) {
                    addToCombatLog(`Striking from the shadows, **${attacker.name}** lands a devastating surprise attack!`, 'event-message');
                    damageMultiplier *= 1.75;
                    attacker.tags.splice(disguiseTagIndex, 1);
                } else if (target.posture === 'Exposed' || target.posture === 'Casting') {
                     damageMultiplier *= 1.5;
                }
                damageMultiplier *= getDesperationBonus(attacker).damageMultiplier;
                const finalDamage = Math.round(totalDamage * damageMultiplier);
                target.health = Math.max(0, target.health - finalDamage);
                addToCombatLog(`It hits **${target.name}** for ${finalDamage} damage!`, "system-message error");
            }
            
            const secondaryCheck = action.effect?.secondaryCheck || action.effect?.check;
            if (action.effect?.appliesTag && secondaryCheck?.type === 'Contested') {
                const attackerScore = calculateCheckScore(attacker, secondaryCheck.attacker);
                const defenderScore = calculateCheckScore(target, secondaryCheck.defender);
                if (attackerScore > defenderScore * (0.8 + Math.random() * 0.4)) {
                    target.tags.push({ ...action.effect.appliesTag, casterId: attacker.id });
                    addToCombatLog(`**${target.name}** is affected by the jutsu and is now **${action.effect.appliesTag.name}**!`, "system-message warning");
                } else {
                     addToCombatLog(`**${target.name}** resists the jutsu's secondary effect!`, 'system-message success');
                }
            }
        }
    }
    
    if (action.effect?.rangeChange) {
        if (combatState.range !== action.effect.rangeChange) {
            combatState.range = action.effect.rangeChange;
            addToCombatLog(`The range is now **${combatState.range}**.`, "event-message");
        }
    }

    applyMomentumSystem(attacker, target, actionResult);
    updateSourceVitals(attacker);
    if(target) updateSourceVitals(target);
    updateUI();
}

async function endCombat(victory) {
    if (!combatState.isActive) return;
    clearInterval(combatInterval);
    combatState.isActive = false;

    const playerChar = gameState.character;
    const playerCombatant = combatState.combatants.find(c => c.isPlayer);
    
    if (victory) {
        addToCombatLog("You are victorious!", "system-message success");

        // --- CEXP, Stat, and Familiarity Gains ---
        const prowessScore = combatState.tick;
        const statGainMultiplier = 0.002;
        const totalStatGain = prowessScore * statGainMultiplier;

        // 1. Direct Stat Gains
        if (totalStatGain > 0) {
            for (const stat in playerChar.baseStats) {
                playerChar.baseStats[stat] += totalStatGain;
                playerChar.baseStats[stat] = parseFloat(playerChar.baseStats[stat].toFixed(2));
            }
            addToCombatLog(`The crucible of combat has permanently honed your abilities. (All stats +${totalStatGain.toFixed(2)})`, "skill-gain-message");
            recalculateVitals(); // Recalculate vitals immediately after stat change
        }
        
        // 2. Skill XP Gains based on usage
        if (playerCombatant && playerCombatant.skillUsage) {
            const XP_PER_USE_MULTIPLIER = 8;
            for (const skillName in playerCombatant.skillUsage) {
                const usageCount = playerCombatant.skillUsage[skillName];
                const xpToAward = usageCount * XP_PER_USE_MULTIPLIER;
                
                let skillFound = false;
                for (const category in playerChar.skills) {
                    if (playerChar.skills[category][skillName]) {
                        const skillObject = playerChar.skills[category][skillName];
                        if (addXp(skillObject, xpToAward, skillName)) {
                            // The addXp function already logs level-ups, so we just log the base gain.
                        }
                        addToCombatLog(`Your practical application of **${skillName}** has yielded experience. (+${Math.round(xpToAward)} XP)`, "skill-gain-message");
                        skillFound = true;
                        break;
                    }
                }
            }
        }

        // 3. CEXP and Familiarity Gains
        let totalCexpGain = 0;
        const opponentTypesEncountered = new Set();
        combatState.combatants.forEach(c => {
            if (!c.isPlayer) {
                totalCexpGain += combatState.tick; // Base CEXP is the length of the fight
                opponentTypesEncountered.add(c.opponentType);
            }
        });
        
        if (totalCexpGain > 0) {
            playerChar.combatStats.CEXP += totalCexpGain;
            addToCombatLog(`Your combat instincts have sharpened. (+${totalCexpGain} CEXP)`, "skill-gain-message");
        }

        opponentTypesEncountered.forEach(type => {
            if (type) {
                if (!playerChar.combatStats.familiarity[type]) playerChar.combatStats.familiarity[type] = 0;
                playerChar.combatStats.familiarity[type]++;
                addToCombatLog(`You've learned more about the tactics of ${type.replace(/_/g, ' ')}. (Familiarity +1)`, "skill-gain-message");
            }
        });

    } else {
        const injuryId = 'knocked_unconscious_severe';
        const { applyInjury } = await import('./characterEffects.js');
        applyInjury(injuryId);
        addToCombatLog("You were defeated and knocked unconscious...", "system-message error");
    }

    if (playerCombatant) {
        playerChar.health = Math.max(0, playerCombatant.health);
        playerChar.chakra = playerCombatant.chakra;
        playerChar.stamina = playerCombatant.stamina;
    }

    addToCombatLog("--- COMBAT ENDS ---", "event-message");

    if (combatState.onCombatEndCallback) {
        const callback = combatState.onCombatEndCallback;
        combatState.onCombatEndCallback = null;
        callback(victory);
    }
    
    gameState.mode = 'Simulating';
}

function debugCombatState() {
    console.log(`=== COMBAT DEBUG (Tick ${combatState.tick}) ===`);
    console.log(`Range: ${combatState.range}, Phase: ${getCombatPhase(combatState)}`);
    console.log(`Battlefield Tags: ${combatState.battlefield.tags.map(t => `${t.name}(${t.duration})`).join(', ') || 'None'}`);
    combatState.combatants.forEach(c => {
        const familiarity = c.isPlayer 
            ? (gameState.character.combatStats.familiarity[c.opponentType] || 0) + c.tempFamiliarity
            : 'N/A';
        console.log(`- ${c.name}: HP=${Math.round(c.health)}/${c.maxHealth}, CHK=${Math.round(c.chakra)}, STM=${Math.round(c.stamina)}, Momentum=${c.momentum}, Fam: ${familiarity}`);
        console.log(`  Stance=${determineStance(c)}, Posture=${c.posture}, Tags: ${c.tags.map(t => `${t.name}(${t.duration})`).join(', ') || 'None'}`);
    });
    console.log('====================');
}