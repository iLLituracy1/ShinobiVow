// combat.js - Overhauled with Information Warfare mechanics

import { updateUI, addToCombatLog, showVillageMenu } from './ui.js';
import { JUTSU_LIBRARY, INJURY_POOL, ACTION_NARRATIVES } from './constants.js';
import { checkInventory, removeItemFromInventory } from './inventory.js';

let combatInterval = null;

let combatState = {
    isActive: false, combatants: [], tick: 0, range: 'Short', onCombatEndCallback: null,
};

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

    combatState.battlefield.tags = combatState.battlefield.tags.filter(tag => {
        tag.duration--;
        if (tag.duration <= 0) {
            addToCombatLog(`The **${tag.name}** dissipates.`, 'event-message');
            return false;
        }
        return true;
    });
    
    const disguisedCombatants = combatState.combatants.filter(c => c.tags.some(t => t.name === 'Disguised'));
    if (disguisedCombatants.length > 0) {
        for (const disguised of disguisedCombatants) {
            const opponent = combatState.combatants.find(c => c.id !== disguised.id && c.health > 0);
            if (opponent) {
                const detectionChance = 0.05 + (opponent.source.currentStats.perception * 0.001);
                if (Math.random() < detectionChance) {
                    addToCombatLog(`**${opponent.name}**'s keen senses spot a flicker in the air, revealing **${disguised.name}**'s disguise!`, 'event-message');
                    disguised.tags = disguised.tags.filter(t => t.name !== 'Disguised');
                }
            }
        }
    }

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
    });

    const player = combatState.combatants.find(c => c.isPlayer);
    const activeOpponents = combatState.combatants.filter(c => !c.isPlayer && c.health > 0);
    if (player.health <= 0 || activeOpponents.length === 0) {
        endCombat(activeOpponents.length === 0);
        return;
    }

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
    
    const grappledCombatants = combatState.combatants.filter(c => c.tags.some(t => t.name === 'Grappled'));
    const readyCombatants = combatState.combatants
        .filter(c => 
            c.health > 0 && 
            c.actionGauge >= 100 && 
            !c.casting && 
            !c.tags.some(t => t.name === 'Airborne') &&
            !grappledCombatants.includes(c)
        )
        .sort((a, b) => b.actionGauge - a.actionGauge);

    if (grappledCombatants.length > 0) {
        for (const grappled of grappledCombatants) {
            if(grappled.actionGauge >= 100){
                grappled.actionGauge -= 100;
                const opponent = combatState.combatants.find(c => c.id !== grappled.id && c.health > 0);
                executeAction(grappled, JUTSU_LIBRARY['Attempt to Escape Grapple'], opponent, false);
                return;
            }
        }
    }

    if (readyCombatants.length > 0) {
        const actor = readyCombatants[0];
        actor.actionGauge -= 100;
        const target = actor.isPlayer ? activeOpponents[0] : player;
        const action = chooseAction(actor, target);
        executeAction(actor, action, target, false);
    }
}


