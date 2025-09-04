// mission.js - Handles all mission logic for Shinobi's Vow

import { updateTimeControlsUI, clearActionButtons, addToNarrative, addActionButton, showVillageMenu, updateUI } from './ui.js';
import { checkInventory, removeItemFromInventory } from './inventory.js';
import { MISSIONS, MISSION_PLANS, PERSONAL_CONTRIBUTIONS, COMMAND_TIERS, OPPONENT_LIBRARY } from './constants.js';
import { addXp } from './skills.js';
import { changeGameSpeed } from './game.js'; // Removed startGameLoop
import { getCharacterSkillValue } from './character.js';
import { applyInjury } from './characterEffects.js';
import { startCombat } from './combat.js';
import { generateShinobi, ARCHETYPE_LIST } from './npc_generation.js';

function assignMissionRoles(roster, requiredRoles) {
    let unassignedRoles = [...requiredRoles];
    let unassignedMembers = [...roster];

    unassignedMembers.sort((a, b) => {
        const rankA = a.currentRank === 'Jonin' ? 1 : (a.currentRank === 'Chunin' ? 2 : 3);
        const rankB = b.currentRank === 'Jonin' ? 1 : (b.currentRank === 'Chunin' ? 2 : 3);
        if (rankA !== rankB) return rankA - rankB;
        return a.dateOfLastPromotion - b.dateOfLastPromotion;
    });

    const leader = unassignedMembers.shift();
    leader.currentMissionRole = 'Leader';
    unassignedRoles.splice(unassignedRoles.indexOf('Leader'), 1);

    const roleSkillMap = {
        'Striker': 'Taijutsu',
        'Infiltrator': 'Stealth',
    };

    for (const role of Object.keys(roleSkillMap)) {
        if (unassignedRoles.includes(role) && unassignedMembers.length > 0) {
            const skill = roleSkillMap[role];
            unassignedMembers.sort((a, b) => getCharacterSkillValue(b, skill) - getCharacterSkillValue(a, skill));
            const specialist = unassignedMembers.shift();
            specialist.currentMissionRole = role;
            unassignedRoles.splice(unassignedRoles.indexOf(role), 1);
        }
    }

    unassignedMembers.forEach(member => {
        if (unassignedRoles.length > 0) {
            member.currentMissionRole = unassignedRoles.shift();
        } else {
            member.currentMissionRole = 'Subordinate';
        }
    });

    return roster;
}

export function checkForMissionAssignment() {
    const MISSION_CHANCE_PER_DAY = 0.05;
    if (Math.random() < MISSION_CHANCE_PER_DAY) {
        assignMission();
    }
}

function assignMission() {
    const char = gameState.character;
    const availableMissions = MISSIONS['D-Rank'];
    if (!availableMissions || availableMissions.length === 0) {
        console.error("No D-Rank missions available.");
        return;
    }

    const missionData = JSON.parse(JSON.stringify(availableMissions[Math.floor(Math.random() * availableMissions.length)]));
    missionData.progress = 0;
    missionData.duration = Math.floor(Math.random() * (missionData.durationInDays[1] - missionData.durationInDays[0] + 1)) + missionData.durationInDays[0];
    missionData.triggeredEventIndices = []; 

    char.currentMission = missionData;

    changeGameSpeed(1);
    addToNarrative(`**MISSION ASSIGNED!** A runner from the mission desk hands you a scroll.`, "event-message");
    addToNarrative(`**${missionData.name} (D-Rank):** ${missionData.description}`, "system-message");

    const roster = [
        char, 
        { ...char.team.sensei, currentRank: 'Jonin', dateOfLastPromotion: 0 },
        { ...char.team.teammates[0], currentRank: 'Genin', dateOfLastPromotion: char.dateOfLastPromotion + 1 },
        { ...char.team.teammates[1], currentRank: 'Genin', dateOfLastPromotion: char.dateOfLastPromotion + 2 }
    ];

    assignMissionRoles(roster, missionData.requiredRoles);
    
    const leader = roster.find(m => m.currentMissionRole === 'Leader');
    
    triggerMissionBriefing(leader);
}

