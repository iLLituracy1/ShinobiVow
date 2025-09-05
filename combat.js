// combat.js - Overhauled with Information Warfare mechanics

import { updateUI, addToCombatLog, showVillageMenu } from './ui.js';
import { JUTSU_LIBRARY, INJURY_POOL } from './constants.js';
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
            // *** NEW: Temporary Familiarity for combat analysis ***
            tempFamiliarity: 0, 
            actionGauge: 0, posture: 'Guarded', tags: [], resolve: 75, aggression: 50, casting: null,
            recentActions: [],
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
                addToCombatLog(`**${combatant.name}** continues weaving hand seals...`, 'system-message');
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
                return; // Grapple escape attempt is the only action this tick
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
    const isProjectileOrAoE = (effectTag === 'Projectile' || effectTag === 'AoE' || effectTag === 'MultiProjectile' || effectTag === 'LineAoE');
    
    if (isProjectileOrAoE) {
        const defensiveJutsu = target.knownJutsu
            .map(name => JUTSU_LIBRARY[name])
            .filter(jutsu => jutsu && jutsu.type === 'Defensive' && jutsu.name !== 'Guard' && getActionIfUsable(target, jutsu.name));
        
        if (defensiveJutsu.length > 0) {
            if (Math.random() < 0.50) {
                const chosenDefense = defensiveJutsu[0];
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

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap', 'Taijutsu: Takedown', 'Shadow Shuriken Jutsu', 'Analyze'];
    const knownAbilities = new Set([...innateAbilities, ...combatant.knownJutsu]);
    
    const usableActions = Array.from(knownAbilities)
        .map(name => JUTSU_LIBRARY[name])
        .filter(action => action && getActionIfUsable(combatant, action.name));

    if (usableActions.length === 0) {
        console.log(`${combatant.name} has no usable actions, defaulting to Guard.`);
        return JUTSU_LIBRARY['Guard'];
    }

    const scoredActions = usableActions.map(action => {
        let score = 10;
        const phase = getCombatPhase(combatState);
        const desperation = getDesperationBonus(combatant);
        const intellect = combatant.source.currentStats.intellect;

        // --- NEW: Information Warfare Scoring ---
        if (action.name === 'Analyze') {
            // High-intellect AI prioritizes analysis, especially early on.
            if (phase === CombatPhases.FEELING_OUT && intellect > 30) {
                score *= 8.0;
            }
            // Less likely to analyze if already winning or desperate
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
            case CombatPhases.FEELING_OUT: if (rankValue > 2) score *= 0.1; break;
            case CombatPhases.ESCALATION: if (rankValue > 1) score *= 2.0; if (rankValue > 3) score *= 0.3; break;
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
    
    console.log(`${combatant.name} chooses action: ${chosen.action.name} with score ${chosen.score.toFixed(2)}`);

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
        // When grappled, you can ONLY use simple Taijutsu or try to escape.
        const allowedActions = ['Attempt to Escape Grapple', 'Strike'];
        if (!allowedActions.includes(action.name)) {
            return null;
        }
    }

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap', 'Taijutsu: Takedown', 'Shadow Shuriken Jutsu', 'Attempt to Escape Grapple', 'Analyze'];
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


function executeAction(attacker, action, target, isResolvingCast = false) {
    if (!action) action = JUTSU_LIBRARY['Guard'];

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
        addToCombatLog(`**${attacker.name}** begins weaving hand seals for **${action.name}**!`, "system-message");
        updateUI();
        return;
    }
    
    const chakraControl = getSkillLevel(attacker, 'ChakraControl');
    const staminaSkill = getSkillLevel(attacker, 'Taijutsu');
    const chakraCostReduction = 1 - (chakraControl * 0.005);
    const staminaCostReduction = 1 - (staminaSkill * 0.005);
    attacker.chakra -= (action.chakraCost || 0) * chakraCostReduction;
    attacker.stamina -= (action.staminaCost || 0) * staminaCostReduction;
    attacker.posture = 'Mobile';

    addToCombatLog(`**${attacker.name}** uses **${action.name}**!`, "system-message");

    if (action.name === 'Analyze') {
        const intelBonus = Math.floor(attacker.source.currentStats.intellect / 15);
        const familiarityGain = 1 + intelBonus;
        attacker.tempFamiliarity += familiarityGain;
        addToCombatLog(`**${attacker.name}** studies **${target.name}**'s movements, gaining tactical insight!`, 'skill-gain-message');
        updateUI();
        return;
    }
    if (action.name === 'Attempt to Escape Grapple') {
        const attackerStrength = attacker.source.currentStats.strength + getSkillLevel(attacker, 'Taijutsu') * 0.5;
        const targetStrength = target.source.currentStats.strength + getSkillLevel(target, 'Taijutsu') * 0.5;
        if (attackerStrength > targetStrength * (0.8 + Math.random() * 0.4)) {
            attacker.tags = attacker.tags.filter(t => t.name !== 'Grappled');
        } else {
            addToCombatLog(`...but fails to break **${target.name}**'s hold!`, 'system-message error');
        }
        updateUI();
        return;
    }

    if (!target || action.tags.range === 'Personal' || action.name === 'Guard' || action.tags.effect === 'Deception') {
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
        updateUI();
        return;
    }
    
    if (target) {
        if (chooseCounterReaction(target, attacker, action)) { updateUI(); return; }

        const cloneTag = target.tags.find(t => t.name === 'Setup: Clones_Active');
        if (cloneTag && (action.basePower > 0 || (action.type === 'Supplementary' && action.tags.range !== 'Personal'))) {
            if (Math.random() < 0.50) {
                addToCombatLog(`...but the effect hits one of **${target.name}**'s illusions!`, 'system-message success');
                cloneTag.duration = Math.max(0, cloneTag.duration - 2);
                updateUI();
                return;
            } else {
                 addToCombatLog(`...seeing through the illusion and targeting the real **${target.name}**!`, 'system-message warning');
            }
        }
        
        const reaction = chooseReaction(target, attacker, action);
        if (reaction) {
            executeAction(target, reaction, attacker); 
            return;
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
            updateUI();
            return;
        }

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

        if (action.effect?.rangeChange) {
            combatState.range = action.effect.rangeChange;
            addToCombatLog(`The range is now **${combatState.range}**.`, "event-message");
        }
    }
    
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
    console.log(`Range: ${combatState.range}`);
    console.log(`Battlefield Tags: ${combatState.battlefield.tags.map(t => `${t.name}(${t.duration})`).join(', ') || 'None'}`);
    combatState.combatants.forEach(c => {
        // --- NEW: Display temporary familiarity in debug ---
        const familiarity = c.isPlayer 
            ? (gameState.character.combatStats.familiarity[c.opponentType] || 0) + c.tempFamiliarity
            : 'N/A';
        console.log(`- ${c.name}: HP=${Math.round(c.health)}/${c.maxHealth}, CHK=${Math.round(c.chakra)}, STM=${Math.round(c.stamina)}, Fam: ${familiarity}`);
        console.log(`  Stance=${determineStance(c)}, Posture=${c.posture}, Tags: ${c.tags.map(t => `${t.name}(${t.duration})`).join(', ') || 'None'}`);
    });
    console.log('====================');
}