function chooseReaction(target, attacker, incomingAction) {
    const chakraPercent = target.chakra / target.source.maxChakra;
    const isThreatening = incomingAction.basePower >= 25 || ['C', 'B', 'A', 'S'].includes(incomingAction.rank);

    if (isThreatening) {
        const canSubstitute = getActionIfUsable(target, 'Substitution Jutsu');
        if (canSubstitute && chakraPercent > 0.20 && Math.random() < 0.70) {
            addToCombatLog(`Seeing the overwhelming power of the incoming attack, **${target.name}** prepares to substitute!`, 'system-message success');
            return JUTSU_LIBRARY['Substitution Jutsu'];
        }
    }

    const effectTag = incomingAction.tags.effect;
    const incomingElement = incomingAction.tags.element;
    const isProjectileOrAoE = (effectTag === 'Projectile' || effectTag === 'AoE' || effectTag === 'MultiProjectile' || effectTag === 'LineAoE');
    
    if (isProjectileOrAoE && incomingElement) {
        const defensiveJutsu = target.knownJutsu
            .map(name => JUTSU_LIBRARY[name])
            .filter(jutsu => jutsu && jutsu.type === 'Defensive' && jutsu.name !== 'Guard' && getActionIfUsable(target, jutsu.name));
        
        if (defensiveJutsu.length > 0) {
            // --- NEW: Elemental Advantage Logic ---
            const advantageousJutsu = defensiveJutsu.find(defJutsu => 
                ELEMENTAL_RELATIONSHIPS[defJutsu.tags.element] === incomingElement
            );

            // If an elementally advantageous jutsu is found, there is a very high chance of using it.
            if (advantageousJutsu && Math.random() < 0.95) {
                addToCombatLog(`**${target.name}** sees an elemental opening and prepares a perfect counter!`, 'system-message success');
                return advantageousJutsu;
            }
            // --- END NEW BLOCK ---

            // Fallback to a random non-advantageous defense
            if (Math.random() < 0.50) {
                const chosenDefense = defensiveJutsu[Math.floor(Math.random() * defensiveJutsu.length)];
                addToCombatLog(`**${target.name}** reacts to the incoming jutsu with a defensive technique!`, 'system-message success');
                return chosenDefense;
            }
        }
    }
    
    return null;
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

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap', 'Taijutsu: Takedown', 'Shadow Shuriken Jutsu', 'Analyze', 'Struggle'];
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

        if (action.name === 'Analyze') {
            // --- FIX: Check if analysis has already been performed on this target ---
            if (combatant.tags.some(t => t.name === `Analysis_Complete_${target.id}`)) {
                score *= 0.01; // Heavily penalize re-analyzing the same target
            } else {
                // Only apply the bonus if analysis hasn't been done
                if (phase === CombatPhases.FEELING_OUT && intellect > 30) {
                    score *= 8.0;
                }
            }
            // Still apply penalties regardless
            if (desperation.damageMultiplier > 1.0 || (combatant.health / combatant.maxHealth > 0.8)) {
                score *= 0.1;
            }
        }

        if (target.tags.some(t => t.name === 'Grappled')) {
            if (action.name === 'Strike' || action.name === 'Heavy Strike') score *= 20.0;
        }

        const isBrawler = combatant.aiProfile === 'Brawler';
        const targetIsCaster = target.aiProfile === 'Ninjutsu Specialist';

        if (isBrawler && targetIsCaster && combatState.range === 'Engaged' && !target.tags.some(t => t.name === 'Grappled')) {
            if (action.tags.effect === 'Grapple') score *= 15.0;
        }
        if (targetIsCaster && combatant.isPlayer && combatState.range === 'Engaged' && target.aiProfile === 'Brawler') {
            if (action.tags.effect === 'Evasion' || action.tags.effect === 'Push') score *= 10.0;
        }

        if (combatant.tags.some(t => t.name === 'Setup: Disguise_Active')) {
            if (action.type === 'Offensive') score *= 10.0;
        }
        if (combatant.tags.some(t => t.name === 'Setup: Diversion_Ready')) {
            const isPowerfulJutsu = (action.rank && ['C', 'B', 'A', 'S'].includes(action.rank));
            if (isPowerfulJutsu) score *= 8.0;
        }
        if (combatant.tags.some(t => t.name === 'Setup: Trap_Ready')) {
            if (action.tags.effect === 'Taunt' || action.name === 'Create Distance') score *= 5.0;
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
        if (action.tags.effect === 'Deception' && target.posture !== 'Guarded') score *= 0.1;
        if (action.name === 'Clone Jutsu' && combatant.tags.some(t => t.name === 'Setup: Clones_Active')) score *= 0.05;

        return { action, score };
    });

    scoredActions.sort((a, b) => b.score - a.score);
    
    const topTierCount = Math.min(scoredActions.length, (Math.random() < 0.7) ? 2 : 3);
    const topTier = scoredActions.slice(0, topTierCount);
    const chosen = topTier[Math.floor(Math.random() * topTier.length)];
    
    console.log(`${combatant.name} chooses action: ${chosen.action.name} with score ${chosen.score.toFixed(2)} (Phase: ${phase})`);

    return chosen.action;
}