async function triggerMissionBriefing(leader) {
    const char = gameState.character;
    gameState.time.isPaused = true;
    updateTimeControlsUI();
    clearActionButtons();
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    await delay(2000);
    addToNarrative(`Your team assembles. ${leader.name} takes command.`, "system-message");
    await delay(3000);
    
    const availablePlans = MISSION_PLANS["D-Rank"];
    const chosenPlan = availablePlans[Math.floor(Math.random() * availablePlans.length)];
    char.currentMission.plan = chosenPlan;

    addToNarrative(`**${leader.name}:** "Alright, listen up. Here's the plan for this mission: **${chosenPlan.name}**. ${chosenPlan.description}"`, "system-message success");
    await delay(4000);

    addToNarrative("How will you prepare for this mission?", "system-message");

    const availableContributions = [];
    const playerRole = char.currentMissionRole;

    PERSONAL_CONTRIBUTIONS.forEach(contrib => {
        const isRoleValid = !contrib.role || contrib.role === playerRole;
        if (isRoleValid) {
            const hasItemRequirement = contrib.requires;
            const canAffordItem = !hasItemRequirement || checkInventory(contrib.requires.itemId, contrib.requires.quantity);
            if (canAffordItem) {
                availableContributions.push(contrib);
            }
        }
    });

    availableContributions.forEach(contrib => {
        addActionButton(contrib.name, () => {
            char.currentMission.contribution = contrib;
            addToNarrative(`You chose to: ${contrib.description}`, "system-message");

            if (contrib.requires) {
                removeItemFromInventory(contrib.requires.itemId, contrib.requires.quantity);
                addToNarrative(`(${contrib.name} consumed.)`, "system-message");
            }
            
            clearActionButtons();
            char.currentActivity = `On Mission: ${char.currentMission.name}`;
            gameState.time.isPaused = false;
            updateUI();
        }, "game-button");
    });
}

function resolveMissionEvent(event) {
    const char = gameState.character;
    const mission = char.currentMission;

    addToNarrative(event.narrative, "event-message warning");

    const skillValue = getCharacterSkillValue(char, event.check.skill);
    let finalSkillValue = skillValue;

    const plan = mission.plan;
    if (plan && plan.tags) {
        const bonusSkill = plan.tags.bonus;
        const penaltySkill = plan.tags.penalty;
        const MODIFIER = 10; 

        if (bonusSkill === event.check.skill) {
            finalSkillValue += MODIFIER;
            addToNarrative(`(Plan Bonus: Your team's '${plan.name}' approach aids your effort.)`, "skill-gain-message");
        } else if (penaltySkill === event.check.skill) {
            finalSkillValue -= MODIFIER;
            addToNarrative(`(Plan Penalty: Your team's '${plan.name}' approach hinders your effort.)`, "system-message error");
        }
    }

    const success = finalSkillValue >= event.check.difficulty;

    if (success) {
        addToNarrative(event.success.narrative, "system-message success");
        return true;
    }

    addToNarrative(event.failure.narrative, "system-message error");
    
    if (event.failure.potentialInjuries) {
        for (const injuryInfo of event.failure.potentialInjuries) {
            if (Math.random() < injuryInfo.chance) {
                applyInjury(injuryInfo.id);
                break; 
            }
        }
    }

    if (event.failure.triggersCombat) {
        const opponentsToSpawn = [];
        event.failure.triggersCombat.opponents.forEach(opponentInfo => {
            let opponentData;
            let chosenArchetype = opponentInfo.archetype;
            if (chosenArchetype === 'random') {
                chosenArchetype = ARCHETYPE_LIST[Math.floor(Math.random() * ARCHETYPE_LIST.length)];
            }
            if (typeof opponentInfo === 'string') {
                opponentData = OPPONENT_LIBRARY[opponentInfo];
            } else if (typeof opponentInfo === 'object') {
                opponentData = generateShinobi(opponentInfo.rank, chosenArchetype);
            }
            if (opponentData) opponentsToSpawn.push(JSON.parse(JSON.stringify(opponentData)));
        });
        
        // *** THE NEW, DECOUPLED CALLBACK ***
        const onCombatEnd = (victory) => {
            // This function's ONLY job is to determine the mission outcome.
            // It does NOT touch the game loop or character state.
            if (victory) {
                addToNarrative("You defeated the rogue shinobi, but the target, Tora, escaped in the chaos.", "system-message");
                completeMission(false);
            } else {
                completeMission(false); 
            }
        };

        startCombat(opponentsToSpawn, onCombatEnd);
        return 'COMBAT_STARTED';
    }
    return false;
}


