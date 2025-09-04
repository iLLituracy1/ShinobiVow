// combat.js - Overhauled with Desperation, Guard Spam Prevention, and Phase Systems

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
    
    // *** DECOUPLING STEP 1: Change the game mode, don't stop the loop. ***
    gameState.mode = 'Combat';

    combatState = {
        isActive: true, tick: 0, range: 'Long', combatants: [],
        battlefield: { tags: [] }, onCombatEndCallback: onEndCallback,
        jutsuHistory: [], 
    };

    const createCombatant = (source, isPlayer = false, oppData = {}) => ({
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
        actionGauge: 0, posture: 'Guarded', tags: [], resolve: 75, aggression: 50, casting: null,
        recentActions: [],
        ...oppData
    });
    
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
    
    if (healthPercent > 0.8 && ticksElapsed < 20) return CombatPhases.FEELING_OUT;
    if (healthPercent > 0.4 && !highPowerJutsuUsed) return CombatPhases.ESCALATION;
    if (healthPercent > 0.15) return CombatPhases.CLIMAX;
    return CombatPhases.RESOLUTION;
}

function getPhaseAppropriateActions(allActions, phase) {
    switch (phase) {
        case CombatPhases.FEELING_OUT:
            return allActions.filter(a => 
                ['Strike', 'Guard', 'Create Distance', 'Dash', 'Leaf Whirlwind'].includes(a.name) ||
                (a.rank === 'E' || a.rank === 'D')
            );
            
        case CombatPhases.ESCALATION:
            return allActions.filter(a => 
                !['A', 'S'].includes(a.rank) && (a.rank !== 'B' || Math.random() < 0.25)
            );
            
        case CombatPhases.CLIMAX:
            return allActions; 
            
        case CombatPhases.RESOLUTION:
            const finishers = allActions.filter(a => 
                ['B', 'A', 'S'].includes(a.rank) || 
                a.tags.keywords?.includes('Powerful') ||
                a.basePower > 25
            );
            return finishers.length > 0 ? finishers : allActions;
            
        default:
            return allActions;
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
    combatState.combatants.forEach(c => c.tags = c.tags.filter(tag => --tag.duration > 0));

    const player = combatState.combatants.find(c => c.isPlayer);
    const activeOpponents = combatState.combatants.filter(c => !c.isPlayer && c.health > 0);

    if (player.health <= 0 || activeOpponents.length === 0) {
        endCombat(activeOpponents.length === 0);
        return;
    }

    for (const combatant of combatState.combatants) {
        if (combatant.health <= 0) continue;

        if (combatant.casting) {
            combatant.casting.ticksLeft--;
            if (combatant.casting.ticksLeft <= 0) {
                const { action, target } = combatant.casting;
                combatant.casting = null;
                executeAction(combatant, action, target, true);
            } else {
                addToCombatLog(`**${combatant.name}** continues weaving hand seals...`, 'system-message');
            }
            continue;
        }

        if (combatant.tags.some(t => t.name === 'Airborne')) {
            addToCombatLog(`**${combatant.name}** is airborne and unable to act!`, 'system-message warning');
            continue;
        }

        const gaugeIncrease = (combatant.source.currentStats?.agility || 30) / 2;
        combatant.actionGauge += gaugeIncrease;

        if (combatant.actionGauge >= 100) {
            combatant.actionGauge -= 100;
            const target = combatant.isPlayer ? activeOpponents[0] : player;
            const action = chooseAction(combatant, target);

            const cloneTag = combatState.battlefield.tags.find(t => t.name === 'Illusory Clones');
            if (action.type === 'Offensive' && cloneTag) {
                const cloneOwner = combatant.isPlayer ? activeOpponents[0] : player;

                const CLONE_DISTRACTION_CHANCE = 0.50; 
                if (Math.random() < CLONE_DISTRACTION_CHANCE) {
                    addToCombatLog(`**${combatant.name}**'s **${action.name}** hits... but it was only one of **${cloneOwner.name}**'s illusions!`, 'system-message success');
                    
                    combatant.chakra -= action.chakraCost || 0;
                    combatant.stamina -= action.staminaCost || 0;
                    
                    cloneTag.duration = Math.max(0, cloneTag.duration - 1);
                    
                    updateUI();
                    continue; 
                } else {
                     addToCombatLog(`**${combatant.name}** sees through the illusion and targets the real **${target.name}**!`, 'system-message warning');
                }
            }

            executeAction(combatant, action, target, false);
            break; 
        }
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
            .filter(jutsu => jutsu && jutsu.type === 'Defensive' && getActionIfUsable(target, jutsu.name));
        
        if (defensiveJutsu.length > 0) {
            if (Math.random() < 0.50) {
                const chosenDefense = defensiveJutsu[0];
                addToCombatLog(`**${target.name}** reacts to the incoming jutsu with a defensive stance!`, 'system-message success');
                return chosenDefense;
            }
        }
    }
    
    return null;
}


function getDesperationBonus(combatant) {
    const healthPercent = combatant.health / combatant.maxHealth;
    const isDesperate = healthPercent < 0.3 || combatant.resolve < 25;
    
    if (isDesperate) {
        if (!combatant.tags.some(t => t.name === 'Desperate')) {
            addToCombatLog(`Pushed to the brink, **${combatant.name}** fights with desperate ferocity!`, 'event-message');
            combatant.tags.push({ name: 'Desperate', duration: 999 });
        }
        return {
            aggression: 20,
            damageMultiplier: 1.25,
            ignoreGuardChance: 0.7
        };
    }
    return { aggression: 0, damageMultiplier: 1.0, ignoreGuardChance: 0.0 };
}

function shouldConsiderGuard(combatant, target) {
    const staminaPercent = combatant.stamina / combatant.maxStamina;
    if (staminaPercent > 0.40) return false; 

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
    
    const finalAggression = Math.max(35, effectiveAggression);
    
    if (combatant.resolve > 60 && finalAggression > 65) return 'Aggressive';
    if (combatant.resolve < 40 && finalAggression < 45) return 'Defensive';
    return 'Balanced';
}

function chooseAction(combatant, target) {
    debugCombatState(); 

    if (combatant.resolve < 50 && Math.random() < 0.10) {
        combatant.resolve = Math.min(50, combatant.resolve + 2);
    }

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap'];
    const knownAbilities = new Set([...innateAbilities, ...combatant.knownJutsu]);
    
    const phase = getCombatPhase(combatState);
    
    const allUsableActions = Array.from(knownAbilities)
        .map(name => JUTSU_LIBRARY[name])
        .filter(action => action && getActionIfUsable(combatant, action.name));

    const usableActions = getPhaseAppropriateActions(allUsableActions, phase);

    if (!combatant.recentActions) combatant.recentActions = [];
    
    if (shouldConsiderGuard(combatant, target)) {
        console.log(`${combatant.name}: Decided to guard to recover stamina.`);
        return JUTSU_LIBRARY['Guard'];
    }
    
    console.log(`${combatant.name} at ${combatState.range} range. Phase: ${phase}. Usable: ${usableActions.map(a => a.name).join(', ')}`);

    const intentions = [
        {
            name: 'Counter Kiting',
            condition: () => {
                const recentRetreats = target.recentActions?.filter(a => a === 'Create Distance').length || 0;
                return recentRetreats >= 2 && combatState.range !== 'Engaged';
            },
            filter: (actions) => {
                console.log(`${combatant.name}: Opponent is kiting! Changing tactics.`);
                const setupActions = actions.filter(a => a.type === 'Supplementary');
                if (setupActions.length > 0) return setupActions;
                return actions.filter(a => a.name === 'Guard');
            }
        },
        { 
            name: 'Exploit Airborne Target', 
            condition: () => target.tags.some(t => t.name === 'Airborne'),
            filter: (actions) => actions.filter(a => a.tags.keywords?.includes('Follow Up'))
        },
        { 
            name: 'Exploit Exposed Target', 
            condition: () => target.posture === 'Exposed',
            filter: (actions) => actions.filter(a => a.type === 'Offensive' && a.basePower > 10)
        },
        { 
            name: 'Interrupt Casting', 
            condition: () => target.posture === 'Casting' && combatState.range === 'Engaged',
            filter: (actions) => actions.filter(a => a.type === 'Offensive')
        },
        {
            name: 'Long Range: Close Distance',
            condition: () => combatState.range === 'Long',
            filter: (actions) => {
                const movementActions = actions.filter(a => a.name === 'Dash' || (a.effect?.rangeChange && a.effect.rangeChange !== 'Long'));
                if (movementActions.length > 0) return movementActions;
                const rangedOffensive = actions.filter(a => a.type === 'Offensive' && (a.tags.validRanges?.includes('Long') || !a.tags.validRanges));
                if (rangedOffensive.length > 0) return rangedOffensive;
                return actions.filter(a => !a.tags.validRanges || a.tags.validRanges.includes('Long'));
            }
        },
        {
            name: 'Set Trap',
            condition: () => {
                return combatState.range !== 'Engaged' && determineStance(combatant) !== 'Aggressive';
            },
            filter: (actions) => {
                const trapActions = actions.filter(a => a.name === 'Set Paper Bomb Trap');
                if (trapActions.length > 0 && Math.random() < 0.25) {
                    return trapActions;
                }
                return [];
            }
        },
        {
            name: 'Ranged Harassment',
            condition: () => {
                const isFeelingOut = getCombatPhase(combatState) === CombatPhases.FEELING_OUT;
                const isVulnerable = target.posture === 'Casting' || target.posture === 'Exposed';
                return combatState.range !== 'Engaged' && (isFeelingOut || isVulnerable);
            },
            filter: (actions) => {
                const toolActions = actions.filter(a => a.name === 'Throw Kunai' || a.name === 'Throw Shuriken');
                if (toolActions.length > 0 && Math.random() < 0.6) {
                    return toolActions;
                }
                return [];
            }
        },
        {
            name: 'Short Range: Tactical Combat',
            condition: () => combatState.range === 'Short',
            filter: (actions) => {
                const stance = determineStance(combatant);
                
                if (stance !== 'Aggressive' && combatant.chakra / combatant.source.maxChakra > 0.3) {
                    if (!combatState.battlefield.tags.some(t => t.name === 'Illusory Clones')) {
                        const diversionActions = actions.filter(a => a.name === 'Clone Jutsu' || a.name === 'Water Style: Mist Veil Jutsu');
                        if (diversionActions.length > 0 && Math.random() < 0.35) {
                             console.log(`${combatant.name}: Prioritizing diversion because no clones are active.`);
                             return diversionActions;
                        }
                    }
                }
                
                if (stance === 'Aggressive') {
                    const engageActions = actions.filter(a => a.effect?.rangeChange === 'Engaged' || (a.type === 'Offensive' && a.basePower >= 15));
                    if (engageActions.length > 0) return engageActions;
                }
                
                if (stance === 'Defensive') {
                    const defensiveActions = actions.filter(a => a.name === 'Create Distance' || (a.type === 'Offensive' && a.basePower < 15));
                    if (defensiveActions.length > 0) return defensiveActions;
                }
                return actions.filter(a => a.type === 'Offensive');
            }
        },
        {
            name: 'Engaged Range: Melee Combat',
            condition: () => combatState.range === 'Engaged',
            filter: (actions) => {
                const stance = determineStance(combatant);
                if (stance === 'Aggressive') {
                    const heavyAttacks = actions.filter(a => a.name === 'Heavy Strike' || a.name === 'Dynamic Entry' || (a.type === 'Offensive' && a.basePower >= 20));
                    if (heavyAttacks.length > 0) return heavyAttacks;
                }
                if (stance === 'Defensive') {
                    const escapeActions = actions.filter(a => a.name === 'Create Distance');
                    if (escapeActions.length > 0) return escapeActions;
                }
                return actions.filter(a => a.type === 'Offensive');
            }
        },
        {
            name: 'Break Guard Stalemate',
            condition: () => {
                const targetRecentGuards = target.recentActions?.filter(a => a === 'Guard').length || 0;
                return targetRecentGuards >= 2;
            },
            filter: (actions) => {
                return actions.filter(a => a.type === 'Offensive').sort((a, b) => (b.basePower || 0) - (a.basePower || 0));
            }
        },
        {
            name: 'Aggressive Fallback',
            condition: () => determineStance(combatant) === 'Aggressive',
            filter: (actions) => actions.filter(a => a.type === 'Offensive')
        },
        { 
            name: 'Balanced Fallback', 
            condition: () => determineStance(combatant) === 'Balanced',
            filter: (actions) => {
                const offensive = actions.filter(a => a.type === 'Offensive');
                return offensive.length > 0 ? offensive : actions;
            }
        },
        {
            name: 'Defensive Fallback',
            condition: () => determineStance(combatant) === 'Defensive',
            filter: (actions) => {
                return actions.filter(a => a.name !== 'Guard');
            }
        }
    ];

    for (const intention of intentions) {
        if (intention.condition()) {
            const potentialActions = intention.filter(usableActions);
            if (potentialActions.length > 0) {
                const chosen = potentialActions.sort((a, b) => (b.basePower || 0) - (a.basePower || 0))[0];
                console.log(`${combatant.name}: ${intention.name} -> ${chosen.name}`);
                return chosen;
            }
        }
    }
    
    console.log(`${combatant.name}: Entering failsafe logic`);
    const anyOffensive = usableActions.filter(a => a.type === 'Offensive');
    if (anyOffensive.length > 0) return anyOffensive[0];
    const anyAction = usableActions.filter(a => a.name !== 'Guard');
    if (anyAction.length > 0) return anyAction[0];
    return JUTSU_LIBRARY['Guard'];
}

function getActionIfUsable(combatant, actionName) {
    const action = JUTSU_LIBRARY[actionName];
    if (!action) return null;

    if (action.requiresItem) {
        if (combatant.isPlayer) {
            if (!checkInventory(action.requiresItem.id, 1)) return null;
        }
    }

    const innateAbilities = ['Strike', 'Guard', 'Heavy Strike', 'Leaf Whirlwind', 'Create Distance', 'Dash', 'Dynamic Entry', 'Throw Kunai','Throw Shuriken', 'Set Paper Bomb Trap'];
    if (!innateAbilities.includes(actionName)) {
        if (combatant.isPlayer) {
            if (!combatant.source.skills?.jutsu[actionName] || combatant.source.skills.jutsu[actionName].level < 1) return null;
        }
    }
    
    let taijutsuLevel = combatant.isPlayer ? combatant.source.skills?.physical.Taijutsu.level : combatant.skillLevels?.Taijutsu;
    if (action.name === 'Leaf Whirlwind' && (taijutsuLevel || 0) < 5) return null;
    if (action.name === 'Heavy Strike' && (taijutsuLevel || 0) < 10) return null;
    if (action.name === 'Dynamic Entry' && (taijutsuLevel || 0) < 15) return null;

    let staminaCost = action.staminaCost;
    if (action.name === 'Dash' || action.name === 'Create Distance') {
        const stats = combatant.source.currentStats;
        const reduction = 1 - ((stats.agility * 0.005) + (stats.stamina * 0.002));
        staminaCost = Math.max(1, Math.floor(staminaCost * reduction));
    }
    
    if (combatant.stamina < staminaCost || combatant.chakra < action.chakraCost) return null;
    if (action.tags.validRanges && !action.tags.validRanges.includes(combatState.range)) return null;

    return action;
}

function chooseCounterReaction(self, opponent, opponentAction) {
    const trapTag = self.tags.find(t => t.name === 'Trap Set');

    if (trapTag && opponentAction.name === 'Dash') {
        addToCombatLog(`**${opponent.name}** dashes forward... directly into the paper bomb trap set by **${self.name}**!`, 'event-message');
        
        const damage = trapTag.power || 75;
        opponent.health = Math.max(0, opponent.health - damage);
        opponent.posture = 'Exposed';
        self.resolve = Math.min(100, self.resolve + 20);
        opponent.resolve = Math.max(0, opponent.resolve - 25);

        addToCombatLog(`The explosion blasts **${opponent.name}** for **${damage}** damage! They are left Exposed!`, 'system-message error');

        self.tags = self.tags.filter(t => t.name !== 'Trap Set');
        return true;
    }

    return false;
}


function executeAction(attacker, action, target, isResolvingCast = false) {
    if (!action) action = JUTSU_LIBRARY['Guard'];

    const counterTriggered = chooseCounterReaction(target, attacker, action);
    if (counterTriggered) {
        updateUI();
        return;
    }

    if (action.name === 'Dash') {
        const trap = combatState.battlefield.tags.find(t => t.name === 'Hidden Paper Bomb' && t.owner !== attacker.id);
        if (trap) {
            addToCombatLog(`**${attacker.name}** dashes forward... directly into a hidden paper bomb!`, 'event-message');
            const damage = trap.power;
            attacker.health = Math.max(0, attacker.health - damage);
            attacker.posture = 'Exposed';
            addToCombatLog(`The explosion blasts **${attacker.name}** for **${damage}** damage, leaving them Exposed!`, 'system-message error');
            
            combatState.battlefield.tags = combatState.battlefield.tags.filter(t => t !== trap);
            updateUI();
            return;
        }
    }

    trackJutsuUsage(combatState, action);

    if (!attacker.recentActions) {
        attacker.recentActions = [];
    }
    attacker.recentActions.push(action.name);
    if (attacker.recentActions.length > 5) {
        attacker.recentActions.shift();
    }

    if (action.requiresItem) {
        if (attacker.isPlayer) {
            removeItemFromInventory(action.requiresItem.id, 1);
        }
        addToCombatLog(`(${action.requiresItem.id} consumed)`, 'system-message');
    }

    if (action.tags.complexity !== 'None' && !isResolvingCast) {
        let castTicks = 2;
        if (action.tags.complexity === 'Simple') castTicks = 1;
        if (action.tags.complexity === 'Complex') castTicks = 3;
        
        const handSealSkill = attacker.isPlayer ? attacker.source.skills?.chakra.HandSealSpeed.level : (attacker.skillLevels?.Ninjutsu || 0);
        castTicks -= Math.floor(handSealSkill / 20);
        castTicks = Math.max(1, castTicks);

        attacker.casting = { action, target, ticksLeft: castTicks };
        attacker.posture = 'Casting';
        addToCombatLog(`**${attacker.name}** begins weaving hand seals for **${action.name}**!`, "system-message");
        updateUI();
        return;
    }
    
    let staminaCost = action.staminaCost;
    if (action.name === 'Dash' || action.name === 'Create Distance') {
        const stats = attacker.source.currentStats;
        const reduction = 1 - ((stats.agility * 0.005) + (stats.stamina * 0.002));
        staminaCost = Math.max(1, Math.floor(staminaCost * reduction));
    }
    
    attacker.chakra -= action.chakraCost || 0;
    attacker.stamina -= staminaCost || 0;
    attacker.posture = (action.tags.effect === 'PostureReinforce') ? 'Guarded' : 'Mobile';

    addToCombatLog(`**${attacker.name}** uses **${action.name}**!`, "system-message");

    if (action.name === 'Guard') {
        const staminaRecovery = attacker.maxStamina * 0.10;
        attacker.stamina = Math.min(attacker.maxStamina, attacker.stamina + staminaRecovery);
        attacker.resolve = Math.min(100, attacker.resolve + 3);
        addToCombatLog(`**${attacker.name}** catches their breath, recovering stamina.`, 'system-message success');
        updateUI();
        return;
    }

    if (action.effect?.battlefieldEffect) {
        const effect = action.effect.battlefieldEffect;
        if (!combatState.battlefield.tags.some(t => t.name === effect.name)) {
            combatState.battlefield.tags.push({ ...effect });
            addToCombatLog(`The battlefield is now covered in **${effect.name}**!`, 'event-message');
        }
    }

    if (action.effect?.rangeChange && action.effect.rangeChange !== combatState.range) {
        combatState.range = action.effect.rangeChange;
        addToCombatLog(`The range is now **${combatState.range}**.`, "event-message");
    }
    
    if (action.type === 'Offensive' && target) {
        const reaction = chooseReaction(target, attacker, action);
        if (reaction) {
            executeAction(target, reaction, attacker); 
            return;
        }


        if (target.casting) {
            addToCombatLog(`The attack shatters **${target.name}**'s concentration, interrupting their jutsu! They are left Exposed!`, "event-message");
            target.casting = null;
            target.posture = 'Exposed';
            target.resolve = Math.max(0, target.resolve - 30);
            target.aggression = Math.max(0, target.aggression - 20);
        }

        const defenseTag = combatState.battlefield.tags.find(t => t.name.includes('Wall') || t.name.includes('Dome'));
        const effectTag = action.tags.effect;
        const isProjectileOrAoE = (effectTag === 'Projectile' || effectTag === 'AoE' || effectTag === 'MultiProjectile' || effectTag === 'LineAoE');

        if (defenseTag && isProjectileOrAoE) {
            const rankValues = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };
            const attackRank = rankValues[action.rank] || 0;
            const defenseRank = rankValues[defenseTag.rank] || 0;
            const rankDifference = attackRank - defenseRank;
            if (rankDifference < 0) {
                addToCombatLog(`The attack is completely nullified by the superior **${defenseTag.name}**!`, "system-message success");
                return;
            }
            let bypassChance = 0.15 + (rankDifference * 0.30);
            if (Math.random() > bypassChance) {
                addToCombatLog(`The attack is deflected by the **${defenseTag.name}**!`, "system-message success");
                return;
            }
            let penetrationChance = rankDifference * 0.20;
            if (Math.random() < penetrationChance) {
                addToCombatLog(`The jutsu is so powerful it **shatters** the **${defenseTag.name}**!`, "event-message");
                combatState.battlefield.tags = combatState.battlefield.tags.filter(t => t.name !== defenseTag.name);
            } else {
                addToCombatLog(`The attack punches through the **${defenseTag.name}** but loses some of its power...`, "system-message warning");
                action = { ...action, basePower: action.basePower * 0.25 };
            }
        }

        let hit = true;
        const evasionChance = (target.source.currentStats.agility - attacker.source.currentStats.perception) * 0.01;
        if (target.posture === 'Mobile' && Math.random() < evasionChance) {
            addToCombatLog(`**${target.name}** dodges!`, "system-message success");
            hit = false;
            attacker.aggression = Math.max(0, attacker.aggression - 15);
            target.aggression = Math.min(100, target.aggression + 10);
            target.resolve = Math.min(100, target.resolve + 5);
        }

        if (hit) {
            let damageMultiplier = 1.0;
            
            const disguiseTagIndex = attacker.tags.findIndex(t => t.name === 'Disguised');
            if (disguiseTagIndex !== -1) {
                addToCombatLog(`Dropping the disguise, **${attacker.name}** strikes from an unexpected angle!`, 'event-message');
                damageMultiplier *= 1.75;
                target.resolve = Math.max(0, target.resolve - 15);
                attacker.tags.splice(disguiseTagIndex, 1);
            }

            const desperation = getDesperationBonus(attacker);
            damageMultiplier *= desperation.damageMultiplier;

            let resolveDamage = 5;
            if (target.posture === 'Exposed' || target.posture === 'Casting') {
                damageMultiplier *= 1.5;
                resolveDamage = 15;
            }
            if (target.tags.some(t => t.name === 'Airborne') && action.tags.keywords?.includes('Follow Up')) {
                damageMultiplier *= 2.0;
                resolveDamage = 20;
                addToCombatLog(`A direct hit on the airborne target!`, "event-message");
            }

            let damage = action.basePower + (action.tags.range === 'Melee' ? attacker.source.currentStats.strength * 0.5 : attacker.source.currentStats.intellect * 0.5);
            const finalDamage = Math.round(damage * damageMultiplier);
            target.health = Math.max(0, target.health - finalDamage);
            addToCombatLog(`It hits **${target.name}** for ${finalDamage} damage!`, "system-message error");

            attacker.aggression = Math.min(100, attacker.aggression + 15);
            attacker.resolve = Math.min(100, attacker.resolve + 5);
            target.aggression = Math.max(0, target.aggression - 10);
            target.resolve = Math.max(0, target.resolve - resolveDamage);
            
            if (action.effect?.appliesTag && Math.random() < action.effect.appliesTag.chance) {
                target.tags.push({ ...action.effect.appliesTag });
                addToCombatLog(`**${target.name}** is **${action.effect.appliesTag.name}**!`, "system-message warning");
                if (action.effect.appliesTag.name === 'Launched') {
                    target.tags.push({ name: 'Airborne', duration: 2 });
                }
            }
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
        // Handle victory logic (XP, familiarity, etc.)
    } else {
        const injuryId = 'knocked_unconscious_severe';
        const { applyInjury } = await import('./characterEffects.js');
        // This now sets the 'Incapacitated' state correctly and authoritatively.
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

    // The ONLY job of endCombat is to report back to whoever started it.
    if (combatState.onCombatEndCallback) {
        const callback = combatState.onCombatEndCallback;
        combatState.onCombatEndCallback = null;
        callback(victory);
    }
    
    // *** DECOUPLING STEP 2: Restore the game mode, allowing the main loop to resume. ***
    gameState.mode = 'Simulating';
}

function debugCombatState() {
    console.log(`=== COMBAT DEBUG (Tick ${combatState.tick}) ===`);
    console.log(`Range: ${combatState.range}`);
    console.log(`Battlefield Tags: ${combatState.battlefield.tags.map(t => `${t.name}(${t.duration})`).join(', ') || 'None'}`);
    combatState.combatants.forEach(c => {
        console.log(`- ${c.name}: HP=${Math.round(c.health)}/${c.maxHealth}, CHK=${Math.round(c.chakra)}, STM=${Math.round(c.stamina)}`);
        console.log(`  Stance=${determineStance(c)}, Posture=${c.posture}, Tags: ${c.tags.map(t => `${t.name}(${t.duration})`).join(', ') || 'None'}`);
    });
    console.log('====================');
}