function getActionIfUsable(combatant, actionName) {
    const action = JUTSU_LIBRARY[actionName];
    if (!action) return null;

    if (action.requiresItem) {
        if (combatant.isPlayer) {
            if (!checkInventory(action.requiresItem.id, 1)) return null;
        } else {
            if (!combatant.equipment || combatant.equipment[action.requiresItem.id] < 1) {
                return null;
            }
        }
    }
    
    const isGrappled = combatant.tags.some(t => t.name === 'Grappled');
    if (isGrappled) {
        const allowedActions = ['Attempt to Escape Grapple', 'Strike'];
        if (!allowedActions.includes(action.name)) {
            return null;
        }
    }

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap', 'Taijutsu: Takedown', 'Shadow Shuriken Jutsu', 'Attempt to Escape Grapple', 'Analyze', 'Block', 'Dodge'];
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

            // --- NEW: Repositioning Logic ---
            if (repositionEffect && Math.random() < repositionEffect.chance) {
                combatState.range = repositionEffect.newRange;
                addToCombatLog(`**${reactor.name}** nimbly sidesteps, creating an opening and increasing the distance to **${combatState.range}**!`, "system-message success");
                reactor.momentum = (reactor.momentum || 0) + 1; // Extra momentum for a great dodge
            } else {
                addToCombatLog(`**${reactor.name}** successfully evades the attack!`, "system-message success");
            }
            // --- END NEW BLOCK ---
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

    updateUI();
}