export function processMissionDay() {
    const char = gameState.character;
    const mission = char.currentMission;

    mission.progress++;
    addToNarrative(`Day ${mission.progress} of the mission begins. The team follows the plan: **${mission.plan.name}**.`, "system-message");

    if (mission.progress >= mission.duration) {
        let missionSuccess = true; 
        const finalEvent = mission.events.find(e => e.type === 'FinalEncounter');

        if (finalEvent) {
            const eventOutcome = resolveMissionEvent(finalEvent);
            
            if (eventOutcome === 'COMBAT_STARTED') {
                return;
            }
            missionSuccess = eventOutcome;
        } else {
            addToNarrative("The final day of the mission is here. You complete the objective without incident.", "system-message");
        }
        
        completeMission(missionSuccess);
        return;
    }

    const availableEvents = mission.events.filter((event, index) => 
        event.type === 'SkillCheck' && !mission.triggeredEventIndices.includes(index)
    );

    if (availableEvents.length > 0 && Math.random() > 0.3) {
        const eventToTrigger = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        const originalIndex = mission.events.findIndex(e => e === eventToTrigger);
        mission.triggeredEventIndices.push(originalIndex);

        const eventOutcome = resolveMissionEvent(eventToTrigger);

        if (eventOutcome === 'COMBAT_STARTED') {
            return;
        }

    } else {
        addToNarrative("The day passes uneventfully as you pursue the objective.", "system-message");
    }
}

function completeMission(wasSuccessful) {
    const char = gameState.character;
    const mission = char.currentMission;
    if (!mission) return;

    const FAILURE_XP_MULTIPLIER = 0.25; 

    if (wasSuccessful) {
        addToNarrative(`**MISSION COMPLETE: ${mission.name}**`, "system-message success");
        char.ryo += mission.baseRyoReward;
        addToNarrative(`You earned ${mission.baseRyoReward} Ryo.`, "skill-gain-message");
        for (const skill in mission.baseXpReward) {
            const xp = mission.baseXpReward[skill];
            const skillGroup = Object.keys(char.skills).find(group => char.skills[group]?.[skill]);
            if(skillGroup) {
                addXp(char.skills[skillGroup][skill], xp, skill);
            }
        }
        char.missionHistory.push({ name: mission.name, outcome: "Success" });
    } else {
        addToNarrative(`**MISSION FAILED: ${mission.name}**`, "system-message error");
        addToNarrative(`You failed to complete the primary objective. No Ryo will be awarded.`, "system-message");
        for (const skill in mission.baseXpReward) {
            const xp = Math.floor(mission.baseXpReward[skill] * FAILURE_XP_MULTIPLIER);
            const skillGroup = Object.keys(char.skills).find(group => char.skills[group]?.[skill]);
            if(skillGroup) {
                addXp(char.skills[skillGroup][skill], xp, skill);
            }
        }
        char.missionHistory.push({ name: mission.name, outcome: "Failure" });
    }

    char.currentMission = null;
    char.currentMissionRole = null;
    
    // Check if the character is already incapacitated. If they are, don't overwrite it.
    // This prevents the state conflict.
    if (char.currentActivity !== 'Incapacitated') {
        char.currentActivity = "Returning to Village"; 
    }
}