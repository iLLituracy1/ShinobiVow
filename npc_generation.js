// npc_generation.js

import { JUTSU_LIBRARY, ELEMENTS, NPC_EQUIPMENT_LOADOUTS } from './constants.js';

const RANK_TEMPLATES = {
    'Genin': {
        totalAttributesRange: [300, 400],
        skillLevelRange: { main: [10, 20], secondary: [5, 10] },
        jutsuAllotment: { 'E-Rank': 'all', 'D-Rank Elemental': 2, 'D-Rank Generic': 1 }
    },
    'Chunin': {
        totalAttributesRange: [500, 700],
        skillLevelRange: { main: [30, 45], secondary: [15, 25] },
        jutsuAllotment: { 'E-Rank': 'all', 'D-Rank Elemental': 'all', 'D-Rank Generic': 2, 'C-Rank Elemental': 2, 'C-Rank Generic': 1 }
    },
    'Jonin': {
        totalAttributesRange: [800, 1050],
        skillLevelRange: { main: [50, 70], secondary: [30, 45] },
        jutsuAllotment: { 'E-Rank': 'all', 'D-Rank': 'all', 'C-Rank Elemental': 'all', 'C-Rank Generic': 2, 'B-Rank Elemental': 2, 'B-Rank Generic': 1 }
    }
};

export const ARCHETYPES = {
    'Brawler': {
        statWeights: { strength: 4, agility: 3, stamina: 3, chakraPool: 1, intellect: 1, perception: 2, willpower: 2 },
        primarySkill: 'Taijutsu', 
        primaryElement: null,
        disallowedCategories: ['Ninjutsu', 'Genjutsu'] // Brawlers don't learn these.
    },
    'Ninjutsu Specialist': {
        statWeights: { strength: 1, agility: 2, stamina: 1, chakraPool: 4, intellect: 3, perception: 4, willpower: 3 },
        primarySkill: 'Ninjutsu', 
        primaryElement: 'random'
    },
    'Assassin': {
        statWeights: { strength: 2, agility: 4, stamina: 3, chakraPool: 2, intellect: 2, perception: 3, willpower: 2 },
        primarySkill: 'Taijutsu', 
        primaryElement: 'Wind'
    }
};

export const ARCHETYPE_LIST = Object.keys(ARCHETYPES);

export function generateShinobi(rank, archetype) {
    const template = RANK_TEMPLATES[rank];
    const arch = ARCHETYPES[archetype];
    if (!template || !arch) return null;

    const shinobi = {};

    const totalAttributes = Math.random() * (template.totalAttributesRange[1] - template.totalAttributesRange[0]) + template.totalAttributesRange[0];
    const totalWeight = Object.values(arch.statWeights).reduce((sum, weight) => sum + weight, 0);
    const baseStatValue = totalAttributes / totalWeight;
    
    shinobi.currentStats = {};
    for (const stat in arch.statWeights) {
        shinobi.currentStats[stat] = parseFloat((baseStatValue * arch.statWeights[stat]).toFixed(1));
    }

    shinobi.skillLevels = {};
    const mainSkillLvl = Math.floor(Math.random() * (template.skillLevelRange.main[1] - template.skillLevelRange.main[0]) + template.skillLevelRange.main[0]);
    const secondarySkillLvl = Math.floor(Math.random() * (template.skillLevelRange.secondary[1] - template.skillLevelRange.secondary[0]) + template.skillLevelRange.secondary[0]);
    
    if (arch.primarySkill === 'Taijutsu') {
        shinobi.skillLevels.Taijutsu = mainSkillLvl;
        shinobi.skillLevels.Ninjutsu = secondarySkillLvl;
    } else {
        shinobi.skillLevels.Taijutsu = secondarySkillLvl;
        shinobi.skillLevels.Ninjutsu = mainSkillLvl;
    }

    const primaryElement = arch.primaryElement === 'random' 
        ? ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)] 
        : arch.primaryElement;

    shinobi.knownJutsu = new Set();
    const allotment = template.jutsuAllotment;
    
    for (const jutsuName in JUTSU_LIBRARY) {
        const jutsu = JUTSU_LIBRARY[jutsuName];
        if (allotment['E-Rank'] === 'all' && jutsu.rank === 'E') shinobi.knownJutsu.add(jutsuName);
        if (allotment['D-Rank'] === 'all' && jutsu.rank === 'D') shinobi.knownJutsu.add(jutsuName);
    }
    
    const addJutsuByCriteria = (rank, count, element = null, isGeneric = false) => {
        let potentialJutsu = Object.keys(JUTSU_LIBRARY).filter(name => {
            const j = JUTSU_LIBRARY[name];
            if (j.rank !== rank) return false;
            
            // --- NEW LOGIC: Check for disallowed categories ---
            if (arch.disallowedCategories && arch.disallowedCategories.includes(j.tags.category)) {
                return false;
            }
            // --- END NEW LOGIC ---

            if (isGeneric) return j.tags.element === 'Non-Elemental';
            return j.tags.element === element;
        });
        
        for (let i = 0; i < count && potentialJutsu.length > 0; i++) {
            const index = Math.floor(Math.random() * potentialJutsu.length);
            shinobi.knownJutsu.add(potentialJutsu[index]);
            potentialJutsu.splice(index, 1);
        }
    };

    if (allotment['D-Rank Elemental']) addJutsuByCriteria('D', allotment['D-Rank Elemental'] === 'all' ? 99 : allotment['D-Rank Elemental'], primaryElement);
    if (allotment['D-Rank Generic']) addJutsuByCriteria('D', allotment['D-Rank Generic'], null, true);
    if (allotment['C-Rank Elemental']) addJutsuByCriteria('C', allotment['C-Rank Elemental'] === 'all' ? 99 : allotment['C-Rank Elemental'], primaryElement);
    if (allotment['C-Rank Generic']) addJutsuByCriteria('C', allotment['C-Rank Generic'], null, true);
    if (allotment['B-Rank Elemental']) addJutsuByCriteria('B', allotment['B-Rank Elemental'], null, primaryElement);
    if (allotment['B-Rank Generic']) addJutsuByCriteria('B', allotment['B-Rank Generic'], null, true);
    
    shinobi.knownJutsu = Array.from(shinobi.knownJutsu);

    shinobi.equipment = {};
    const loadout = NPC_EQUIPMENT_LOADOUTS[rank];
    if (loadout) {
        for (const itemId in loadout) {
            const [min, max] = loadout[itemId];
            shinobi.equipment[itemId] = Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }

    shinobi.name = `Rogue ${rank} (${archetype})`;
    shinobi.opponentType = `rogue_${rank.toLowerCase()}`;
    shinobi.aiProfile = archetype;
    shinobi.maxHealth = (shinobi.currentStats.stamina * 10) + 50;
    shinobi.maxChakra = (shinobi.currentStats.chakraPool * 10) + 50;
    shinobi.maxStamina = (shinobi.currentStats.stamina * 5) + 50;
    
    return shinobi;
}