function executeAction(attacker, action, target, isResolvingCast = false) {
    if (!action) action = JUTSU_LIBRARY['Guard'];
    
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

        if (category === 'Ninjutsu' || category === 'Genjutsu') {
            castMessage = `**${attacker.name}** begins weaving hand seals for **${action.name}**!`;
        } else if (category === 'Tool') {
            castMessage = `**${attacker.name}** begins preparing their equipment for **${action.name}**!`;
        } else if (category === 'Taijutsu') {
            castMessage = `**${attacker.name}** takes a deep breath, gathering focus for **${action.name}**!`;
        }

        addToCombatLog(castMessage, "system-message");
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
        const hostileSupplementaryEffects = ['Debuff', 'Restraint', 'Mental'];
        const isHostileSupplementary = action.type === 'Supplementary' && hostileSupplementaryEffects.includes(action.tags.effect);
        
        const canHitClone = isOffensive || isHostileSupplementary;

        if (cloneTag && canHitClone) {
            if (Math.random() < 0.50) {
                const narrativeText = generateNarrativeAction(attacker, action, target);
                addToCombatLog(`${narrativeText} ...but it hits an illusion, which dissipates harmlessly! The real target was elsewhere.`, 'system-message success');
                cloneTag.duration = Math.max(0, cloneTag.duration - 2);
                applyMomentumSystem(attacker, target, { hit: false });
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
    } else if (!target || action.tags.range === 'Personal' || action.name === 'Guard' || action.tags.effect === 'Deception') {
        if (action.name === 'Guard') {
            attacker.posture = 'Guarded';
            attacker.stamina = Math.min(attacker.maxStamina, attacker.stamina + (attacker.maxStamina * 0.15));
            addToCombatLog(`**${attacker.name}** catches their breath, recovering stamina.`, 'system-message success');
        }
        if (action.tags.effect === 'Deception') {
            const check = action.effect.check;
            const targetCheckValue = target.source.currentStats.perception + target.source.currentStats.intellect;
            if (targetCheckValue >= check.difficulty) {
                addToCombatLog(`...but **${target.name}** sees through the illusion!`, 'system-message warning');
            } else {
                addToCombatLog(`**${attacker.name}** vanishes from sight!`, 'system-message success');
                attacker.tags.push({ name: 'Disguised', duration: 4 });
            }
        }
        if (action.effect?.appliesTag) {
            attacker.tags.push({ ...action.effect.appliesTag, casterId: attacker.id });
            if (action.name === 'Clone Jutsu') {
                addToCombatLog(`Illusory clones of **${attacker.name}** appear on the battlefield!`, 'event-message');
            }
        }
    } else if (target) {
        let taijutsuReaction = null;
        if (action.tags.category === 'Taijutsu' && combatState.range === 'Engaged' && !target.tags.some(t => t.name === 'Grappled')) {
            taijutsuReaction = chooseTaijutsuReaction(target, attacker, action);
            if (taijutsuReaction) {
                resolveTaijutsuReaction(taijutsuReaction, target, attacker, action);
                return;
            }
        }

        if (chooseCounterReaction(target, attacker, action)) { updateUI(); return; }
        
        const reaction = chooseReaction(target, attacker, action);
        // --- MODIFIED: Elemental Interaction Resolution ---
        if (reaction) {
            const reactionElement = reaction.tags.element;
            const actionElement = action.tags.element;
            // Check if the reaction is a direct elemental counter to the action
            if (reactionElement && actionElement && ELEMENTAL_RELATIONSHIPS[reactionElement] === actionElement) {
                // Execute the reaction's costs and narrative, but don't do anything else with it.
                target.chakra = Math.max(0, target.chakra - (reaction.chakraCost || 0));
                target.stamina = Math.max(0, target.stamina - (reaction.staminaCost || 0));
                addToCombatLog(generateNarrativeAction(target, reaction, attacker), "system-message");

                // Log the specific negation message and cancel the original attack completely.
                addToCombatLog(`The **${reaction.name}** completely negates the **${action.name}**!`, 'event-message');
                applyMomentumSystem(attacker, target, { hit: false }); // The attack failed.
                updateUI();
                return; // End the turn here.
            } else {
                // If it's not an elemental counter (e.g., Substitution), run the normal reaction logic.
                executeAction(target, reaction, attacker); 
                return;
            }
        }

        let evasionChance = (target.source.currentStats.agility - attacker.source.currentStats.perception) * 0.01;
        if (action.tags.category === 'Taijutsu') evasionChance -= (getSkillLevel(attacker, 'Taijutsu') - getSkillLevel(target, 'Taijutsu')) * 0.005;
        if (action.tags.category === 'Tool') evasionChance -= (getSkillLevel(attacker, 'Shurikenjutsu') * 0.01);
        
        if (target.tags.some(t => t.name === 'Grappled')) evasionChance -= 0.5;

        if (target.posture === 'Mobile' && Math.random() < evasionChance) {
            let dodgeMessage = `**${target.name}** dodges the jutsu!`;
            if (action.tags.category === 'Taijutsu') dodgeMessage = `**${target.name}** evades the blow!`;
            if (action.tags.category === 'Tool') dodgeMessage = `**${target.name}** dodges the projectile!`;
            addToCombatLog(dodgeMessage, "system-message success");
            actionResult = { hit: false, dodged: true };
        } else {
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
            
            if (action.effect?.appliesTag) {
                if (Math.random() < action.effect.appliesTag.chance) {
                    target.tags.push({ ...action.effect.appliesTag });
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
    updateUI();
}

async function endCombat(victory) {
    if (!combatState.isActive) return;
    clearInterval(combatInterval);
    combatState.isActive = false;

    const playerChar = gameState.character;
    
    if (victory) {
        let totalCexpGain = 0;
        const opponentTypesEncountered = new Set();
        combatState.combatants.forEach(c => {
            if (!c.isPlayer) {
                totalCexpGain += combatState.tick; 
                opponentTypesEncountered.add(c.opponentType);
            }
        });
        playerChar.combatStats.CEXP += totalCexpGain;
        addToCombatLog(`Your combat instincts have sharpened. (+${totalCexpGain} CEXP)`, "skill-gain-message");
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

    const playerCombatant = combatState.combatants.find(c => c.isPlayer);
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