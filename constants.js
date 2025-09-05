// constants.js - Static data for Shinobi's Vow


// --- INJURY & STATUS EFFECT SYSTEM ---


export const INJURY_POOL = {
    // --- Minor Injuries (Heal naturally over time) ---
    'sprained_ankle_minor': {
        name: "Sprained Ankle",
        description: "A painful twist that makes quick, agile movements difficult and unreliable.",
        type: 'Physical',
        severity: 'Minor',
        durationInMinutes: 7 * 1440, // 7 days
        effects: [
            { type: 'STAT_MOD_PERCENT', stat: 'agility', modifier: -0.10 } // -10% Agility
        ]
    },
    'bruised_ribs_minor': {
        name: "Bruised Ribs",
        description: "Deep, aching bruises that make strenuous breathing and movement painful.",
        type: 'Physical',
        severity: 'Minor',
        durationInMinutes: 10 * 1440, // 10 days
        effects: [
            { type: 'STAT_MOD_PERCENT', stat: 'stamina', modifier: -0.10 } // -10% Stamina
        ]
    },
    'chakra_strain_minor': {
        name: "Chakra Strain",
        description: "Overexerting your chakra pathways has left them feeling raw and inefficient.",
        type: 'Chakra',
        severity: 'Minor',
        durationInMinutes: 5 * 1440, // 5 days
        effects: [
            { type: 'VITAL_MOD_PERCENT', vital: 'maxChakra', modifier: -0.15 } // -15% Max Chakra
        ]
    },

    // --- Severe Injuries (May require treatment to heal properly/quickly) ---
    'deep_gash_arm_severe': {
        name: "Deep Gash (Arm)",
        description: "A serious cut that hampers physical strength and won't stop bleeding on its own.",
        type: 'Physical',
        severity: 'Severe',
        durationInMinutes: 21 * 1440, // 21 days
        effects: [
            { type: 'STAT_MOD_PERCENT', stat: 'strength', modifier: -0.20 }, // -20% Strength
            { type: 'APPLY_STATUS', statusId: 'bleeding_moderate' }
        ]
    },
    'concussion_severe': {
        name: "Concussion",
        description: "A blow to the head has left you dizzy and disoriented. Your focus is shattered.",
        type: 'Physical',
        severity: 'Severe',
        durationInMinutes: 5 * 1440, // 5 days
        effects: [
            { type: 'STAT_MOD_PERCENT', stat: 'intellect', modifier: -0.25 },
            { type: 'STAT_MOD_PERCENT', stat: 'perception', modifier: -0.25 }
        ]
    },

    'knocked_unconscious_severe': {
        name: "Knocked Unconscious",
        description: "You were beaten into unconsciousness. Your body is battered and your mind is hazy. You were lucky to be rescued by your team.",
        type: 'Physical',
        severity: 'Severe',
        durationInMinutes: 7 * 1440,
        causesIncapacitation: true, 
        effects: [
            { type: 'STAT_MOD_PERCENT', stat: 'strength', modifier: -0.15 },
            { type: 'STAT_MOD_PERCENT', stat: 'agility', modifier: -0.15 },
            { type: 'STAT_MOD_PERCENT', stat: 'intellect', modifier: -0.10 }
        ]
    },

    // --- Permanent Injuries (Run-altering consequences) ---
    'severed_tendon_leg_permanent': {
        name: "Severed Tendon (Leg)",
        description: "A crippling injury that never fully healed. Your leg will never be as fast or reliable as it once was.",
        type: 'Physical',
        severity: 'Permanent',
        durationInMinutes: -1,
        effects: [
            { type: 'STAT_MOD_PERCENT', stat: 'agility', modifier: -0.30 } // Permanent -30% Agility
        ]
    },
    'damaged_chakra_pathway_permanent': {
        name: "Damaged Chakra Pathway",
        description: "A powerful jutsu backlash scarred your chakra network. Your control will never be as fine-tuned.",
        type: 'Chakra',
        severity: 'Permanent',
        durationInMinutes: -1,
        effects: [
            // This would require a new derived stat 'ChakraControlEfficiency' in the future.
            // For now, we simulate it by reducing the pool and willpower.
            { type: 'STAT_MOD_PERCENT', stat: 'chakraPool', modifier: -0.10 },
            { type: 'STAT_MOD_PERCENT', stat: 'willpower', modifier: -0.10 }
        ]
    },
};

/**
 * Defines all possible short-term status effects.
 * These are typically applied by injuries, jutsu, or environmental hazards.
 */
export const STATUS_EFFECT_POOL = {
    'bleeding_moderate': {
        name: "Bleeding",
        description: "Losing health at a steady rate from an open wound.",
        durationInMinutes: 3 * 1440, // Bleeding stops after 3 days if not treated
        effects: [
            { type: 'VITAL_DEGEN', vital: 'health', amountPerMinute: -0.05 }
        ]
    },
    'exhausted': {
        name: "Exhausted",
        description: "Your body is pushed to its limits, recovering stamina far slower than normal.",
        durationInMinutes: 1 * 1440, // 1 day
        effects: [
            // We'll need a new STAT_REGEN_MOD modifier type for this.
            // For now, we simulate with a temporary max stamina debuff.
            { type: 'VITAL_MOD_PERCENT', vital: 'maxStamina', modifier: -0.30 } // Placeholder
        ]
    },
    'disoriented': {
        name: "Disoriented",
        description: "Your senses are reeling, making it difficult to perceive threats accurately.",
        durationInMinutes: 60, // 1 hour
        effects: [
            { type: 'STAT_MOD_PERCENT', stat: 'perception', modifier: -0.50 }
        ]
    }
};


// --- Master Skill Definitions ---
// This defines the structure and category for all skills, making initialization and XP calculation data-driven.
export const SKILL_DEFINITIONS = {
    physical: {
        Taijutsu: { category: 'core', name: 'Taijutsu' },
        Shurikenjutsu: { category: 'core', name: 'Shurikenjutsu' },
    },
    subterfuge: {
        Stealth: { category: 'core', name: 'Stealth' },
    },
    social: {
        Teamwork: { category: 'core', name: 'Teamwork' },
    },
    chakra: {
        ChakraControl: { category: 'core', name: 'ChakraControl' },
        HandSealSpeed: { category: 'advanced', name: 'HandSealSpeed' },
        FormTransformation: { category: 'advanced', name: 'FormTransformation' },
        NatureTransformation: { category: 'master', name: 'NatureTransformation' },
        Genjutsu: { category: 'core', name: 'Genjutsu' },
        NinjutsuFire: { category: 'master', name: 'NinjutsuFire' },
        NinjutsuWater: { category: 'master', name: 'NinjutsuWater' },
        NinjutsuWind: { category: 'master', name: 'NinjutsuWind' },
        NinjutsuEarth: { category: 'master', name: 'NinjutsuEarth' },
        NinjutsuLightning: { category: 'master', name: 'NinjutsuLightning' },
    },
    academic: {
        NinjutsuTheory: { category: 'core', name: 'NinjutsuTheory' },
    },
    jutsu: {
        'Transformation Jutsu': { category: 'jutsu', name: 'Transformation Jutsu' },
        'Substitution Jutsu': { category: 'jutsu', name: 'Substitution Jutsu' },
        'Clone Jutsu': { category: 'jutsu', name: 'Clone Jutsu' }
    }
};

// Base XP costs for different skill categories
export const SKILL_CATEGORY_COSTS = {
    core: 1000,
    jutsu: 5000,
    advanced: 15000,
    master: 25000
};

// --- Training Directives (Placeholder for future expansion) ---
// This will be expanded to define XP/Stat gains for various directives,
// eliminating hardcoded values in handleDirectiveTraining.
export const TRAINING_DIRECTIVES = {
    // Genin Directives
    'Team Sparring': {
        xp: { Taijutsu: 0.6, Shurikenjutsu: 0.4, Teamwork: 0.3 }, // Multipliers for base xpAmount
        stats: { strength: 0.5, agility: 0.5, stamina: 0.5 }, // Multipliers for base statGain
        narrative: "You spend the morning in grueling team training drills with your sensei and squadmates."
    },
    'Formation Drills': {
        xp: { Teamwork: 0.5, NinjutsuTheory: 0.3, Stealth: 0.2 },
        stats: { intellect: 1.0, agility: 1.0 }
    },
    'Build Bonds': {
        xp: { Teamwork: 0.8 },
        stats: {} // No direct stat gain from this one
    },
    'Elemental Training': { // This will require specific affinity checks later
        xp: { ChakraControl: 0.3, NatureTransformation: 0.2 }, // Base multipliers, actual element skill XP is direct
        stats: { chakraPool: 0.5, willpower: 0.5 }
    },
    'Advanced Jutsu Research': {
        xp: { NinjutsuTheory: 0.7, HandSealSpeed: 0.1 },
        stats: { willpower: 1.0 }
    },
    // Academy / Individual Directives (these will map directly to a skillName for clarity)
    'Practice Taijutsu': {
        xp: { Taijutsu: 1.0 },
        stats: { strength: 1.0, agility: 1.0 }
    },
    'Practice Shurikenjutsu': {
        xp: { Shurikenjutsu: 1.0 },
        stats: { perception: 1.0, agility: 0.5 }
    },
    'Practice Chakra Control': {
        xp: { ChakraControl: 1.0 },
        stats: { chakraPool: 1.0, willpower: 1.0 }
    },
    'Academic Study': {
        xp: { NinjutsuTheory: 1.0 },
        stats: { intellect: 1.0 }
    },
    'Resting': { // Special directive for resting
        xp: {},
        stats: {},
        vitalsRegen: { health: 0.1, chakra: 0.2, morale: 0.05 } // Base per minute regen
    }
};

// --- Shinobi Economy & Logistics Data ---

export const ITEMS = {
    'kunai': {
        id: 'kunai',
        name: 'Kunai',
        type: 'Weapon',
        description: 'A standard-issue, multi-purpose combat knife. Essential for any shinobi.',
        maxStack: 20, // Can now stack up to 20 individual kunai
        effect: { type: 'STAT_MOD', category: 'BASE_DAMAGE', value: 2 }
    },
    'shuriken': {
        id: 'shuriken',
        name: 'Shuriken',
        type: 'Weapon',
        description: 'A small, concealable throwing star for silent attacks and distractions.',
        maxStack: 20,
        effect: { type: 'STAT_MOD', category: 'RANGED_ACCURACY', value: 1 }
    },
    'smoke_bomb': {
        id: 'smoke_bomb',
        name: 'Smoke Bomb',
        type: 'Tool',
        description: 'Creates a thick cloud of smoke to obscure vision, perfect for escapes or creating diversions.',
        maxStack: 5,
        effect: { type: 'UNLOCK_MISSION_CHOICE', choiceId: 'CREATE_DIVERSION' }
    },
    'paper_bomb': {
        id: 'paper_bomb',
        name: 'Paper Bomb',
        type: 'Tool',
        description: 'An explosive tag that can be used for traps or direct assaults.',
        maxStack: 5,
        effect: { type: 'UNLOCK_MISSION_CHOICE', choiceId: 'SET_TRAP' }
    },
    'first_aid_kit': {
        id: 'first_aid_kit',
        name: 'First-Aid Kit',
        type: 'Consumable',
        description: 'A kit with bandages and salves to treat minor wounds in the field.',
        maxStack: 3,
        effect: { type: 'UNLOCK_MISSION_CHOICE', choiceId: 'TREAT_WOUNDS' }
    },
    'Shinobi Headband': {
        id: 'Shinobi Headband',
        name: 'Shinobi Headband',
        type: 'Headband',
        description: 'A headband with an engraved symbol of the shinobi village it belongs to, worn by the official ninja of that village.',
        maxStack: 1,
        effect: null
    }
};

/**
 * Defines what is sold in the Shinobi Tool Shop.
 * This decouples the shop's offerings from the core item definitions.
 */
export const SHOP_ITEMS = {
    'buy_kunai_bundle': {
        name: 'Kunai Bundle (10)',
        cost: 150,
        grants: { itemId: 'kunai', quantity: 10 }
    },
    'buy_shuriken_bundle': {
        name: 'Shuriken Bundle (10)',
        cost: 150,
        grants: { itemId: 'shuriken', quantity: 10 }
    },
    'buy_smoke_bomb': {
        name: 'Smoke Bomb',
        cost: 250,
        grants: { itemId: 'smoke_bomb', quantity: 1 }
    },
    'buy_paper_bomb': {
        name: 'Paper Bomb',
        cost: 350,
        grants: { itemId: 'paper_bomb', quantity: 1 }
    },
    'buy_first_aid_kit': {
        name: 'First-Aid Kit',
        cost: 400,
        grants: { itemId: 'first_aid_kit', quantity: 1 }
    }
};


/**
 * Defines the standard-issue equipment a character receives upon graduating to Genin.
 */
export const GENIN_STARTER_PACK = [
    { id: 'kunai', quantity: 10 },
    { id: 'shuriken', quantity: 10 },
    { id: 'paper_bomb', quantity: 2 },
    { id: 'Shinobi Headband', quantity: 1 }
];

// ... rest of the file ...

export const PERSONAL_CONTRIBUTIONS = [
    { 
        id: 'standard_prep', 
        name: 'Standard Preparations', 
        description: 'You perform standard checks on your gear and mentally prepare for the mission ahead.', 
        effect: { type: 'MORALE_MOD', value: 5 } 
    },
    { 
        id: 'double_maps', 
        name: 'Double-check Maps', 
        description: 'Careful study of the mission area can prevent getting lost, providing a bonus to navigation-related Perception checks.', 
        effect: { type: 'SKILL_CHECK_BONUS', skill: 'Perception', context: 'Navigation', value: 10 } 
    },
    { 
        id: 'use_first_aid', 
        name: '[Use] First-Aid Kit', 
        description: 'You prepare a well-stocked medical kit, allowing you to treat minor wounds in the field.', 
        requires: { itemId: 'first_aid_kit', quantity: 1 },
        effect: { type: 'UNLOCK_CMI', id: 'FieldMedicine' }
    },
    { 
        id: 'use_smoke_bomb', 
        name: '[Use] Smoke Bomb', 
        description: 'You ready a smoke bomb for a potential diversion or escape.', 
        requires: { itemId: 'smoke_bomb', quantity: 1 },
        effect: { type: 'UNLOCK_CMI', id: 'DeploySmoke' }
    },
    { 
        id: 'use_paper_bomb', 
        name: '[Use] Paper Bomb', 
        description: 'You prepare an explosive tag for a potential trap.', 
        requires: { itemId: 'paper_bomb', quantity: 1 },
        effect: { type: 'UNLOCK_CMI', id: 'SetExplosiveTrap' }
    },
    { role: "Striker", name: "Sharpen Weapons", description: "Meticulously honed blades deal more decisive blows in combat.", effect: { type: "COMBAT_MOD", mod: "Damage", value: 1.1 } },
    { role: "Infiltrator", name: "Prepare Disguise Kit", description: "A convincing disguise can bypass guards and open doors that force cannot.", effect: { type: "UNLOCK_CMI", id: "ApplyDisguise" } }
];

// JUTSU ACTION NARRATIVES

export const ACTION_NARRATIVES = {
    // --- E-Rank & Core Actions ---
    'Strike': [
        { text: "With a sharp cry, **{attacker}** closes the distance, launching a swift strike at **{target}**!", weight: 1.0 },
        { text: "**{attacker}** aims a precise, disciplined blow toward **{target}**'s guard!", weight: 1.0 },
        { text: "Exploding forward, **{attacker}** unleashes a flurry of Taijutsu against **{target}**!", weight: 0.8 }
    ],
    'Guard': [
        { text: "**{attacker}** takes a defensive stance, catching their breath and watching **{target}**'s every move.", weight: 1.0 },
        { text: "**{attacker}** raises their guard, focusing on recovering stamina for the next exchange.", weight: 1.0 }
    ],
    'Substitution Jutsu': [
        { text: "In a puff of smoke, **{attacker}** vanishes, a log taking the brunt of the attack!", weight: 1.0 },
        { text: "Just before impact, **{attacker}**'s form dissolves into a flock of crows, evading the technique!", weight: 0.7 }
    ],
    'Create Distance': [
        { text: "**{attacker}** backflips away from **{target}**, creating space.", weight: 1.0 },
        { text: "Seeing an opening, **{attacker}** disengages, leaping back to a safer distance.", weight: 1.0 }
    ],
    'Dash': [
        { text: "**{attacker}** bursts forward, closing the gap with **{target}** in an instant!", weight: 1.0 },
        { text: "With a flicker of movement, **{attacker}** rushes towards **{target}** to engage in close combat!", weight: 1.0 }
    ],
    'Clone Jutsu': [
        { text: "With a simple hand seal, illusory copies of **{attacker}** flicker into existence, surrounding **{target}**!", weight: 1.0 },
        { text: "**{attacker}** creates a diversion, forming several clones to confuse **{target}**.", weight: 1.0 }
    ],
    'Attempt to Escape Grapple': [
        { text: "**{attacker}** struggles fiercely, trying to break **{target}**'s hold!", weight: 1.0 },
        { text: "With a surge of strength, **{attacker}** attempts to escape the grapple!", weight: 1.0 }
    ],
    'Transformation Jutsu': [
        { text: "**{attacker}** is enveloped in smoke, emerging disguised and ready to deceive **{target}**.", weight: 1.0 },
        { text: "Weaving a simple seal, **{attacker}**'s form shimmers and changes, creating a perfect illusion.", weight: 1.0 }
    ],
    'Analyze': [
        { text: "**{attacker}**'s eyes narrow, carefully studying **{target}**'s posture and movements for any weakness.", weight: 1.0 },
        { text: "Taking a moment to observe, **{attacker}** analyzes **{target}**'s fighting style, seeking an opening.", weight: 1.0 }
    ],
    'Throw Kunai': [
        { text: "In a flash of steel, **{attacker}** sends a kunai spinning through the air towards **{target}**!", weight: 1.0 },
        { text: "**{attacker}** makes a quick, practiced motion, loosing a deadly kunai at **{target}**!", weight: 1.0 }
    ],
    'Throw Shuriken': [
        { text: "With a flick of the wrist, **{attacker}** hurls a shuriken at **{target}**.", weight: 1.0 },
        { text: "**{attacker}** unleashes a sharp, star-shaped projectile aimed at **{target}**.", weight: 1.0 }
    ],
    'Set Paper Bomb Trap': [
        { text: "**{attacker}** discreetly places a paper bomb, setting a deadly trap for **{target}**.", weight: 1.0 },
        { text: "With deft fingers, **{attacker}** rigs an explosive surprise for an unwary **{target}**.", weight: 1.0 }
    ],
        'Block': [
        { text: "Reading the attack, **{attacker}** raises their arms, bracing for the impact of **{target}**'s blow!", weight: 1.0 },
        { text: "With a grunt, **{attacker}** intercepts the strike, attempting to parry **{target}**'s Taijutsu.", weight: 1.0 }
    ],
    'Dodge': [
        { text: "**{attacker}** ducks under the punch, the attack whistling past their ear!", weight: 1.0 },
        { text: "With a burst of agility, **{attacker}** sways aside, narrowly dodging **{target}**'s attack.", weight: 1.0 }
    ],

    // --- D-Rank Jutsu ---
    'Heavy Strike': [
        { text: "**{attacker}** puts their full weight into a powerful, guard-shattering blow aimed at **{target}**!", weight: 1.0 },
        { text: "Gathering their strength, **{attacker}** swings a heavy strike, hoping to leave **{target}** exposed!", weight: 1.0 }
    ],
    'Leaf Whirlwind': [
        { text: "**{attacker}** spins low, launching a swift kick at **{target}**'s legs with the Leaf Whirlwind!", weight: 1.0 }
    ],
    'Taijutsu: Takedown': [
        { text: "**{attacker}** lunges low, aiming to grapple **{target}** and drag them to the ground!", weight: 1.0 }
    ],
    'Body Flicker Technique': [
        { text: "**{attacker}** vanishes in a blur of speed, reappearing instantly at a new position.", weight: 1.0 }
    ],
    'Fire Style: Ember Jutsu': [
        { text: "**{attacker}** spits a small but potent ember at **{target}**.", weight: 1.0 }
    ],
    'Fire Style: Flame Bullet Jutsu': [
        { text: "**{attacker}** shoots a concentrated ball of fire at **{target}**.", weight: 1.0 }
    ],
    'Water Style: Rushing Water Jutsu': [
        { text: "**{attacker}** releases a jet of water, aiming to knock **{target}** off balance.", weight: 1.0 }
    ],
    'Water Style: Mist Veil Jutsu': [
        { text: "**{attacker}** exhales a light mist, slightly obscuring the battlefield.", weight: 1.0 }
    ],
    'Wind Style: Gale Palm Jutsu': [
        { text: "**{attacker}** claps their hands, sending a powerful gust of wind towards **{target}**!", weight: 1.0 }
    ],
    'Wind Style: Wind Cutter Jutsu': [
        { text: "**{attacker}** creates a sharp blade of wind and sends it slicing towards **{target}**.", weight: 1.0 }
    ],
    'Earth Style: Mud-Shot Jutsu': [
        { text: "**{attacker}** spits a glob of thick mud, aiming to slow **{target}** down.", weight: 1.0 }
    ],
    'Earth Style: Stone Bullet Jutsu': [
        { text: "**{attacker}** fires a hard-packed projectile of rock and dirt at **{target}**.", weight: 1.0 }
    ],
    'Lightning Style: Static Spark Jutsu': [
        { text: "**{attacker}** channels a crackling spark of lightning towards **{target}**.", weight: 1.0 }
    ],
    'Lightning Style: Shock Wave Jutsu': [
        { text: "**{attacker}** discharges a small wave of electricity, trying to stun **{target}**.", weight: 1.0 }
    ],
    'Genjutsu: False Surroundings': [
        { text: "**{attacker}** attempts to trap **{target}** in a simple illusion, altering their perception of the terrain.", weight: 1.0 }
    ],
    
    // --- C-Rank Jutsu ---
    'Shadow Shuriken Jutsu': [
        { text: "**{attacker}** throws a shuriken, which conceals a second, hidden blade in its shadow!", weight: 1.0 }
    ],
    'Fire Style: Great Fireball Jutsu': [
        { text: "**{attacker}**'s hands blur through seals before they exhale a massive, roaring fireball at **{target}**!", weight: 1.0 },
        { text: "Gathering immense chakra, **{attacker}** unleashes the devastating Great Fireball Jutsu!", weight: 1.0 }
    ],
    'Fire Style: Phoenix Flower Jutsu': [
        { text: "**{attacker}** sends a volley of small, guided fireballs, like a flock of burning birds, towards **{target}**.", weight: 1.0 }
    ],
    'Fire Style: Burning Ash Jutsu': [
        { text: "**{attacker}** exhales a cloud of superheated ash, attempting to engulf **{target}** in the suffocating haze.", weight: 1.0 }
    ],
    'Water Style: Water Bullet Jutsu': [
        { text: "**{attacker}** spits a powerful, high-pressure sphere of water at **{target}**.", weight: 1.0 }
    ],
    'Water Style: Wild Water Wave Jutsu': [
        { text: "**{attacker}** summons a crashing wave to sweep over the battlefield and smash into **{target}**.", weight: 1.0 }
    ],
    'Water Style: Hidden Mist Jutsu': [
        { text: "**{attacker}** blankets the area in a thick, chakra-infused mist, blinding **{target}**.", weight: 1.0 }
    ],
    'Wind Style: Great Breakthrough Jutsu': [
        { text: "**{attacker}** creates a powerful, gale-force wind to blast **{target}** and everything else away!", weight: 1.0 }
    ],
    'Wind Style: Pressure Damage Jutsu': [
        { text: "A sphere of chaotic, pressurized wind forms around **{attacker}** before violently expanding towards **{target}**.", weight: 1.0 }
    ],
    'Earth Style: Headhunter Jutsu': [
        { text: "**{attacker}** dives into the earth, attempting to ambush **{target}** from below and trap them.", weight: 1.0 }
    ],
    'Earth Style: Mud Wall Jutsu': [
        { text: "**{attacker}** slams their hands on the ground, and a thick wall of earth erupts to provide cover!", weight: 1.0 }
    ],
    'Earth Style: Rock Shelter Jutsu': [
        { text: "**{attacker}** creates a protective dome of rock around themself, bracing for an attack.", weight: 1.0 }
    ],
    'Lightning Style: Lightning Ball Jutsu': [
        { text: "A condensed ball of pure lightning forms in **{attacker}**'s hand before being shot at **{target}**.", weight: 1.0 }
    ],
    'Lightning Style: Thunderclap Jutsu': [
        { text: "**{attacker}** unleashes a deafening thunderclap, aiming to disorient **{target}** with sound and shock.", weight: 1.0 }
    ],
    'Genjutsu: Demonic Illusion': [
        { text: "**{attacker}** makes eye contact, attempting to trap **{target}** in a nightmarish genjutsu.", weight: 1.0 }
    ],
    'Genjutsu: Bringer of Darkness': [
        { text: "**{attacker}** casts an illusion that plunges **{target}** into a world of absolute, terrifying darkness.", weight: 1.0 }
    ],
    'Taijutsu: Dynamic Entry': [
        { text: "With a powerful shout, **{attacker}** launches a flying kick, a bold and reckless opening gambit against **{target}**!", weight: 1.0 }
    ],
    
    // --- B-Rank Jutsu ---
    'Fire Style: Dragon Flame Jutsu': [
        { text: "**{attacker}** launches a stream of fire that takes the form of a dragon's head, seeking to incinerate **{target}**.", weight: 1.0 }
    ],
    'Fire Style: Explosive Flame Jutsu': [
        { text: "**{attacker}** sends a specialized fireball that detonates with concussive force near **{target}**.", weight: 1.0 }
    ],
    'Water Style: Water Dragon Jutsu': [
        { text: "A vortex of water rises and takes the shape of a ferocious dragon, which **{attacker}** sends roaring towards **{target}**!", weight: 1.0 }
    ],
    'Water Style: Water Prison Jutsu': [
        { text: "**{attacker}** attempts to trap **{target}** in an inescapable sphere of water!", weight: 1.0 }
    ],
    'Wind Style: Vacuum Sphere Jutsu': [
        { text: "**{attacker}** inhales deeply and then fires several piercing bullets of compressed air at **{target}**.", weight: 1.0 }
    ],
    'Wind Style: Tornado Barrier Jutsu': [
        { text: "A swirling vortex of wind erupts around **{attacker}**, forming a barrier that deflects incoming attacks.", weight: 1.0 }
    ],
    'Earth Style: Earth Flow River Jutsu': [
        { text: "The ground beneath **{target}** churns and liquifies into a raging river of mud at **{attacker}**'s command!", weight: 1.0 }
    ],
    'Earth Style: Stone Golem Jutsu': [
        { text: "Drawing rock and earth from the ground, **{attacker}** summons a hulking golem to fight by their side.", weight: 1.0 }
    ],
    'Lightning Style: Lightning Hound Jutsu': [
        { text: "**{attacker}** shapes raw lightning into the form of a hunting dog, which streaks across the field to attack **{target}**.", weight: 1.0 }
    ],
    'Lightning Style: Electromagnetic Barrier Jutsu': [
        { text: "**{attacker}** creates a crackling barrier of lightning that shocks anyone foolish enough to touch it.", weight: 1.0 }
    ],
    'Genjutsu: Temple of Nirvana': [
        { text: "**{attacker}** casts a wide-ranging illusion, causing phantom feathers to rain from the sky, lulling **{target}** into a deep slumber.", weight: 1.0 }
    ],
    'Taijutsu: Leaf Hurricane': [
        { text: "**{attacker}** unleashes the Leaf Hurricane, a devastating series of spinning kicks that batters **{target}** from all sides!", weight: 1.0 }
    ],

    // --- Default Fallback ---
    'default': [
        { text: "**{attacker}** uses **{action}** against **{target}**!", weight: 1.0 }
    ]
};

/**
 * Defines the elemental strengths and weaknesses.
 * The key is strong against the value.
 */
export const ELEMENTAL_RELATIONSHIPS = {
    'Fire': 'Wind',      // Fire is strong against Wind (fans the flames)
    'Wind': 'Lightning', // Wind is strong against Lightning (acts as an insulator)
    'Lightning': 'Earth',// Lightning is strong against Earth (courses through it)
    'Earth': 'Water',    // Earth is strong against Water (dams and contains it)
    'Water': 'Fire'      // Water is strong against Fire (extinguishes it)
};

// --- JUTSU LIBRARY ---

/**
 * Defines all learnable Jutsu in the game.
 * This is the central repository for combat techniques.
 */
export const JUTSU_LIBRARY = {
    // --- E-Rank: Core Tactical Actions ---
    'Strike': {
        name: 'Strike', rank: 'E', type: 'Offensive', chakraCost: 0, staminaCost: 5, basePower: 15,
        tags: {
            category: 'Taijutsu',
            element: 'Non-Elemental', effect: 'Standard', range: 'Melee', complexity: 'None',
            validRanges: ['Engaged'],
        },
        effect: { rangeChange: null }
    },
    'Guard': {
        name: 'Guard', rank: 'E', type: 'Defensive', chakraCost: 0, staminaCost: 5, basePower: 0,
        tags: {
            element: 'Non-Elemental', effect: 'PostureReinforce', range: 'Personal', complexity: 'None',
            validRanges: ['Engaged', 'Short', 'Mid', 'Long'], effect: { rangeChange: null }
        }
    },
    'Substitution Jutsu': {
        name: 'Substitution Jutsu', rank: 'E', type: 'Counter', chakraCost: 10, staminaCost: 5, basePower: 0, // MODIFIED: type is now Counter
        tags: {
            keywords: ['Reaction-Only'],
            element: 'Non-Elemental', effect: 'Evasion', range: 'Short', complexity: 'Simple',
            validRanges: ['Short', 'Mid', 'Long'],
        },
        effect: { rangeChange: 'Mid' }
    },
    'Create Distance': {
        name: 'Create Distance', rank: 'E', type: 'Supplementary', chakraCost: 0, staminaCost: 10, basePower: 0,
        tags: {
            element: 'Non-Elemental', effect: 'Evasion', range: 'Personal', complexity: 'None',
            validRanges: ['Engaged'],
        },
        effect: { rangeChange: 'Short' }
    },
'Dash': {
    name: 'Dash', rank: 'E', type: 'Supplementary', chakraCost: 0, staminaCost: 8, basePower: 0,
    tags: {
        element: 'Non-Elemental', effect: 'Movement', range: 'Short', complexity: 'None',
        validRanges: [ 'Mid', 'Long' ] 
    },
    effect: { rangeChange: 'Engaged' } 
},
'Clone Jutsu': {
    name: 'Clone Jutsu', rank: 'E', type: 'Supplementary', chakraCost: 5, staminaCost: 0, basePower: 0,
    tags: {
        element: 'Non-Elemental', effect: 'Illusion', range: 'Personal', complexity: 'Simple',
        validRanges: ['Engaged', 'Short', 'Mid', 'Long'],
    },
    effect: {
        rangeChange: null,
        // --- MODIFICATION: Clones are now a self-applied tag with ownership ---
        // This is no longer a battlefieldEffect. It's a personal buff/setup.
        appliesTag: { 
            name: 'Setup: Clones_Active', 
            chance: 1.0, 
            duration: 10 // Duration is now part of the tag
        }
    }
},
    'Attempt to Escape Grapple': {
        name: 'Attempt to Escape Grapple', rank: 'E', type: 'Supplementary', chakraCost: 0, staminaCost: 10, basePower: 0,
        tags: {
            category: 'Taijutsu',
            element: 'Non-Elemental', effect: 'Escape_Grapple', range: 'Melee', complexity: 'None',
            validRanges: ['Engaged'], // Can only be used while grappled, which is always 'Engaged'
        },
        effect: { 
            // This jutsu's effect is handled with special logic in executeAction
        }
    },
    // --- Innate Reactions ---

        'Block': {
        name: 'Block', rank: 'E', type: 'Defensive', chakraCost: 0, staminaCost: 10, basePower: 0,
        tags: {
            category: 'Innate', 
            element: 'Non-Elemental', effect: 'Damage_Reduction', range: 'Melee', complexity: 'None',
            keywords: ['Reaction-Only'], 
            validRanges: ['Engaged'],
        }
    },
    'Dodge': {
        name: 'Dodge', rank: 'E', type: 'Defensive', chakraCost: 0, staminaCost: 8, basePower: 0,
        tags: {
            category: 'Innate', 
            element: 'Non-Elemental', effect: 'Evasion', range: 'Melee', complexity: 'None',
            keywords: ['Reaction-Only'], 
            validRanges: ['Engaged'],
        },
                effect: {
            reposition: { newRange: 'Short', chance: 0.40 }
    }
},
'Transformation Jutsu': {
    name: 'Transformation Jutsu', rank: 'E', type: 'Supplementary', chakraCost: 5, staminaCost: 0, basePower: 0,
    tags: {
        element: 'Non-Elemental', effect: 'Deception', range: 'Personal', complexity: 'Simple', // MODIFIED: New 'Deception' effect tag
        validRanges: ['Engaged', 'Short', 'Mid', 'Long'],
    },
    effect: {
        // MODIFICATION: The effect is now a check, not a guaranteed tag.
        check: { type: 'PerceptionIntellect', difficulty: 35 } // Base difficulty to see through the initial cast.
    }
},

    'Analyze': {
        name: 'Analyze', rank: 'E', type: 'Supplementary', chakraCost: 0, staminaCost: 5, basePower: 0,
        tags: {
            category: 'Tactical',
            element: 'Non-Elemental', effect: 'Information_Gathering', range: 'All', complexity: 'None',
            validRanges: ['Engaged', 'Short', 'Mid', 'Long'],
        },
        effect: { 
            // Effect is handled with special logic in executeAction
        }
    },
    // --- E-Rank: Tool-Based Actions ---
'Throw Kunai': {
    name: 'Throw Kunai', rank: 'E', type: 'Offensive', chakraCost: 0, staminaCost: 3, basePower: 12,
    requiresItem: { id: 'kunai' }, // This action requires a kunai
    tags: {
        category: 'Tool',
        element: 'Non-Elemental', effect: 'Projectile', range: 'Short', complexity: 'None',
        validRanges: ['Short', 'Mid'],
    },
},
'Throw Shuriken': {
    name: 'Throw Shuriken', rank: 'E', type: 'Offensive', chakraCost: 0, staminaCost: 2, basePower: 9,
    requiresItem: { id: 'shuriken' }, // This action requires a shuriken
    tags: {
        category: 'Tool',
        element: 'Non-Elemental', effect: 'Projectile', range: 'Short', complexity: 'None',
        validRanges: ['Short', 'Mid'],
    },
},
'Set Paper Bomb Trap': {
    name: 'Set Paper Bomb Trap', rank: 'D', type: 'Supplementary', chakraCost: 5, staminaCost: 5, basePower: 0,
    requiresItem: { id: 'paper_bomb' },
    tags: {
        category: 'Tool',
        element: 'Non-Elemental', effect: 'Trap', range: 'Personal', complexity: 'Simple',
        validRanges: [ 'Mid', 'Long'],
    },
    effect: {
        // MODIFICATION: The tag is now more specific, indicating a setup is active.
        appliesTag: { name: 'Setup: Trap_Ready', chance: 1.0, duration: 4, power: 75 }
    }
},

    // --- D-Rank: Genin Fundamentals ---
    'Heavy Strike': {
        name: 'Heavy Strike', rank: 'D', type: 'Offensive', chakraCost: 0, staminaCost: 15, basePower: 25,
        tags: {
            category: 'Taijutsu',
            element: 'Non-Elemental', effect: 'StanceBreak', range: 'Melee', complexity: 'None', 
            keywords: ['Powerful'],
            validRanges: ['Engaged'], effect: { 
                rangeChange: null,
                appliesTag: { name: 'Launched', chance: 0.4, duration: 1 }
            }
        }
    },
    'Leaf Whirlwind': {
        name: 'Leaf Whirlwind', rank: 'D', type: 'Offensive', chakraCost: 0, staminaCost: 10, basePower: 10,
        tags: {
            category: 'Taijutsu',
            element: 'Non-Elemental', effect: 'StanceBreak', range: 'Melee', complexity: 'None', 
            keywords: ['Follow Up'],
            validRanges: ['Short'],
        },
        effect: { rangeChange: 'Engaged' }
    },
        'Taijutsu: Takedown': {
        name: 'Taijutsu: Takedown', rank: 'D', type: 'Offensive', chakraCost: 0, staminaCost: 20, basePower: 15,
        tags: {
            category: 'Taijutsu',
            element: 'Non-Elemental', effect: 'Grapple', range: 'Melee', complexity: 'None',
            keywords: ['Control'],
            validRanges: ['Engaged'],
        },
        effect: { 
            rangeChange: null,
            appliesTag: { name: 'Grappled', chance: 0.7, duration: 3 } // 70% chance to apply Grappled for 3 ticks
        }
    },
    'Body Flicker Technique': {
        name: 'Body Flicker Technique', rank: 'D', type: 'Supplementary', chakraCost: 10, staminaCost: 5, basePower: 0,
        tags: {
            element: 'Non-Elemental', effect: 'Movement', range: 'Short', complexity: 'Simple',
            validRanges: ['Engaged', 'Short', 'Mid'], 
        },
        effect: { rangeChange: 'Mid' }
    },
    'Fire Style: Ember Jutsu': {
        name: 'Fire Style: Ember Jutsu', rank: 'D', type: 'Offensive', chakraCost: 15, staminaCost: 0, basePower: 20,
        tags: {
            category: 'Ninjutsu',
            element: 'Fire', effect: 'Projectile', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: { rangeChange: null }
        }
    },
    'Fire Style: Flame Bullet Jutsu': {
        name: 'Fire Style: Flame Bullet Jutsu', rank: 'D', type: 'Offensive', chakraCost: 20, staminaCost: 0, basePower: 25,
        tags: {
            category: 'Ninjutsu',
            element: 'Fire', effect: 'Projectile', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Burning', chance: 0.3, duration: 2 }
            }
        }
    },
    'Water Style: Rushing Water Jutsu': {
        name: 'Water Style: Rushing Water Jutsu', rank: 'D', type: 'Offensive', chakraCost: 20, staminaCost: 0, basePower: 18,
        tags: {
            category: 'Ninjutsu',
            element: 'Water', effect: 'Projectile', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: { rangeChange: null }
        }
    },
    'Water Style: Mist Veil Jutsu': {
        name: 'Water Style: Mist Veil Jutsu', rank: 'D', type: 'Supplementary', chakraCost: 15, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Water', effect: 'Obscure', range: 'Short', complexity: 'Simple',
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Light Fog', duration: 3 } // Slightly reduces visibility
            }
        }
    },
    'Wind Style: Gale Palm Jutsu': {
        name: 'Wind Style: Gale Palm Jutsu', rank: 'D', type: 'Supplementary', chakraCost: 15, staminaCost: 0, basePower: 5,
        tags: {
            category: 'Ninjutsu',
            element: 'Wind', effect: 'Push', range: 'Short', complexity: 'Simple',
            validRanges: ['Engaged', 'Short', 'Mid'], effect: { rangeChange: 'Mid' }
        }
    },
    'Wind Style: Wind Cutter Jutsu': {
        name: 'Wind Style: Wind Cutter Jutsu', rank: 'D', type: 'Offensive', chakraCost: 18, staminaCost: 0, basePower: 22,
        tags: {
            category: 'Ninjutsu',
            element: 'Wind', effect: 'Projectile', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: { rangeChange: null }
        }
    },
    'Earth Style: Mud-Shot Jutsu': {
        name: 'Earth Style: Mud-Shot Jutsu', rank: 'D', type: 'Supplementary', chakraCost: 18, staminaCost: 0, basePower: 10,
        tags: {
            category: 'Ninjutsu',
            element: 'Earth', effect: 'Debuff', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Slowed', chance: 0.6, duration: 3, rank: 'C' }
            }
        }
    },
    'Earth Style: Stone Bullet Jutsu': {
        name: 'Earth Style: Stone Bullet Jutsu', rank: 'D', type: 'Offensive', chakraCost: 20, staminaCost: 0, basePower: 20,
        tags: {
            category: 'Ninjutsu',
            element: 'Earth', effect: 'Projectile', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: { rangeChange: null }
        }
    },
    'Lightning Style: Static Spark Jutsu': {
        name: 'Lightning Style: Static Spark Jutsu', rank: 'D', type: 'Offensive', chakraCost: 25, staminaCost: 0, basePower: 22,
        tags: {
            category: 'Ninjutsu',
            element: 'Lightning', effect: 'FastProjectile', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: { rangeChange: null }
        }
    },
    'Lightning Style: Shock Wave Jutsu': {
        name: 'Lightning Style: Shock Wave Jutsu', rank: 'D', type: 'Offensive', chakraCost: 22, staminaCost: 0, basePower: 18,
        tags: {
            category: 'Ninjutsu',
            element: 'Lightning', effect: 'AoE', range: 'Short', complexity: 'Moderate',
            validRanges: ['Engaged', 'Short'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Stunned', chance: 0.4, duration: 1 }
            }
        }
    },
    'Genjutsu: False Surroundings': {
        name: 'Genjutsu: False Surroundings', rank: 'D', type: 'Supplementary', chakraCost: 15, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Genjutsu',
            element: 'Non-Elemental', effect: 'Mental', range: 'Short', complexity: 'Simple',
            keywords: ['Genjutsu'],
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Disoriented', chance: 0.7, duration: 2 } // Alters perception of environment
            }
        }
    },

    // --- C-Rank: Chunin Specialties & Battlefield Control ---

        'Shadow Shuriken Jutsu': {
        name: 'Shadow Shuriken Jutsu', rank: 'C', type: 'Offensive', chakraCost: 30, staminaCost: 5, basePower: 15,
        requiresItem: { id: 'shuriken' },
        tags: {
            category: 'Tool',
            element: 'Non-Elemental', effect: 'MultiProjectile', range: 'Mid', complexity: 'Moderate',
            keywords: ['Deceptive'],
            validRanges: ['Short', 'Mid', 'Long'],
        },
        effect: { 
            rangeChange: null,
            // This jutsu's power comes from its deceptive nature, making it harder to dodge
            // The core damage is lower, but it hits multiple times and is more accurate.
        }
    },
    'Fire Style: Great Fireball Jutsu': {
        name: 'Fire Style: Great Fireball Jutsu', rank: 'C', type: 'Offensive', chakraCost: 60, staminaCost: 0, basePower: 55,
        tags: {
            category: 'Ninjutsu',
            element: 'Fire', effect: 'AoE', range: 'Mid', complexity: 'Complex',
            validRanges: ['Mid', 'Long'], effect: { rangeChange: null }
        }
    },
    'Fire Style: Phoenix Flower Jutsu': {
        name: 'Fire Style: Phoenix Flower Jutsu', rank: 'C', type: 'Offensive', chakraCost: 50, staminaCost: 0, basePower: 40,
        tags: {
            category: 'Ninjutsu',
            element: 'Fire', effect: 'MultiProjectile', range: 'Mid', complexity: 'Complex',
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Burning', chance: 0.5, duration: 3 }
            }
        }
    },
    'Fire Style: Burning Ash Jutsu': {
        name: 'Fire Style: Burning Ash Jutsu', rank: 'C', type: 'Supplementary', chakraCost: 45, staminaCost: 0, basePower: 20,
        tags: {
            category: 'Ninjutsu',
            element: 'Fire', effect: 'AoEDebuff', range: 'Mid', complexity: 'Moderate',
            validRanges: ['Mid'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Ash Cloud', duration: 4 } // Reduces visibility and causes minor burns
            }
        }
    },
    'Water Style: Water Bullet Jutsu': {
        name: 'Water Style: Water Bullet Jutsu', rank: 'C', type: 'Offensive', chakraCost: 55, staminaCost: 0, basePower: 50,
        tags: {
            category: 'Ninjutsu',
            element: 'Water', effect: 'Projectile', range: 'Mid', complexity: 'Complex',
            validRanges: ['Mid', 'Long'], effect: { rangeChange: null }
        }
    },
    'Water Style: Wild Water Wave Jutsu': {
        name: 'Water Style: Wild Water Wave Jutsu', rank: 'C', type: 'Offensive', chakraCost: 50, staminaCost: 0, basePower: 45,
        tags: {
            category: 'Ninjutsu',
            element: 'Water', effect: 'AoE', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Knocked Back', chance: 0.6, duration: 1 }
            }
        }
    },
    'Water Style: Hidden Mist Jutsu': {
        name: 'Water Style: Hidden Mist Jutsu', rank: 'C', type: 'Supplementary', chakraCost: 50, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Water', effect: 'Obscure', range: 'All', complexity: 'Simple',
            validRanges: ['Short', 'Mid', 'Long'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Dense Fog', duration: 5 } // Reduces perception
            }
        }
    },
    'Wind Style: Great Breakthrough Jutsu': {
        name: 'Wind Style: Great Breakthrough Jutsu', rank: 'C', type: 'Offensive', chakraCost: 50, staminaCost: 0, basePower: 45,
        tags: {
            category: 'Ninjutsu',
            element: 'Wind', effect: 'AoE', range: 'Mid', complexity: 'Complex',
            validRanges: ['Mid', 'Long'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Pushed', chance: 0.7, duration: 1 }
            }
        }
    },
    'Wind Style: Pressure Damage Jutsu': {
        name: 'Wind Style: Pressure Damage Jutsu', rank: 'C', type: 'Offensive', chakraCost: 55, staminaCost: 0, basePower: 50,
        tags: {
            category: 'Ninjutsu',
            element: 'Wind', effect: 'AoE', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: { rangeChange: null }
        }
    },
    'Earth Style: Headhunter Jutsu': {
        name: 'Earth Style: Headhunter Jutsu', rank: 'C', type: 'Supplementary', chakraCost: 45, staminaCost: 0, basePower: 5,
        tags: {
            category: 'Ninjutsu',
            element: 'Earth', effect: 'Restraint', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Restrained', chance: 0.7, duration: 2 } // Prevents movement actions
            }
        }
    },
    'Earth Style: Mud Wall Jutsu': {
        name: 'Earth Style: Mud Wall Jutsu', rank: 'C', type: 'Defensive', chakraCost: 40, staminaCost: 10, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Earth', effect: 'Barrier', range: 'Personal', complexity: 'Complex',
            validRanges: ['Short', 'Mid', 'Long'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Earthen Wall', duration: 4 } // Provides [Cover]
            }
        }
    },
    'Earth Style: Rock Shelter Jutsu': {
        name: 'Earth Style: Rock Shelter Jutsu', rank: 'C', type: 'Defensive', chakraCost: 50, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Earth', effect: 'Barrier', range: 'Short', complexity: 'Moderate',
            validRanges: ['Engaged', 'Short'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Rock Dome', duration: 3, rank: 'C' } // Protects from attacks
            }
        }
    },
    'Lightning Style: Lightning Ball Jutsu': {
        name: 'Lightning Style: Lightning Ball Jutsu', rank: 'C', type: 'Offensive', chakraCost: 60, staminaCost: 0, basePower: 55,
        tags: {
            category: 'Ninjutsu',
            element: 'Lightning', effect: 'Projectile', range: 'Mid', complexity: 'Complex',
            validRanges: ['Mid', 'Long'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Paralyzed', chance: 0.5, duration: 2 }
            }
        }
    },
    'Lightning Style: Thunderclap Jutsu': {
        name: 'Lightning Style: Thunderclap Jutsu', rank: 'C', type: 'Offensive', chakraCost: 50, staminaCost: 0, basePower: 40,
        tags: {
            category: 'Ninjutsu',
            element: 'Lightning', effect: 'AoE', range: 'Short', complexity: 'Moderate',
            validRanges: ['Short'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Deafened', chance: 0.6, duration: 3 } // Disorients with sound and shock
            }
        }
    },
    'Genjutsu: Demonic Illusion': {
        name: 'Genjutsu: Demonic Illusion', rank: 'C', type: 'Supplementary', chakraCost: 40, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Genjutsu',
            element: 'Non-Elemental', effect: 'Mental', range: 'Mid', complexity: 'Moderate',
            keywords: ['Genjutsu'],
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Confused', chance: 0.8, duration: 3 } // Lowers Resolve
            }
        }
    },
    'Genjutsu: Bringer of Darkness': {
        name: 'Genjutsu: Bringer of Darkness', rank: 'C', type: 'Supplementary', chakraCost: 50, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Genjutsu',
            element: 'Non-Elemental', effect: 'Mental', range: 'Mid', complexity: 'Complex',
            keywords: ['Genjutsu'],
            validRanges: ['Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Blinded', chance: 0.7, duration: 4 } // Simulates total darkness
            }
        }
    },
    'Taijutsu: Dynamic Entry': {
        name: 'Taijutsu: Dynamic Entry', rank: 'C', type: 'Offensive', chakraCost: 0, staminaCost: 20, basePower: 35,
        tags: {
            category: 'Taijutsu',
            element: 'Non-Elemental', effect: 'Charge', range: 'Short', complexity: 'None',
            keywords: ['Powerful'],
            validRanges: ['Short', 'Mid']
        },
            effect: { 
                rangeChange: 'Engaged',
                appliesTag: { name: 'Stunned', chance: 0.5, duration: 1 }
            }
    },

    // --- B-Rank: Jonin Tactics & Advanced Elements ---
    'Fire Style: Dragon Flame Jutsu': {
        name: 'Fire Style: Dragon Flame Jutsu', rank: 'B', type: 'Offensive', chakraCost: 80, staminaCost: 0, basePower: 70,
        tags: {
            category: 'Ninjutsu',
            element: 'Fire', effect: 'LineAoE', range: 'Long', complexity: 'High',
            validRanges: ['Mid', 'Long'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Burning', chance: 0.7, duration: 4 }
            }
        }
    },
    'Fire Style: Explosive Flame Jutsu': {
        name: 'Fire Style: Explosive Flame Jutsu', rank: 'B', type: 'Offensive', chakraCost: 75, staminaCost: 0, basePower: 65,
        tags: {
            category: 'Ninjutsu',
            element: 'Fire', effect: 'AoE', range: 'Mid', complexity: 'High',
            validRanges: ['Mid'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Explosion', duration: 1 } // Causes knockback and damage
            }
        }
    },
    'Water Style: Water Dragon Jutsu': {
        name: 'Water Style: Water Dragon Jutsu', rank: 'B', type: 'Offensive', chakraCost: 85, staminaCost: 0, basePower: 75,
        tags: {
            category: 'Ninjutsu',
            element: 'Water', effect: 'Projectile', range: 'Long', complexity: 'High',
            validRanges: ['Mid', 'Long'], effect: { rangeChange: null }
        }
    },
    'Water Style: Water Prison Jutsu': {
        name: 'Water Style: Water Prison Jutsu', rank: 'B', type: 'Supplementary', chakraCost: 70, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Water', effect: 'Restraint', range: 'Short', complexity: 'High',
            validRanges: ['Engaged', 'Short'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Trapped', chance: 0.8, duration: 3 } // Immobilizes target
            }
        }
    },
    'Wind Style: Vacuum Sphere Jutsu': {
        name: 'Wind Style: Vacuum Sphere Jutsu', rank: 'B', type: 'Offensive', chakraCost: 80, staminaCost: 0, basePower: 70,
        tags: {
            category: 'Ninjutsu',
            element: 'Wind', effect: 'MultiProjectile', range: 'Mid', complexity: 'High',
            validRanges: ['Mid'], effect: { rangeChange: null }
        }
    },
    'Wind Style: Tornado Barrier Jutsu': {
        name: 'Wind Style: Tornado Barrier Jutsu', rank: 'B', type: 'Defensive', chakraCost: 75, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Wind', effect: 'Barrier', range: 'Personal', complexity: 'High',
            validRanges: ['Short', 'Mid'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Wind Shield', duration: 4 } // Deflects projectiles
            }
        }
    },
    'Earth Style: Earth Flow River Jutsu': {
        name: 'Earth Style: Earth Flow River Jutsu', rank: 'B', type: 'Supplementary', chakraCost: 70, staminaCost: 0, basePower: 20,
        tags: {
            category: 'Ninjutsu',
            element: 'Earth', effect: 'TerrainAlter', range: 'Mid', complexity: 'High',
            validRanges: ['Mid'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Mud River', duration: 5 } // Slows movement in area
            }
        }
    },
    'Earth Style: Stone Golem Jutsu': {
        name: 'Earth Style: Stone Golem Jutsu', rank: 'B', type: 'Supplementary', chakraCost: 80, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Earth', effect: 'Summon', range: 'Short', complexity: 'High',
            validRanges: ['Short'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Stone Guardian', duration: 4 } // Creates a defensive ally
            }
        }
    },
    'Lightning Style: Lightning Hound Jutsu': {
        name: 'Lightning Style: Lightning Hound Jutsu', rank: 'B', type: 'Offensive', chakraCost: 85, staminaCost: 0, basePower: 75,
        tags: {
            category: 'Ninjutsu',
            element: 'Lightning', effect: 'GuidedProjectile', range: 'Mid', complexity: 'High',
            validRanges: ['Mid', 'Long'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Paralyzed', chance: 0.7, duration: 3 }
            }
        }
    },
    'Lightning Style: Electromagnetic Barrier Jutsu': {
        name: 'Lightning Style: Electromagnetic Barrier Jutsu', rank: 'B', type: 'Defensive', chakraCost: 70, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Ninjutsu',
            element: 'Lightning', effect: 'Barrier', range: 'Personal', complexity: 'High',
            validRanges: ['Engaged', 'Short'], effect: {
                rangeChange: null,
                battlefieldEffect: { name: 'Electric Field', duration: 3 } // Shocks attackers
            }
        }
    },
    'Genjutsu: Temple of Nirvana': {
        name: 'Genjutsu: Temple of Nirvana', rank: 'B', type: 'Supplementary', chakraCost: 60, staminaCost: 0, basePower: 0,
        tags: {
            category: 'Genjutsu',
            element: 'Non-Elemental', effect: 'MentalAoE', range: 'Mid', complexity: 'High',
            keywords: ['Genjutsu'],
            validRanges: ['Mid'], effect: {
                rangeChange: null,
                appliesTag: { name: 'Asleep', chance: 0.6, duration: 4 } // Induces sleep-like state
            }
        }
    },
    'Taijutsu: Leaf Hurricane': {
        name: 'Taijutsu: Leaf Hurricane', rank: 'B', type: 'Offensive', chakraCost: 0, staminaCost: 30, basePower: 50,
        tags: {
            category: 'Taijutsu',
            element: 'Non-Elemental', effect: 'MultiHit', range: 'Melee', complexity: 'Moderate',
            keywords: ['Combo'],
            validRanges: ['Engaged'], effect: { rangeChange: null }
        }
    },
};


/**
 * Defines the standard equipment loadouts for generated NPCs based on their rank.
 * Values are ranges [min, max] to add variety.
 */
export const NPC_EQUIPMENT_LOADOUTS = {
    'Genin': {
        'kunai': [8, 12],
        'shuriken': [8, 12],
        'paper_bomb': [1, 2],
        'smoke_bomb': [0, 1]
    },
    'Chunin': {
        'kunai': [15, 20],
        'shuriken': [15, 20],
        'paper_bomb': [2, 4],
        'smoke_bomb': [1, 2],
        'first_aid_kit': [0, 1]
    },
    'Jonin': {
        'kunai': [20, 25],
        'shuriken': [20, 25],
        'paper_bomb': [4, 6],
        'smoke_bomb': [2, 3],
        'first_aid_kit': [1, 1]
    }
};


// --- OPPONENT LIBRARY ---
/**
 * This is where our uniques go -- random NPCs are handled in npc_generation.js
 */
export const OPPONENT_LIBRARY = {
    'Genin_One': {
        opponentType: 'rogue_genin', 
        aiProfile: 'Brawler',
        name: "Rogue Genin",
        maxHealth: 320,
        maxChakra: 180,
        maxStamina: 150,
        currentStats: { strength: 45.0, agility: 42.0, stamina: 28.0, chakraPool: 28.0, intellect: 26.0, perception: 39.0, willpower: 30.0 },
        knownJutsu: ['Leaf Whirlwind', 'Substitution Jutsu', 'Clone Jutsu', 'Transformation Jutsu', 'Heavy Strike']
    },
    
    'Chunin_One': {
        opponentType: 'rogue_chunin',
        aiProfile: 'Ninjutsu Specialist',
        name: "Rogue Chunin",
        maxHealth: 550,
        maxChakra: 400,
        maxStamina: 250,
        currentStats: { strength: 40.0, agility: 45.0, stamina: 38.0, chakraPool: 60.0, intellect: 65.0, perception: 55.0, willpower: 50.0 },
        knownJutsu: ['Substitution Jutsu', 'Earth Style: Mud Wall Jutsu', 'Earth Style: Mud-Shot Jutsu', 'Clone Jutsu', 'Transformation Jutsu', 'Body Flicker Technique', 'Earth Style: Headhunter Jutsu']
    }
};


// --- Character Generation Data ---

export const villageNames = ["Konohagakure", "Sunagakure", "Kirigakure", "Iwagakure", "Kumogakure"];

export const AFFINITY_TYPES = [
    { type: "Single", chance: 0.70 },
    { type: "Dual", chance: 0.20 },
    { type: "None", chance: 0.08 },
];
export const ELEMENTS = ["Fire", "Wind", "Lightning", "Earth", "Water"];
export const AFFINITY_STRENGTHS = ["Weak", "Latent", "Moderate", "Strong"];

export const KEKKEI_GENKAI_POOL = [
    { name: "Wood Release", elements: ["Earth", "Water"], chance: 0.2 }, 
    { name: "Ice Release", elements: ["Water", "Wind"], chance: 0.2 }, 
    { name: "Lava Release", elements: ["Fire", "Earth"], chance: 0.2 }, 
    { name: "Storm Release", elements: ["Water", "Lightning"], chance: 0.25 }, 
    { name: "Magnet Release", elements: ["Wind", "Earth"], chance: 0.25 }, 
    { name: "Boil Release", elements: ["Fire", "Water"], chance: 0.25 }, 
    { name: "Crystal Release", elements: [], chance: 0.1 } 
];

// --- Affinity & Kekkei Genkai Discovery System ---
export const AFFINITY_DISCOVERY_CHANCE_PER_MINUTE = 0.00005; // Base chance per minute of Chakra Control training
export const KEKKEI_GENKAI_DISCOVERY_CHANCE_PER_DAY = 0.0001; // Tiny chance for spontaneous awakening
export const KEKKEI_GENKAI_AWAKENING_THRESHOLDS = {
    ELEMENTAL: 10, // Required level in both elemental ninjutsu schools
    SPECIAL: 15    // Required level for non-elemental KGs
};

export const TRAIT_POOL = [
    { name: "Quick Reflexes", type: "positive", effect: "+5% Agility growth", chance: 0.4 },
    { name: "Keen Mind", type: "positive", effect: "+10% Intellect-based skill learning speed", chance: 0.4 },
    { name: "Hardy Constitution", type: "positive", effect: "+10% Stamina cap", chance: 0.3 },
    { name: "Patient Learner", type: "positive", effect: "+10% passive training speed", chance: 0.3, metaUnlockable: true },
    { name: "Frail Constitution", type: "negative", effect: "-10% Stamina cap", chance: 0.4 },
    { name: "Chakra Sensitivity", type: "negative", effect: "-5% Chakra Control efficiency", chance: 0.3 },
    { name: "Slow to React", type: "negative", effect: "-5% Agility growth", chance: 0.3 },
    { name: "Curious Nature", type: "neutral", effect: "faster exploration event triggers, higher chance of minor mishaps", chance: 0.2 },
    { name: "Quiet Demeanor", type: "neutral", effect: "+5% Stealth, -5% social interaction success", chance: 0.2 }
];

export const FAMILY_BACKGROUNDS = [
    { name: "Civilian Family", chance: 0.60, statInfluence: 0.0, kgModifier: 0.001, narrative: "Parents work normal jobs... Your path will be your own." },
    { name: "Minor Ninja Family", chance: 0.25, statInfluence: 0.05, kgModifier: 0.01, narrative: "At least one parent served as a Chunin..." },
    { name: "Established Ninja Clan", chance: 0.10, statInfluence: 0.10, kgModifier: 0.25, narrative: "Born into a recognized clan, you carry the weight of expectation..." },
    { name: "Legendary Heritage", chance: 0.05, statInfluence: 0.15, kgModifier: 1.0, narrative: "Whispers of ancient power follow you..." }
];

// --- Shinobi Career Progression System Data ---

export const COMMAND_TIERS = {
    JONIN: 1,
    CHUNIN: 2,
    GENIN: 3
};

const MISSION_ROLES = ["Leader", "Subordinate", "Striker", "Infiltrator", "Support", "Solo Operative"];

export const JONIN_SENSEI_ARCHETYPES = [
    { name: "Ryo Hayashi", personality: "Laid-back Veteran" },
    { name: "Yuki Tanaka", personality: "Supportive Analyst" },
    { name: "Daiki Morimoto", personality: "Energetic Idealist" },
    { name: "Kenji Nakamura", personality: "Stoic Genius" },
    { name: "Takeshi Watanabe", personality: "Stern Disciplinarian" },
    { name: "Akira Sato", personality: "Charming Strategist" },
    { name: "Hiroshi Kimura", personality: "Calm Pragmatist" }
];

export const GENIN_TEAMMATE_ARCHETYPES = [
    { name: "Ren Ishida", personality: "Stoic Rival" },
    { name: "Hana Fujiwara", personality: "Eager Bookworm" },
    { name: "Taro Yamada", personality: "Loud Underdog" },
    { name: "Shin Matsui", personality: "Lazy Genius" },
    { name: "Jiro Abe", personality: "Gentle Giant" },
    { name: "Mika Ogawa", personality: "Confident Socialite" },
    { name: "Kenta Saito", personality: "Brash Brawler" },
    { name: "Yuta Kondo", personality: "Quiet Observer" },
    { name: "Emi Hasegawa", personality: "Timid Determinist" }
];


export const MISSION_PLANS = {
    "D-Rank": [
        { name: "Cautious Approach", description: "Prioritize stealth and observation. Avoid unnecessary risks.", tags: { bonus: "Stealth", penalty: "Duration" } },
        { name: "Swift Execution", description: "Move quickly and efficiently to complete the objective. Time is of the essence.", tags: { bonus: "Agility", penalty: "Perception" } },
        { name: "Thorough Investigation", description: "Leave no stone unturned. Gather as much information as possible.", tags: { bonus: "Perception", penalty: "Duration", rewardMod: 1.1 } }
    ]
};

export const MISSIONS = {
    "D-Rank": [
        {
            name: "Find the Daimyo's Lost Cat",
            minRank: "Genin",
            description: "The Daimyo's wife has lost her prized cat, Tora. The feline is known for its foul temper and cunning. It was last seen in the northern Merchant District.",
            durationInDays: [2, 5],
            baseRyoReward: 500,
            baseXpReward: { Teamwork: 3000, Stealth: 5000 },
            requiredRoles: ["Leader", "Subordinate", "Subordinate", "Subordinate"],
            events: [
                {
                    type: "SkillCheck",
                    narrative: "You're canvassing the district for information. A grumpy merchant seems to know something but is unwilling to talk.",
                    check: { skill: "Intellect", difficulty: 65 },
                    success: {
                        narrative: "Your clever questioning coaxes a vital clue from him. He saw Tora heading towards the old fish market."
                    },
                    failure: {
                        narrative: "Your attempts to persuade him only make him angry. He shoos you away, wasting valuable time."
                    }
                },
                {
                    type: "SkillCheck",
                    narrative: "While searching the rooftops for a good vantage point, a loose tile gives way beneath your foot.",
                    check: { skill: "Agility", difficulty: 65 },
                    success: {
                        narrative: "Your quick reflexes allow you to catch your balance, avoiding a noisy fall. Your stealth is preserved."
                    },
                    failure: { // *** MODIFIED STRUCTURE ***
                        narrative: "You slip and clatter onto the street below, drawing unwanted attention and forcing your team to relocate.",
                        potentialInjuries: [
                            { id: 'sprained_ankle_minor', chance: 0.60 }, // 60% chance to sprain ankle
                            { id: 'bruised_ribs_minor', chance: 0.30 }   // 30% chance of bruised ribs from the fall
                        ]
                    }
                },
                {
                     type: "FinalEncounter",
                    narrative: "Following a trail of paw prints, you finally corner Tora in a warehouse full of fish crates. The cat hisses, ready to bolt... but it's not alone! A rogue shinobi, hired to steal the cat, steps out of the shadows!",
                    check: { skill: "Agility", difficulty: 120 },
                    success: {
                        narrative: "You lunge and snatch the feisty feline before the rogue can react. He curses and vanishes in a puff of smoke. Mission accomplished!"
                    },
                    failure: {
                        narrative: "Tora is too fast, and the rogue shinobi uses the opening to attack!",
                        // *** COMBAT TRIGGER ***
                        triggersCombat: {
                            opponents: [ { rank: 'Genin', archetype: 'random' } 
                                
                            ],
                        }
                    }
                }
            ]
        }
    ]
};


// --- Childhood Event Data ---

// ---  Formative Years Event Data (Ages 1-5) ---

export const VIGNETTE_CHANCE_PER_DAY = 0.02; // 2% chance of a minor event each day.

// Shared pool of minor, flavorful events.
export const VIGNETTE_EVENTS = [
    { name: "Parental Comfort", message: "You wake from a bad dream, but a guardian's presence quickly soothes you.", moraleChange: 10 },
    { name: "Strange Tastes", message: "You are fed a new type of food. Your face puckers in disgust.", moraleChange: -3 },
    { name: "A Sunny Nap", message: "You find a warm patch of sun on the floor and fall into a deep, peaceful sleep.", moraleChange: 5 },
    { name: "Chasing a Pet", message: "You spend a dizzying amount of time trying to catch a house cat.", statChanges: { agility: 0.05 } },
    { name: "Drawing on the Walls", message: "Your artistic masterpiece on the wall is not appreciated. This is deeply upsetting.", moraleChange: -5, statChanges: { intellect: 0.02 } },
    { name: "Watching the Rain", message: "You spend an hour mesmerized by the pattern rain makes on a window pane.", statChanges: { perception: 0.05 } },
     // Comfort & Family
    { name: "Grandparent's Tale", message: "Your grandmother shares a story of the village's founding, her voice steady and warm.", moraleChange: 8, statChanges: { intellect: 0.04 } },
    { name: "Sibling Rivalry", message: "You bicker with a sibling over a toy, ending in a dramatic standoff.", moraleChange: -4, statChanges: { willpower: 0.03 } },
    { name: "Family Festival", message: "Your family takes you to a festival, the glow of lanterns filling you with joy.", moraleChange: 9 },
    { name: "Caught in a Lie", message: "You try to fib about sneaking a snack but get found out. Embarrassment stings.", moraleChange: -5, statChanges: { intellect: 0.02 } },
    { name: "Lullaby Night", message: "A soft lullaby from a caretaker lulls you into a dream-filled sleep.", moraleChange: 7 },
    { name: "Carried on Shoulders", message: "A family member carries you on their shoulders. The world feels huge and bright.", moraleChange: 7 },
    { name: "Scolded for Mischief", message: "Your guardian scolds you after knocking over a basket. You sulk in silence.", moraleChange: -4, statChanges: { willpower: 0.03 } },
    { name: "Bedtime Story", message: "You listen wide-eyed as an elder tells an old folktale. The images stick in your mind.", moraleChange: 8, statChanges: { intellect: 0.04 } },
    // Exploration & Curiosity
    { name: "Secret Hiding Spot", message: "You discover a cozy nook under a tree and claim it as your secret base.", moraleChange: 6, statChanges: { perception: 0.04 } },
    { name: "Lost in the Woods", message: "You stray too far into the forest and panic before finding your way back.", moraleChange: -6, statChanges: { stamina: 0.03 } },
    { name: "Bug Catching", message: "You spend hours chasing beetles, fascinated by their shiny shells.", moraleChange: 4, statChanges: { agility: 0.03 } },
    { name: "Peeking at Scrolls", message: "You sneak a glance at a forbidden scroll, but its symbols confuse you.", statChanges: { intellect: 0.03, perception: 0.02 } },
    { name: "Stream Splashing", message: "You wade into a shallow stream, slipping on smooth stones.", moraleChange: 3, statChanges: { agility: 0.04 } },
    { name: "Chasing Shadows", message: "You try to step on your own shadow, spinning in circles until you collapse laughing.", moraleChange: 6, statChanges: { agility: 0.03 } },
    { name: "Wandering Off", message: "You wander too far before being found. The experience leaves you shaken.", moraleChange: -6, statChanges: { perception: 0.04 } },
    { name: "Puddle Jumping", message: "You stomp through puddles until you're soaked. The chill makes you sniffle.", moraleChange: -2, statChanges: { stamina: 0.03 } },
    // Play & Imagination
    { name: "Pretend Kage", message: "You declare yourself the Kage and boss around imaginary ninja.", moraleChange: 6, statChanges: { willpower: 0.03 } },
    { name: "Building a Fort", message: "You pile up crates to make a fort, but it collapses in a dusty heap.", moraleChange: -3, statChanges: { intellect: 0.03 } },
    { name: "Shadow Puppets", message: "You make shapes on the wall with a lantern, giggling at your creations.", moraleChange: 5, statChanges: { perception: 0.02 } },
    { name: "Stick Jutsu", message: "You practice 'jutsu' with a stick, yelling made-up technique names.", moraleChange: 4, statChanges: { chakraPool: 0.02 } },
    { name: "Tag with Friends", message: "A wild game of tag leaves you breathless but grinning ear to ear.", moraleChange: 5, statChanges: { stamina: 0.03, agility: 0.02 } },
    { name: "Pretend Ninja", message: "You wave a stick like a sword, convinced you are a mighty shinobi.", moraleChange: 5, statChanges: { willpower: 0.02 } },
    { name: "Tower of Blocks", message: "You carefully stack blocks until they wobble and collapse. Fascination outweighs frustration.", statChanges: { intellect: 0.05, willpower: 0.02 } },
    { name: "Hide and Seek", message: "You hide under a blanket and wait forever. You learn patience... sort of.", statChanges: { perception: 0.03, willpower: 0.02 } },
    // Physical Play
    { name: "Tree Climbing", message: "You try to climb a low tree but slide down, scraping your knee.", moraleChange: -3, statChanges: { agility: 0.04, strength: 0.02 } },
    { name: "Rolling Down Hill", message: "You roll down a grassy hill, dizzy but laughing wildly.", moraleChange: 6, statChanges: { stamina: 0.03 } },
    { name: "Carrying Firewood", message: "You help carry a small bundle of wood, feeling stronger than ever.", statChanges: { strength: 0.03, willpower: 0.02 } },
    { name: "Jumping Rooftops", message: "You leap around, pretending to jump between high places.", moraleChange: 4, statChanges: { agility: 0.05 } },
    { name: "Tug of War", message: "You pull with all your might in a game, but your team loses.", moraleChange: -2, statChanges: { strength: 0.03 } },
    { name: "Running in Circles", message: "You run until you can’t breathe, collapsing with a red face.", statChanges: { stamina: 0.05, strength: 0.02 } },
    { name: "Climbing Furniture", message: "You scale a chair triumphantly before tumbling down. Ouch.", moraleChange: -3, statChanges: { agility: 0.04 } },
    { name: "Lifting a Rock", message: "You strain to pick up a stone much too heavy for you. It doesn’t move.", moraleChange: -2, statChanges: { strength: 0.03, willpower: 0.01 } },
    // Environmental Moments
    { name: "Cherry Blossom Breeze", message: "Petals drift around you in the wind, like a scene from a dream.", moraleChange: 7, statChanges: { perception: 0.03 } },
    { name: "Foggy Morning", message: "A thick fog blankets the village, making everything feel mysterious.", moraleChange: -2, statChanges: { perception: 0.04 } },
    { name: "Starry Night", message: "You lie on a rooftop, counting stars until you fall asleep.", moraleChange: 8, statChanges: { intellect: 0.03 } },
    { name: "Sudden Hail", message: "Tiny hailstones pelt you, forcing you to run for cover.", moraleChange: -4, statChanges: { stamina: 0.02 } },
    { name: "Rainbow Sighting", message: "A vibrant rainbow arches over the village, filling you with awe.", moraleChange: 7 },
    { name: "Fireflies at Dusk", message: "You chase glowing lights through the evening air, entranced.", moraleChange: 6, statChanges: { perception: 0.04 } },
    { name: "Snowflakes on Tongue", message: "You try to catch snowflakes with your tongue. The world feels magical.", moraleChange: 7 },
    { name: "Thunderstorm", message: "The sky cracks with thunder. You cling to a guardian until it passes.", moraleChange: -5, statChanges: { willpower: 0.03 } },
    // Early Chakra Curiosities
    { name: "Tingling Fingers", message: "Your fingers tingle faintly when you focus hard, like a spark inside.", statChanges: { chakraPool: 0.04 } },
    { name: "Leaf Floating", message: "You stare at a leaf, willing it to move. It twitches, or was that the wind?", statChanges: { chakraPool: 0.03, willpower: 0.02 } },
    { name: "Strange Haze", message: "You feel a faint hum in your chest while sitting quietly by a shrine.", statChanges: { chakraPool: 0.05 } },
    { name: "Spark in the Dark", message: "A tiny spark jumps between your fingers in the dark. You’re not sure how.", statChanges: { chakraPool: 0.03, perception: 0.02 } },
    { name: "Focused Breathing", message: "You mimic a shinobi’s deep breathing and feel a strange calm.", statChanges: { willpower: 0.03, chakraPool: 0.02 } },
    { name: "Buzzing Sensation", message: "You feel a strange warmth in your belly when you breathe deeply.", statChanges: { chakraPool: 0.05 } },
    { name: "Static Shock", message: "You shuffle across a mat and shock yourself on a door. Oddly fascinating.", moraleChange: -1, statChanges: { chakraPool: 0.02, perception: 0.02 } },
    { name: "Flickering Candle", message: "You stare at a candle flame until you swear it wavered when you exhaled.", statChanges: { chakraPool: 0.03, willpower: 0.02 } },
    // Shinobi world bleed-through
    { name: "Kunai Glint", message: "You find a dull kunai in the grass and pretend to be a ninja until it’s taken away.", moraleChange: 5, statChanges: { perception: 0.03 } },
    { name: "Overheard Mission Talk", message: "You eavesdrop on shinobi discussing a mission, heart pounding with excitement.", moraleChange: 4, statChanges: { intellect: 0.03 } },
    { name: "Shinobi Parade", message: "You watch a team of ninja return, their cloaks billowing. You want to be them.", moraleChange: 8, statChanges: { willpower: 0.03 } },
    { name: "Training Dummy", message: "You punch a worn training dummy, imagining you’re fighting a villain.", statChanges: { strength: 0.02, willpower: 0.02 } },
    { name: "Hidden Sparkler", message: "You find a sparkler from a festival and wave it like a jutsu.", moraleChange: 6, statChanges: { chakraPool: 0.02 } },
    { name: "Distant Training Echoes", message: "You hear the distant *thud* of practice strikes and shouts from a training ground. You mimic them clumsily.", statChanges: { willpower: 0.02, strength: 0.01 } },
    { name: "Hand Seal Imitation", message: "An older kid flashes a hand sign at you. You copy it, fingers tangled.", moraleChange: 3, statChanges: { chakraPool: 0.02, intellect: 0.02 } },
    { name: "Scare from Genin Prank", message: "A smoke bomb rolls by your feet. You cough and cry, while laughter echoes from a rooftop.", moraleChange: -6, statChanges: { perception: 0.03 } },
    // Village Life
    { name: "Street Performer", message: "A juggler in the market captivates you, but you trip trying to mimic them.", moraleChange: 3, statChanges: { agility: 0.03 } },
    { name: "Old Man’s Advice", message: "An elder tells you to ‘always protect your precious people.’ It sticks with you.", moraleChange: 7, statChanges: { willpower: 0.03 } },
    { name: "Fishmonger’s Gift", message: "A vendor gives you a tiny dried fish. It’s salty but you feel special.", moraleChange: 5 },
    { name: "Crowded Festival", message: "The festival crowd pushes you around, leaving you rattled.", moraleChange: -4, statChanges: { perception: 0.03 } },
    { name: "Temple Bell", message: "The deep chime of a temple bell echoes, calming your racing thoughts.", moraleChange: 6, statChanges: { willpower: 0.02 } },
    { name: "Market Noise", message: "At the market, vendors shout and bargain. You’re overwhelmed but curious.", moraleChange: -2, statChanges: { perception: 0.05 } },
    { name: "Festival Treat", message: "Someone hands you a sweet dumpling during a village festival. Your face lights up.", moraleChange: 10 },
    { name: "Lantern Night", message: "You watch paper lanterns float into the sky, filling you with wordless wonder.", moraleChange: 8, statChanges: { willpower: 0.03 } },
    // Accidents & Mishaps
    { name: "Tripping on a Root", message: "You trip over a tree root while running, bruising your shin.", moraleChange: -3, statChanges: { stamina: 0.02 } },
    { name: "Spilled Ramen", message: "You knock over a bowl of ramen, earning a stern look from the cook.", moraleChange: -5, statChanges: { perception: 0.02 } },
    { name: "Bee Sting", message: "A bee stings you while you poke at a flower. It hurts more than you expected.", moraleChange: -6, statChanges: { willpower: 0.03 } },
    { name: "Lost Toy", message: "Your favorite toy goes missing. You search all day to no avail.", moraleChange: -7, statChanges: { perception: 0.04 } },
    { name: "Scraped Elbow", message: "A fall while running leaves your elbow stinging but you keep going.", moraleChange: -3, statChanges: { stamina: 0.03 } },
    { name: "Slip in the Mud", message: "You slip while chasing someone and land in a puddle. Cold and muddy, you sniffle.", moraleChange: -4, statChanges: { stamina: 0.02 } },
    { name: "Lost Geta", message: "One of your little sandals flies off mid-run. Retrieving it feels like a great quest.", moraleChange: 2, statChanges: { agility: 0.04 } },
    { name: "Coughing Fit", message: "You come down with a short fever. Restless dreams fill the days.", moraleChange: -7, statChanges: { stamina: -0.02, willpower: 0.04 } },
    // Encounters
    { name: "Friendly Genin", message: "A young ninja teaches you a clumsy cartwheel, laughing with you.", moraleChange: 7, statChanges: { agility: 0.03 } },
    { name: "Grumpy Shopkeeper", message: "A shopkeeper snaps at you for touching their wares. You shrink back.", moraleChange: -4, statChanges: { perception: 0.03 } },
    { name: "Stray Cat", message: "A scruffy cat lets you pet it, purring loudly under your touch.", moraleChange: 6, statChanges: { perception: 0.02 } },
    { name: "Old Ninja’s Stare", message: "A retired shinobi watches you play, their gaze heavy with memory.", moraleChange: -2, statChanges: { perception: 0.04 } },
    { name: "Traveler’s Tale", message: "A wandering merchant tells you of far-off lands, sparking your imagination.", moraleChange: 8, statChanges: { intellect: 0.03 } },
    { name: "Kind Stranger", message: "A shinobi ruffles your hair and tells you to grow strong one day.", moraleChange: 9, statChanges: { willpower: 0.03 } },
    { name: "Glare of Authority", message: "A Chūnin scolds you for running too close to the training grounds.", moraleChange: -3, statChanges: { perception: 0.04 } },
    { name: "Playing with Merchant’s Dog", message: "A dog follows you around wagging its tail. You laugh and run together.", moraleChange: 6, statChanges: { agility: 0.02, stamina: 0.01 } },
    // Early Chakra Whispers
    { name: "Stone’s Warmth", message: "A smooth stone feels oddly warm in your hand when you focus on it.", statChanges: { chakraPool: 0.04 } },
    { name: "Dream of Flight", message: "You dream of soaring like a bird, waking with a faint tingle in your chest.", moraleChange: 5, statChanges: { chakraPool: 0.03 } },
    { name: "Rippling Water", message: "You stare at a pond, and the ripples seem to follow your thoughts.", statChanges: { chakraPool: 0.03, perception: 0.02 } },
    { name: "Sudden Gust", message: "A breeze swirls around you when you’re angry, startling you.", statChanges: { chakraPool: 0.04 } },
    { name: "Heartbeat Echo", message: "You feel your heartbeat pulse strangely while sitting still, like it’s more than just blood.", statChanges: { chakraPool: 0.05, willpower: 0.02 } },
    { name: "Paper Charm Fascination", message: "You find a faintly inscribed tag discarded near a shrine. It tingles in your hands.", statChanges: { chakraPool: 0.05, perception: 0.02 } },
    { name: "Breath in the Cold", message: "You exhale in winter air, convinced you’re breathing smoke like a great shinobi.", moraleChange: 4, statChanges: { willpower: 0.02 } },
    { name: "Warmth in Palms", message: "For a fleeting moment, your palms feel hot while concentrating. The sensation fades quickly.", statChanges: { chakraPool: 0.04 } },
    // Shinobi world bleed-through
    { name: "Kunai Glint", message: "You find a dull kunai in the grass and pretend to be a ninja until it’s taken away.", moraleChange: 5, statChanges: { perception: 0.03 } },
    { name: "Overheard Mission Talk", message: "You eavesdrop on shinobi discussing a mission, heart pounding with excitement.", moraleChange: 4, statChanges: { intellect: 0.03 } },
    { name: "Shinobi Parade", message: "You watch a team of ninja return, their cloaks billowing. You want to be them.", moraleChange: 8, statChanges: { willpower: 0.03 } },
    { name: "Training Dummy", message: "You punch a worn training dummy, imagining you’re fighting a villain.", statChanges: { strength: 0.02, willpower: 0.02 } },
    { name: "Hidden Sparkler", message: "You find a sparkler from a festival and wave it like a jutsu.", moraleChange: 6, statChanges: { chakraPool: 0.02 } },
    { name: "Distant Training Echoes", message: "You hear the distant *thud* of practice strikes and shouts from a training ground. You mimic them clumsily.", statChanges: { willpower: 0.02, strength: 0.01 } },
    { name: "Hand Seal Imitation", message: "An older kid flashes a hand sign at you. You copy it, fingers tangled.", moraleChange: 3, statChanges: { chakraPool: 0.02, intellect: 0.02 } },
    { name: "Scare from Genin Prank", message: "A smoke bomb rolls by your feet. You cough and cry, while laughter echoes from a rooftop.", moraleChange: -6, statChanges: { perception: 0.03 } },
    // Village Life
    { name: "Street Performer", message: "A juggler in the market captivates you, but you trip trying to mimic them.", moraleChange: 3, statChanges: { agility: 0.03 } },
    { name: "Old Man’s Advice", message: "An elder tells you to ‘always protect your precious people.’ It sticks with you.", moraleChange: 7, statChanges: { willpower: 0.03 } },
    { name: "Fishmonger’s Gift", message: "A vendor gives you a tiny dried fish. It’s salty but you feel special.", moraleChange: 5 },
    { name: "Crowded Festival", message: "The festival crowd pushes you around, leaving you rattled.", moraleChange: -4, statChanges: { perception: 0.03 } },
    { name: "Temple Bell", message: "The deep chime of a temple bell echoes, calming your racing thoughts.", moraleChange: 6, statChanges: { willpower: 0.02 } },
    { name: "Market Noise", message: "At the market, vendors shout and bargain. You’re overwhelmed but curious.", moraleChange: -2, statChanges: { perception: 0.05 } },
    { name: "Festival Treat", message: "Someone hands you a sweet dumpling during a village festival. Your face lights up.", moraleChange: 10 },
    { name: "Lantern Night", message: "You watch paper lanterns float into the sky, filling you with wordless wonder.", moraleChange: 8, statChanges: { willpower: 0.03 } },
    // Accidents & Mishaps
    { name: "Tripping on a Root", message: "You trip over a tree root while running, bruising your shin.", moraleChange: -3, statChanges: { stamina: 0.02 } },
    { name: "Spilled Ramen", message: "You knock over a bowl of ramen, earning a stern look from the cook.", moraleChange: -5, statChanges: { perception: 0.02 } },
    { name: "Bee Sting", message: "A bee stings you while you poke at a flower. It hurts more than you expected.", moraleChange: -6, statChanges: { willpower: 0.03 } },
    { name: "Lost Toy", message: "Your favorite toy goes missing. You search all day to no avail.", moraleChange: -7, statChanges: { perception: 0.04 } },
    { name: "Scraped Elbow", message: "A fall while running leaves your elbow stinging but you keep going.", moraleChange: -3, statChanges: { stamina: 0.03 } },
    { name: "Slip in the Mud", message: "You slip while chasing someone and land in a puddle. Cold and muddy, you sniffle.", moraleChange: -4, statChanges: { stamina: 0.02 } },
    { name: "Lost Geta", message: "One of your little sandals flies off mid-run. Retrieving it feels like a great quest.", moraleChange: 2, statChanges: { agility: 0.04 } },
    { name: "Coughing Fit", message: "You come down with a short fever. Restless dreams fill the days.", moraleChange: -7, statChanges: { stamina: -0.02, willpower: 0.04 } },
    // Encounters
    { name: "Friendly Genin", message: "A young ninja teaches you a clumsy cartwheel, laughing with you.", moraleChange: 7, statChanges: { agility: 0.03 } },
    { name: "Grumpy Shopkeeper", message: "A shopkeeper snaps at you for touching their wares. You shrink back.", moraleChange: -4, statChanges: { perception: 0.03 } },
    { name: "Stray Cat", message: "A scruffy cat lets you pet it, purring loudly under your touch.", moraleChange: 6, statChanges: { perception: 0.02 } },
    { name: "Old Ninja’s Stare", message: "A retired shinobi watches you play, their gaze heavy with memory.", moraleChange: -2, statChanges: { perception: 0.04 } },
    { name: "Traveler’s Tale", message: "A wandering merchant tells you of far-off lands, sparking your imagination.", moraleChange: 8, statChanges: { intellect: 0.03 } },
    { name: "Kind Stranger", message: "A shinobi ruffles your hair and tells you to grow strong one day.", moraleChange: 9, statChanges: { willpower: 0.03 } },
    { name: "Glare of Authority", message: "A Chūnin scolds you for running too close to the training grounds.", moraleChange: -3, statChanges: { perception: 0.04 } },
    { name: "Playing with Merchant’s Dog", message: "A dog follows you around wagging its tail. You laugh and run together.", moraleChange: 6, statChanges: { agility: 0.02, stamina: 0.01 } },
    // Early Chakra Whispers
    { name: "Stone’s Warmth", message: "A smooth stone feels oddly warm in your hand when you focus on it.", statChanges: { chakraPool: 0.04 } },
    { name: "Dream of Flight", message: "You dream of soaring like a bird, waking with a faint tingle in your chest.", moraleChange: 5, statChanges: { chakraPool: 0.03 } },
    { name: "Rippling Water", message: "You stare at a pond, and the ripples seem to follow your thoughts.", statChanges: { chakraPool: 0.03, perception: 0.02 } },
    { name: "Sudden Gust", message: "A breeze swirls around you when you’re angry, startling you.", statChanges: { chakraPool: 0.04 } },
    { name: "Heartbeat Echo", message: "You feel your heartbeat pulse strangely while sitting still, like it’s more than just blood.", statChanges: { chakraPool: 0.05, willpower: 0.02 } },
    { name: "Paper Charm Fascination", message: "You find a faintly inscribed tag discarded near a shrine. It tingles in your hands.", statChanges: { chakraPool: 0.05, perception: 0.02 } },
    { name: "Breath in the Cold", message: "You exhale in winter air, convinced you’re breathing smoke like a great shinobi.", moraleChange: 4, statChanges: { willpower: 0.02 } },
    { name: "Warmth in Palms", message: "For a fleeting moment, your palms feel hot while concentrating. The sensation fades quickly.", statChanges: { chakraPool: 0.04 } },
];

// --- Milestone Event Pools (One guaranteed event per year) ---

export  const AGE_1_MILESTONES = [ // Focus: Motor Skills & Sensation
    { 
        name: "First Steps",
        message: "You pull yourself up, teetering for a moment before taking your first wobbly steps!",
        // The game auto-resolves based on stats
        resolve: (char) => {
            if (char.baseStats.strength + char.baseStats.agility > 10) {
                return { narrative: "You quickly find your balance, a natural sense of movement guiding you.", statChanges: { agility: 0.3, willpower: 0.1 } };
            } else {
                return { narrative: "You stumble and fall, but with determined cries, you pull yourself up to try again.", statChanges: { agility: 0.1, willpower: 0.2, stamina: 0.1 } };
            }
        }
    }
];

export const AGE_2_MILESTONES = [ // Focus: Language & Exploration
    {
        name: "First Word",
        message: "You try to voice your thoughts, and a single, clear word comes out.",
        resolve: (char) => {
            const rand = Math.random();
            if (rand < 0.4) return { narrative: `Your first word is "Mama," filling your guardian with joy.`, moraleChange: 15, statChanges: { willpower: 0.2 } };
            if (rand < 0.7) {
                // Add an aptitude!
                char.aptitudes['Taijutsu'] = (char.aptitudes['Taijutsu'] || 0) + 0.02;
                return { narrative: `Pointing at a training dummy, your first word is "Fight!" A sign of an eager spirit.`, statChanges: { strength: 0.3 }, aptitude: { name: 'Taijutsu', amount: 0.02 } };
            }
            char.aptitudes['NinjutsuTheory'] = (char.aptitudes['NinjutsuTheory'] || 0) + 0.02;
            return { narrative: `Looking at a flickering lamp, your first word is "Why?" A sign of a curious mind.`, statChanges: { intellect: 0.3 }, aptitude: { name: 'NinjutsuTheory', amount: 0.02 } };
        }
    },
    {
        name: "Climbing Mishap",
        message: "Driven by curiosity, you attempt to scale a tall piece of furniture.",
        resolve: (char) => {
            if (char.baseStats.agility > 6.0) {
                return { narrative: "You deftly scramble to the top, victorious and proud of your new vantage point.", statChanges: { agility: 0.3, perception: 0.1 } };
            } else {
                return { narrative: "You lose your grip and tumble to the floor. The short, painful lesson teaches you about your limits.", health: -5, statChanges: { stamina: 0.2, willpower: 0.1 } };
            }
        }
    }
];

export const AGE_3_MILESTONES = [ // Focus: Social Interaction
    {
        name: "A Shared Toy",
        message: "While playing, another child tries to take your favorite toy.",
        resolve: (char) => {
            if (char.baseStats.willpower > 5.5) {
                return { narrative: "You hold on tight, refusing to let go. The toy is yours, after all.", statChanges: { willpower: 0.2 } };
            } else {
                return { narrative: "After a moment of hesitation, you relent and let them have a turn. The other child's smile is a small reward.", statChanges: { willpower: 0.2 }, moraleChange: 5 };
            }
        }
    }
];

export const AGE_4_MILESTONES = [ // Focus: Logic & Observation
    {
        name: "Asking 'Why?'",
        message: "Your mind is abuzz with questions. You follow an adult around all day, asking 'Why?' about everything.",
        resolve: (char) => {
            if (char.baseStats.intellect > 6.0 && Math.random() > 0.4) {
                return { narrative: "Patiently, the adult answers your questions, sparking a fire of understanding in your mind.", statChanges: { intellect: 0.4, perception: 0.1 } };
            } else {
                return { narrative: "The adult, busy and tired, eventually tells you to go play. Your questions remain unanswered, a frustrating feeling.", moraleChange: -5, statChanges: { willpower: 0.2 } };
            }
        }
    }
];

export const AGE_5_MILESTONES = [
    {
        name: "A Spark of Inspiration",
        message: "On the cusp of entering the Academy, a particular aspect of the shinobi arts captures your imagination...",
        resolve: (char) => {
            const inspirations = [
                {
                    type: "Taijutsu",
                    narrative: "You are mesmerized by the powerful, fluid movements of a Taijutsu master sparring in a dojo. You mimic their punches and kicks, feeling a surge of determination.",
                    statChanges: { strength: 0.3, agility: 0.2 },
                    aptitude: { name: 'Taijutsu', amount: 0.02 }
                },
                {
                    type: "Shurikenjutsu",
                    narrative: "You watch a Jonin demonstrate incredible precision at the training grounds, hitting ten targets with ten shuriken in a single fluid motion. The focus and skill are awe-inspiring.",
                    statChanges: { perception: 0.3, agility: 0.2 },
                    aptitude: { name: 'Shurikenjutsu', amount: 0.02 }
                },
                {
                    type: "NinjutsuTheory",
                    narrative: "You sneak a look at an advanced scroll left open on a table. The complex diagrams and chakra-flow charts are confusing, but they ignite a deep curiosity about the theory behind ninjutsu.",
                    statChanges: { intellect: 0.4 },
                    aptitude: { name: 'NinjutsuTheory', amount: 0.02 }
                },
                {
                    type: "ChakraControl",
                    narrative: "You see a medical-nin performing a complex healing technique. The gentle, precise flow of their chakra is a different kind of power—one of control and focus. You feel a pull towards that discipline.",
                    statChanges: { willpower: 0.2, chakraPool: 0.2 },
                    aptitude: { name: 'ChakraControl', amount: 0.02 }
                }
            ];

            const chosenInspiration = inspirations[Math.floor(Math.random() * inspirations.length)];
            
            // Apply the aptitude
            char.aptitudes[chosenInspiration.aptitude.name] = (char.aptitudes[chosenInspiration.aptitude.name] || 0) + chosenInspiration.aptitude.amount;
            
            return {
                narrative: chosenInspiration.narrative,
                statChanges: chosenInspiration.statChanges,
                aptitude: chosenInspiration.aptitude
            };
        }
    }
];


// Helper object for basic elemental jutsu
export const BASIC_ELEMENTAL_JUTSU = {
    "Fire": { name: "Fire Style: Ember Jutsu" },
    "Water": { name: "Water Style: Rushing Water Jutsu" },
    "Wind": { name: "Wind Style: Gale Palm Jutsu" },
    "Earth": { name: "Earth Style: Mud-Shot Jutsu" },
    "Lightning": { name: "Lightning Style: Static Spark Jutsu" }
};

// Special milestone events for the Academy period

export const ACADEMY_MILESTONES = [
    {
        name: "Chakra Affinity Test",
        chance: 0.0005,
        message: "Your Academy instructor hands you a slip of chakra paper, explaining it will reveal your natural affinity...",
        resolve: (char) => {
            if (char.affinityDiscovered) {
                return { narrative: "You already know your affinity. The test simply confirms what you've learned.", statChanges: { willpower: 0.1 } };
            }

            char.affinityDiscovered = true;
            const affinity = char.chakraAffinity;
            let narrative = "";
            let cssClass = "event-message success";

            const unlockJutsu = (element) => {
                const jutsuInfo = BASIC_ELEMENTAL_JUTSU[element];
                if (jutsuInfo && !char.skills.jutsu[jutsuInfo.name]) {
                    const baseCost = SKILL_CATEGORY_COSTS.jutsu;
                    char.skills.jutsu[jutsuInfo.name] = { 
                        level: 0, 
                        xp: 0, 
                        xpToNext: calculateXpToNext(baseCost, 0),
                        baseCost: baseCost 
                    };
                    return ` Along with this revelation, you feel an instinctual understanding of a basic technique: **${jutsuInfo.name}** has been unlocked!`;
                }
                return "";
            };

            switch (affinity.type) {
                case "Single":
                    narrative = `The paper reacts to your chakra! It ${getPaperReaction(affinity.elements[0])}. Your affinity is **${affinity.elements[0]}** (${affinity.strength}).`;
                    narrative += unlockJutsu(affinity.elements[0]);
                    break;
                case "Dual":
                    narrative = `The paper reacts in two distinct ways! It ${getPaperReaction(affinity.elements[0])}, then ${getPaperReaction(affinity.elements[1])}. A rare dual affinity: **${affinity.elements.join(" & ")}** (${affinity.strength}).`;
                    narrative += unlockJutsu(affinity.elements[0]);
                    narrative += unlockJutsu(affinity.elements[1]);
                    break;
                case "None":
                    narrative = `The paper remains unchanged. Your instructor frowns slightly, noting no clear affinity. You feel a pang of uncertainty.`;
                    cssClass = "event-message warning";
                    char.morale = Math.max(0, char.morale - 5);
                    break;
            }
            return { narrative, cssClass };
        }
    }
];

// We need a helper function here for the narrative
function getPaperReaction(element) {
    switch (element) {
        case "Fire": return "bursts into flame";
        case "Wind": return "splits cleanly in two";
        case "Lightning": return "crumples and sparks";
        case "Earth": return "turns to dust";
        case "Water": return "becomes soaked";
        default: return "reacts unusually";
    }
}
// We also need this for the xp calculation, so we'll add it to constants.js
export const calculateXpToNext = (baseXp, level) => {
    return Math.floor(baseXp * Math.pow(level + 1, 1.8));
};



// --- REWORKED & EXPANDED ACADEMY NARRATIVE EVENTS ---

// For "Practice Taijutsu" Directive
export const ACADEMY_TAIJUTSU_EVENTS = [
    { name: "Sparring Match", message: "You challenge a peer to a spirited sparring match.", outcomes: [ { condition: (char) => (char.currentStats.strength + char.currentStats.agility) >= 14, result: { narrative: "You skillfully outmaneuver and overcome your opponent, earning their respect! The experience hones your technique.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 500 }, statChanges: { strength: 0.1, agility: 0.1, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => (char.currentStats.strength + char.currentStats.agility) >= 10, result: { narrative: "It was a tough fight, but you held your own, learning much from the experience.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 250 }, statChanges: { strength: 0.05, agility: 0.05, willpower: 0.05, morale: 2 }, minDelay: 4000, cssClass: "event-message" } }, { condition: (char) => true, result: { narrative: "You were outmatched this time, but the experience was a valuable lesson in humility and defense.", statChanges: { willpower: 0.1, morale: -3 }, minDelay: 4000, cssClass: "event-message" } } ] },
    { name: "Obstacle Course Challenge", message: "You attempt a challenging Academy obstacle course.", outcomes: [ { condition: (char) => (char.currentStats.agility + char.currentStats.stamina) >= 15, result: { narrative: "You clear the course with surprising speed and grace, feeling exhilarated!", statChanges: { agility: 0.2, stamina: 0.1, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => (char.currentStats.agility + char.currentStats.stamina) >= 10, result: { narrative: "You navigate most of the course effectively, but stumble slightly, getting a minor scrape.", statChanges: { agility: 0.1, stamina: 0.05, health: -5, morale: 1 }, minDelay: 4000, cssClass: "event-message" } }, { condition: (char) => true, result: { narrative: "The course proved too difficult. You end up a bit bruised and disheartened, but determined to build your stamina.", statChanges: { health: -10, stamina: 0.1, morale: -5 }, minDelay: 4000, cssClass: "event-message warning" } } ] },
    { name: "Endurance Run", message: "An instructor leads the class on a grueling run around the village perimeter.", outcomes: [ { condition: (char) => char.currentStats.stamina >= 7, result: { narrative: "You keep a steady pace, finishing the run tired but strong. Your resilience grows.", statChanges: { stamina: 0.2, willpower: 0.1, morale: 3 }, minDelay: 3500, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "You struggle to keep up, finishing near the back of the pack, gasping for air. It's a harsh reminder to improve your conditioning.", statChanges: { stamina: 0.1, morale: -3 }, minDelay: 3500, cssClass: "event-message" } } ] },
    { name: "Kata Practice", message: "You spend hours meticulously practicing basic Taijutsu forms.", outcomes: [ { condition: (char) => char.currentStats.willpower >= 6, result: { narrative: "Your focus is absolute. The repetitive motion becomes a meditation, refining your muscle memory.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 400 }, statChanges: { strength: 0.05, willpower: 0.05 }, minDelay: 3000, cssClass: "event-message skill-gain-message" } }, { condition: (char) => true, result: { narrative: "Your mind wanders, and your form gets sloppy. The practice feels unproductive.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 100 }, morale: -2, minDelay: 3000, cssClass: "event-message" } } ] },
    { name: "Strength Training", message: "Today's exercise is pure physical conditioning: push-ups, squats, and lifting training logs.", outcomes: [ { condition: (char) => char.currentStats.strength >= 6.5, result: { narrative: "You push through the pain, feeling a satisfying burn in your muscles. You are undeniably stronger for it.", statChanges: { strength: 0.8, stamina: 0.25 }, minDelay: 3000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The exercises are exhausting. You complete them, but your body aches with the effort.", statChanges: { strength: 0.3, health: -5 }, minDelay: 3000, cssClass: "event-message" } } ] },
    { name: "A Rival's Challenge", message: "A cocky classmate singles you out, eager to prove they're better.", outcomes: [ { condition: (char) => char.currentStats.willpower > char.currentStats.strength, result: { narrative: "Their taunts don't faze you. You calmly defend against their aggressive, sloppy attacks until they tire themselves out.", statChanges: { willpower: 0.2, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "Their aggression catches you off guard. They land a solid hit, knocking the wind out of you before an instructor intervenes.", statChanges: { health: -10, morale: -5 }, minDelay: 4000, cssClass: "event-message warning" } } ] },
    { name: "Blindfolded Spar", message: "Your instructor blindfolds you for a sparring session to heighten your senses.", outcomes: [
        { condition: (char) => char.currentStats.perception >= 8, result: { narrative: "You rely on sound and instinct, landing a surprising counterstrike!", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 600 }, statChanges: { perception: 0.15, agility: 0.1, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You flail blindly, tripping over your own feet. The lesson in awareness is humbling.", statChanges: { perception: 0.1, morale: -3 }, minDelay: 4000, cssClass: "event-message" } }
    ] },
    { name: "Tree Sparring", message: "You practice taijutsu forms by dodging between tree branches.", outcomes: [
        { condition: (char) => (char.currentStats.agility + char.currentStats.stamina) >= 16, result: { narrative: "You weave through the branches like a shadow, feeling lighter and faster.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 550 }, statChanges: { agility: 0.2, stamina: 0.1, morale: 4 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You misjudge a branch and take a tumble. Bruised but wiser, you vow to improve.", statChanges: { agility: 0.1, health: -8, morale: -2 }, minDelay: 4000, cssClass: "event-message warning" } }
    ] },
    { name: "Partner Drills", message: "You pair up with a classmate for synchronized taijutsu drills.", outcomes: [
        { condition: (char) => char.currentStats.willpower >= 7, result: { narrative: "You and your partner move in perfect sync, your focus unbreakable.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 450 }, statChanges: { willpower: 0.1, strength: 0.05, morale: 3 }, minDelay: 3500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "Your timing is off, disrupting the drill. Your partner glares, but you learn from the mistake.", statChanges: { willpower: 0.05, morale: -2 }, minDelay: 3500, cssClass: "event-message" } }
    ] },
    { name: "Heavy Bag Training", message: "You spend the session pounding a heavy sandbag with strikes.", outcomes: [
        { condition: (char) => char.currentStats.strength >= 7, result: { narrative: "Your punches dent the bag deeply, your arms burning with effort.", statChanges: { strength: 0.7, stamina: 0.05, morale: 2 }, minDelay: 3000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "Your strikes are weak, barely moving the bag. Your arms ache from the effort.", statChanges: { strength: 0.1, health: -5, morale: -3 }, minDelay: 3000, cssClass: "event-message" } }
    ] },
    { name: "Balance Training", message: "You practice taijutsu stances on a narrow beam.", outcomes: [
        { condition: (char) => char.currentStats.agility >= 7.5, result: { narrative: "You hold each stance steady, feeling like a true shinobi.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 400 }, statChanges: { agility: 0.15, morale: 4 }, minDelay: 3500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You wobble and fall off the beam, landing awkwardly but unhurt.", statChanges: { agility: 0.05, morale: -3 }, minDelay: 3500, cssClass: "event-message warning" } }
    ] }
];

// For "Practice Shurikenjutsu" Directive
export const ACADEMY_SHURIKENJUTSU_EVENTS = [
    { name: "Target Practice", message: "You spend the afternoon practicing with kunai on the range.", outcomes: [ { condition: (char) => char.currentStats.perception >= 7, result: { narrative: "Your aim is true. You consistently hit near the center of the target, earning a nod from the instructor.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 400 }, statChanges: { perception: 0.1, morale: 3 }, minDelay: 3500, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "Your throws are inconsistent, scattering across the target. You need more practice to control your release.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 200 }, statChanges: { perception: 0.05 }, minDelay: 3500, cssClass: "event-message" } } ] },
    { name: "Moving Targets", message: "The instructor sets up swinging targets to test your timing.", outcomes: [ { condition: (char) => (char.currentStats.perception + char.currentStats.agility) >= 13, result: { narrative: "You lead your targets perfectly, anticipating their swings and landing several impressive hits.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 600 }, statChanges: { perception: 0.1, agility: 0.1, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "You struggle to time the moving targets, your kunai frequently missing or bouncing off the edges.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 150 }, statChanges: { morale: -3 }, minDelay: 4000, cssClass: "event-message warning" } } ] },
    { name: "Weapon Maintenance", message: "You are taught how to properly clean, sharpen, and care for your tools.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 6, result: { narrative: "You listen attentively, understanding that a well-maintained tool is a reliable one. Your respect for the craft grows.", statChanges: { intellect: 0.1, willpower: 0.05 }, minDelay: 3000, cssClass: "event-message" } }, { condition: (char) => true, result: { narrative: "The lesson is a bit boring, but you get through it. At least your kunai are shiny now.", minDelay: 3000, cssClass: "event-message" } } ] },
    { name: "Ricochet Shot", message: "You attempt to bounce a shuriken off a rock to hit a target behind cover.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 7 && char.currentStats.perception >= 7, result: { narrative: "Miraculously, you calculate the angle correctly! The shuriken sparks off the rock and thuds into the hidden target.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 750 }, statChanges: { intellect: 0.1, perception: 0.1, morale: 10 }, minDelay: 4500, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The shuriken flies off at a wild angle, clattering uselessly into the woods. A nice idea, but poor execution.", statChanges: { morale: -2 }, minDelay: 4500, cssClass: "event-message" } } ] },
    { name: "Losing a Kunai", message: "One of your throws goes wide and sails deep into the undergrowth.", outcomes: [ { condition: (char) => char.currentStats.perception >= 7.5, result: { narrative: "After a tense search, your sharp eyes spot the glint of metal under a fern. You recover the lost tool, relieved.", statChanges: { perception: 0.15 }, minDelay: 3000, cssClass: "event-message" } }, { condition: (char) => true, result: { narrative: "You search for an hour to no avail. The kunai is gone. An instructor lectures you on the importance of your equipment.", statChanges: { morale: -5, willpower: 0.05 }, minDelay: 3000, cssClass: "event-message warning" } } ] },
    { name: "Distance Throwing", message: "You practice throwing shuriken at long-range targets.", outcomes: [
        { condition: (char) => char.currentStats.perception >= 8, result: { narrative: "Your throws arc beautifully, hitting distant targets with precision.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 500 }, statChanges: { perception: 0.15, morale: 4 }, minDelay: 3500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The distance is too great, and your shuriken fall short. You need to adjust your technique.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 200 }, statChanges: { perception: 0.05, morale: -2 }, minDelay: 3500, cssClass: "event-message" } }
    ] },
    { name: "Quick Draw Practice", message: "You practice drawing and throwing kunai in one fluid motion.", outcomes: [
        { condition: (char) => char.currentStats.agility >= 7, result: { narrative: "Your hands blur as you draw and throw, hitting the target dead-on.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 450 }, statChanges: { agility: 0.1, perception: 0.05, morale: 3 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You fumble the draw, dropping a kunai. The mistake stings your pride.", statChanges: { morale: -3 }, minDelay: 4000, cssClass: "event-message warning" } }
    ] },
    { name: "Multi-Target Drill", message: "You face multiple targets, aiming to hit them all in rapid succession.", outcomes: [
        { condition: (char) => (char.currentStats.perception + char.currentStats.agility) >= 15, result: { narrative: "Your throws are a whirlwind, striking every target with pinpoint accuracy.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 600 }, statChanges: { perception: 0.1, agility: 0.1, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You hit a few targets but miss others, overwhelmed by the speed required.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 250 }, statChanges: { morale: -2 }, minDelay: 4000, cssClass: "event-message" } }
    ] },
    { name: "Deflecting Practice", message: "You practice using a kunai to deflect thrown projectiles.", outcomes: [
        { condition: (char) => char.currentStats.perception >= 7.5, result: { narrative: "Your timing is perfect, knocking away the projectiles with ease.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 500 }, statChanges: { perception: 0.15, agility: 0.05, morale: 4 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You miss most deflections, taking a few light grazes. It’s a tough lesson.", statChanges: { health: -5, perception: 0.1, morale: -3 }, minDelay: 4000, cssClass: "event-message warning" } }
    ] },
    { name: "Improvised Weapons", message: "You experiment with throwing makeshift objects like stones and sticks.", outcomes: [
        { condition: (char) => char.currentStats.intellect >= 6.5, result: { narrative: "You adapt quickly, finding the balance in each object and hitting the target.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 400 }, statChanges: { intellect: 0.1, perception: 0.05 }, minDelay: 3500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The odd shapes throw you off, and your aim is wildly inaccurate.", statChanges: { morale: -2 }, minDelay: 3500, cssClass: "event-message" } }
    ] }
];


//  For "Practice Chakra Control" Directive
export const ACADEMY_CHAKRA_CONTROL_EVENTS = [
    { name: "Leaf Sticking Exercise", message: "You attempt the classic exercise: sticking a leaf to your forehead with chakra.", outcomes: [ { condition: (char) => char.currentStats.willpower >= 7, result: { narrative: "After intense concentration, the leaf sticks! The feeling of precise chakra flow is a major breakthrough.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 500 }, statChanges: { willpower: 0.1, chakraPool: 0.1, morale: 5 }, minDelay: 5000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The leaf keeps fluttering to the ground. You can't seem to maintain a steady enough flow of chakra.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 200 }, statChanges: { willpower: 0.05, morale: -2 }, minDelay: 5000, cssClass: "event-message" } } ] },
    { name: "Water Walking Practice", message: "An instructor takes a few advanced students to a nearby pond to attempt water surface walking.", outcomes: [ { condition: (char) => char.skills.chakra.ChakraControl.level >= 1, result: { narrative: "You manage a few steps before splashing into the water! It's difficult, but you can feel yourself getting the hang of it.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 800 }, statChanges: { agility: 0.1, morale: 3 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The moment your foot touches the surface, you sink. You spend the lesson soaked and frustrated.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 250 }, statChanges: { morale: -5 }, minDelay: 4000, cssClass: "event-message warning" } } ] },
    { name: "Chakra Molding", message: "You practice molding your chakra into simple, stable shapes in your palm.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 6, result: { narrative: "You successfully form a small, swirling sphere of chakra. The exercise deepens your understanding of its properties.", xpGain: { group: 'chakra', skill: 'FormTransformation', amount: 400 }, statChanges: { intellect: 0.1 }, minDelay: 3500, cssClass: "event-message skill-gain-message" } }, { condition: (char) => true, result: { narrative: "Your chakra flickers and dissipates before it can form a coherent shape. It requires more control than you possess.", xpGain: { group: 'chakra', skill: 'FormTransformation', amount: 150 }, minDelay: 3500, cssClass: "event-message" } } ] },
    { name: "Sensing a Flow", message: "During meditation, you try to feel the flow of chakra within a nearby tree.", outcomes: [ { condition: (char) => char.currentStats.perception >= 7.5, result: { narrative: "You feel it! A slow, calm, alien flow of energy within the plant. The experience broadens your sensory abilities.", statChanges: { perception: 0.2, willpower: 0.1 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "You feel nothing but the bark of the tree. The instructor tells you that sensing natural energy is an advanced skill.", statChanges: { perception: 0.05 }, minDelay: 4000, cssClass: "event-message" } } ] },
    { name: "Chakra Exhaustion", message: "You push your chakra control exercises to the limit, perhaps too far...", outcomes: [ { condition: (char) => char.currentStats.willpower >= 7, result: { narrative: "...you manage to pull back just in time, feeling drained but resilient. You've learned your limits.", statChanges: { chakra: -15, willpower: 0.1, morale: 1 }, minDelay: 5000, cssClass: "event-message" } }, { condition: (char) => true, result: { narrative: "...and collapse in exhaustion. Your chakra is depleted, and you feel utterly spent.", statChanges: { chakra: -30, health: -5, morale: -10 }, minDelay: 5000, cssClass: "event-message warning" } } ] },
    { name: "Thread Weaving", message: "You try to channel chakra through a thin thread, keeping it taut.", outcomes: [
        { condition: (char) => char.currentStats.willpower >= 8, result: { narrative: "The thread glows faintly, holding steady under your chakra’s flow.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 550 }, statChanges: { willpower: 0.15, chakraPool: 0.1, morale: 4 }, minDelay: 4500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The thread snaps under your uneven chakra. You need more precision.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 200 }, statChanges: { morale: -3 }, minDelay: 4500, cssClass: "event-message" } }
    ] },
    { name: "Candle Flicker", message: "You attempt to influence a candle flame’s movement with chakra.", outcomes: [
        { condition: (char) => char.currentStats.chakraPool >= 7, result: { narrative: "The flame dances to your will, bending with your chakra’s rhythm.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 500 }, statChanges: { chakraPool: 0.1, willpower: 0.05, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The flame sputters and nearly goes out. Your chakra flow is too erratic.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 150 }, statChanges: { morale: -2 }, minDelay: 4000, cssClass: "event-message warning" } }
    ] },
    { name: "Stone Levitation", message: "You attempt to lift a small stone using only chakra control.", outcomes: [
        { condition: (char) => char.currentStats.willpower >= 7.5 && char.currentStats.chakraPool >= 7, result: { narrative: "The stone trembles and rises slightly, hovering for a moment before you.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 650 }, statChanges: { willpower: 0.1, chakraPool: 0.1, morale: 6 }, minDelay: 5000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The stone doesn’t budge, and your chakra scatters uselessly.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 200 }, statChanges: { morale: -3 }, minDelay: 5000, cssClass: "event-message warning" } }
    ] },
    { name: "Chakra Meditation", message: "You meditate to deepen your connection to your chakra flow.", outcomes: [
        { condition: (char) => char.currentStats.willpower >= 7, result: { narrative: "You feel your chakra flowing smoothly, like a calm river within you.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 450 }, statChanges: { willpower: 0.1, chakraPool: 0.05, morale: 3 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "Your mind wanders, disrupting your focus. The meditation yields little.", statChanges: { morale: -2 }, minDelay: 4000, cssClass: "event-message" } }
    ] }
];

// For "Academic Study" Directive
export const ACADEMY_STUDY_EVENTS = [
    { name: "Library Discovery", message: "You find an interesting scroll on basic sealing theory in the Academy library.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 7, result: { narrative: "The intricate patterns provide a flash of insight, deepening your understanding of how chakra can be written.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 500 }, statChanges: { intellect: 0.1, morale: 3 }, minDelay: 4500, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "It's an intriguing but dense read, sparking your curiosity about more advanced techniques.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 200 }, statChanges: { intellect: 0.05, morale: 1 }, minDelay: 4500, cssClass: "event-message" } } ] },
    { name: "Mentor's Observation", message: "An Academy instructor observes your dedication during a study session.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 6 && char.currentStats.willpower >= 6, result: { narrative: "Impressed, the instructor offers a valuable piece of advice, clarifying a difficult concept.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 300 }, statChanges: { intellect: 0.1, willpower: 0.05, morale: 4 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The instructor nods approvingly, a silent acknowledgement of your effort.", statChanges: { morale: 1 }, minDelay: 4000, cssClass: "event-message" } } ] },
    { name: "History Lesson", message: "Today's lesson is on the founding of the Hidden Villages.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 5, result: { narrative: "The epic tales of the First Kage and the wars they ended captivate you, instilling a sense of purpose.", statChanges: { intellect: 0.1, willpower: 0.1, morale: 5 }, minDelay: 3500, cssClass: "event-message" } }, { condition: (char) => true, result: { narrative: "You find your attention drifting as the instructor drones on about dates and treaties.", statChanges: { morale: -2 }, minDelay: 3500, cssClass: "event-message" } } ] },
    { name: "Strategic Puzzle", message: "An instructor presents the class with a tactical problem from a famous battle.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 8, result: { narrative: "While others are stumped, you see a clever, unconventional solution. The instructor is visibly impressed by your insight.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 600 }, statChanges: { intellect: 0.2, morale: 8 }, minDelay: 5000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The problem is complex, and you struggle to grasp all the variables. It's a humbling look at the mind of a commander.", statChanges: { intellect: 0.05 }, minDelay: 5000, cssClass: "event-message" } } ] },
    { name: "Struggling Concept", message: "You grapple with the theory of the five basic chakra natures for hours.", outcomes: [ { condition: (char) => char.currentStats.willpower >= 7, result: { narrative: "After much struggle, a breakthrough! The relationship between the elements clicks into place. Your perseverance pays off.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 400 }, statChanges: { intellect: 0.1, willpower: 0.1, morale: 3 }, minDelay: 5000, cssClass: "event-message skill-gain-message" } }, { condition: (char) => true, result: { narrative: "The concept remains elusive. You feel a bit frustrated, but the mental exercise was not in vain.", statChanges: { intellect: 0.05, morale: -3 }, minDelay: 5000, cssClass: "event-message warning" } } ] },
    { name: "Scroll Deciphering", message: "You study an old scroll detailing ancient shinobi tactics.", outcomes: [
        { condition: (char) => char.currentStats.intellect >= 7.5, result: { narrative: "You unravel the scroll’s cryptic strategies, gaining insight into battlefield tactics.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 550 }, statChanges: { intellect: 0.15, morale: 4 }, minDelay: 4500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The scroll’s complexity overwhelms you, but you grasp a few key ideas.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 200 }, statChanges: { intellect: 0.05 }, minDelay: 4500, cssClass: "event-message" } }
    ] },
    { name: "Clan History Study", message: "You learn about the history and techniques of a prominent shinobi clan.", outcomes: [
        { condition: (char) => char.currentStats.intellect >= 6.5, result: { narrative: "The clan’s legacy inspires you, and their techniques spark new ideas.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 400 }, statChanges: { intellect: 0.1, willpower: 0.05, morale: 3 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The dense history is hard to follow, leaving you a bit bored.", statChanges: { morale: -2 }, minDelay: 4000, cssClass: "event-message" } }
    ] },
    { name: "Map Analysis", message: "You study a map of the village’s defenses and key locations.", outcomes: [
        { condition: (char) => char.currentStats.perception >= 7, result: { narrative: "You spot vulnerabilities and strengths in the layout, impressing your instructor.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 450 }, statChanges: { perception: 0.1, intellect: 0.05, morale: 4 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The map’s details blur together, and you struggle to make sense of it.", statChanges: { intellect: 0.05, morale: -2 }, minDelay: 4000, cssClass: "event-message" } }
    ] },
    { name: "Jutsu Mechanics", message: "You dive into the mechanics of how chakra shapes jutsu.", outcomes: [
        { condition: (char) => char.currentStats.intellect >= 7, result: { narrative: "The principles click, and you see new possibilities for jutsu creation.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 500 }, statChanges: { intellect: 0.15, morale: 5 }, minDelay: 4500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The theory is dense, and you only grasp the basics after hours of effort.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 200 }, statChanges: { intellect: 0.05 }, minDelay: 4500, cssClass: "event-message" } }
    ] },
    { name: "Peer Debate", message: "You engage in a spirited debate with classmates about shinobi ethics.", outcomes: [
        { condition: (char) => char.currentStats.willpower >= 7, result: { narrative: "Your arguments are sharp and confident, earning respect from your peers.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 400 }, statChanges: { willpower: 0.1, intellect: 0.05, morale: 4 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You struggle to articulate your thoughts, feeling outmatched in the debate.", statChanges: { morale: -3, intellect: 0.05 }, minDelay: 4000, cssClass: "event-message warning" } }
    ] }
];

// For "Learn a Specific Jutsu" Directive
export const JUTSU_LEARNING_EVENTS = [
    { name: "Hand Seal Practice", message: "You sit for an hour, practicing only the hand seals for your chosen jutsu.", outcomes: [ { condition: (char) => char.currentStats.agility >= 6, result: { narrative: "Your fingers fly, the sequence becoming faster and more fluid. This is a crucial step to mastery.", xpGain: { group: 'chakra', skill: 'HandSealSpeed', amount: 4000 }, statChanges: { agility: 0.05 }, minDelay: 3000, cssClass: "event-message skill-gain-message" } }, { condition: (char) => true, result: { narrative: "Your fingers feel clumsy and tangled. You have to constantly stop and reset.", xpGain: { group: 'chakra', skill: 'HandSealSpeed', amount: 150 }, morale: -2, minDelay: 3000, cssClass: "event-message" } } ] },
    { name: "Conceptual Breakthrough", message: "While reviewing the theory behind the jutsu, you have a moment of sudden clarity.", outcomes: [ { condition: (char) => char.currentStats.intellect >= 7, result: { narrative: "You understand not just *how* the jutsu works, but *why*. This deeper knowledge will make your training far more effective.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 1000 }, statChanges: { intellect: 0.1 }, minDelay: 4000, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "You read the words, but the deeper meaning eludes you. For now, you'll have to rely on rote memorization.", statChanges: { intellect: 0.05 }, minDelay: 4000, cssClass: "event-message" } } ] },
    { name: "Manifestation", message: "You pour all your concentration into the jutsu, and it works!", outcomes: [ { condition: (char) => true, result: { narrative: "It's weak and flickers out almost immediately, but you did it! The feeling is exhilarating and motivating.", statChanges: { chakra: -20, willpower: 0.1, morale: 15 }, minDelay: 5000, cssClass: "event-message success" } } ] },
    { name: "Seal Memorization", message: "You drill the hand seals for your jutsu until they feel second nature.", outcomes: [
        { condition: (char) => char.currentStats.intellect >= 6.5, result: { narrative: "The seals flow effortlessly, your mind locking them into muscle memory.", xpGain: { group: 'chakra', skill: 'HandSealSpeed', amount: 450 }, statChanges: { intellect: 0.1, agility: 0.05 }, minDelay: 3500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "You mix up the sequence repeatedly, slowing your progress.", xpGain: { group: 'chakra', skill: 'HandSealSpeed', amount: 150 }, statChanges: { morale: -2 }, minDelay: 3500, cssClass: "event-message" } }
    ] },
    { name: "Jutsu Visualization", message: "You visualize the jutsu’s effects in your mind before attempting it.", outcomes: [
        { condition: (char) => char.currentStats.willpower >= 7, result: { narrative: "Your mental image is vivid, guiding your chakra toward the desired effect.", xpGain: { group: 'chakra', skill: 'FormTransformation', amount: 400 }, statChanges: { willpower: 0.1, morale: 3 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "Your focus wavers, and the visualization fades before you can act.", statChanges: { morale: -2 }, minDelay: 4000, cssClass: "event-message" } }
    ] },
    { name: "Partial Success", message: "You attempt the jutsu, pouring chakra into the technique.", outcomes: [
        { condition: (char) => char.currentStats.chakraPool >= 7, result: { narrative: "The jutsu sparks to life briefly, a glimpse of its potential thrilling you.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 500 }, statChanges: { chakra: -15, morale: 10 }, minDelay: 4500, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The jutsu fizzles out, draining your chakra with no effect.", statChanges: { chakra: -20, morale: -5 }, minDelay: 4500, cssClass: "event-message warning" } }
    ] },
    { name: "Sensei’s Guidance", message: "A sensei offers pointers while you practice your jutsu.", outcomes: [
        { condition: (char) => char.currentStats.intellect >= 7, result: { narrative: "The sensei’s advice clarifies a key flaw, boosting your confidence.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 450 }, statChanges: { intellect: 0.1, morale: 4 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "The sensei’s advice goes over your head, leaving you confused.", statChanges: { morale: -2 }, minDelay: 4000, cssClass: "event-message" } }
    ] },
    { name: "Chakra Alignment", message: "You focus on aligning your chakra with the jutsu’s nature.", outcomes: [
        { condition: (char) => char.affinityDiscovered && char.chakraAffinity.elements.length > 0, result: { narrative: (char) => `Your ${char.chakraAffinity.elements.join(" & ")} chakra flows smoothly, enhancing the jutsu’s potential.`, xpGain: { group: 'chakra', skill: 'FormTransformation', amount: 550 }, statChanges: { chakraPool: 0.1, morale: 5 }, minDelay: 4000, cssClass: "event-message success" } },
        { condition: (char) => true, result: { narrative: "Your chakra resists the jutsu’s nature, making the process feel forced.", xpGain: { group: 'chakra', skill: 'FormTransformation', amount: 200 }, statChanges: { morale: -3 }, minDelay: 4000, cssClass: "event-message" } }
    ] }
];

// --- GENIN-SPECIFIC INDIVIDUAL TRAINING EVENTS ---

export const GENIN_TAIJUTSU_EVENTS = [
    { name: "Waterfall Conditioning", message: "You stand under the punishing spray of a cold waterfall, training your body to withstand impact and hold its stance.", outcomes: [ { condition: (char) => char.currentStats.stamina > 20, result: { narrative: "The icy water is brutal, but your body adapts. You emerge feeling tougher and more resilient than ever.", statChanges: { stamina: 0.3, willpower: 0.2, strength: 0.1 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The force of the water is too much. You are washed away, emerging downstream bruised and shivering. A harsh lesson in your current limits.", statChanges: { health: -10, morale: -5, stamina: 0.1 }, cssClass: "event-message warning" } } ] },
    { name: "Advanced Kata", message: "You find a secluded training ground at dawn to practice an advanced Taijutsu form, focusing on flawless execution.", outcomes: [ { condition: (char) => char.currentStats.willpower > 25, result: { narrative: "Your focus is absolute. For a moment, you lose yourself in the motions, your body moving with instinctual grace. The practice refines your technique.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 1200 }, statChanges: { agility: 0.1, willpower: 0.1 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "Your mind wanders, and your footwork falters. The kata feels disjointed and ineffective. More discipline is required.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 300 }, morale: -3, cssClass: "event-message" } } ] }
];

export const GENIN_SHURIKENJUTSU_EVENTS = [
    { name: "The Impossible Shot", message: "You spend hours attempting a complex ricochet shot around multiple obstacles in a cluttered training yard.", outcomes: [ { condition: (char) => char.currentStats.perception > 30 && char.currentStats.intellect > 25, result: { narrative: "After countless failed attempts, you finally calculate the perfect angle and force. The kunai sparks off three surfaces before sinking into the bullseye. A masterful throw!", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 1500 }, statChanges: { perception: 0.2, intellect: 0.1, morale: 10 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The geometry is too complex. You waste dozens of kunai and come no closer to making the shot, ending the session in frustration.", xpGain: { group: 'physical', skill: 'Shurikenjutsu', amount: 400 }, morale: -4, cssClass: "event-message warning" } } ] },
    { name: "Live Target Practice", message: "You head to the river, attempting to strike fast-moving fish with your shuriken to improve your timing against unpredictable targets.", outcomes: [ { condition: (char) => char.currentStats.agility > 28, result: { narrative: "Your reflexes are sharp. You lead the targets perfectly, pinning several fish to the riverbed. A grim but effective day of training.", statChanges: { agility: 0.2, perception: 0.1 }, cssClass: "event-message" } }, { condition: (char) => true, result: { narrative: "The fish are too quick and erratic. Your shuriken splash uselessly in the water, time and time again.", statChanges: { morale: -3, perception: 0.05 }, cssClass: "event-message" } } ] }
];

export const GENIN_CHAKRA_CONTROL_EVENTS = [
    { name: "Surface Mastery", message: "Beyond simple water walking, you practice running up sheer cliffs and sparring on tree branches to perfect your chakra adhesion under pressure.", outcomes: [ { condition: (char) => char.skills.chakra.ChakraControl.level > 10, result: { narrative: "Your control is impeccable. You move on the vertical surfaces as if they were solid ground, a testament to your diligent training.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 1800 }, statChanges: { agility: 0.15, chakraPool: 0.1 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "You lose focus for a split second and peel off the cliff face, tumbling into the bushes below. You are bruised, but your pride hurts more.", statChanges: { health: -15, morale: -6 }, xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 500 }, cssClass: "event-message warning" } } ] },
    { name: "Sustained Exertion", message: "You attempt to maintain a simple, continuous chakra-based technique (like a small light in your palm) for as long as possible.", outcomes: [ { condition: (char) => char.currentStats.willpower > 30, result: { narrative: "Hours pass. Your body screams in protest, but your will does not break. This grueling exercise significantly expands your reserves.", statChanges: { willpower: 0.3, chakraPool: 0.2, stamina: 0.1 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "After an hour, your focus shatters from the strain. The technique fizzles out, leaving you mentally and physically drained.", statChanges: { morale: -4, willpower: 0.1, chakraPool: 0.05 }, cssClass: "event-message" } } ] }
];

// --- SKILL LEVEL-UP NARRATIVE FLAVOR TEXT ---
export const SKILL_LEVEL_UP_NARRATIVES = {
    // Physical
    'Taijutsu': "Your movements feel sharper, more instinctual. A new level of physical mastery has been unlocked within you.",
    'Shurikenjutsu': "The weight of the shuriken feels like an extension of your own hand. Your aim has become frighteningly precise.",
    // Subterfuge
    'Stealth': "The shadows seem to cling to you more readily. You find new ways to silence your footsteps and blend into the environment.",
    // Social
    'Teamwork': "You instinctively anticipate your allies' movements, a deeper sense of battlefield cohesion forming.",
    // Chakra
    'ChakraControl': "The flow of chakra within you becomes less like a raging river and more like a precisely controlled current.",
    'HandSealSpeed': "Your fingers blur through hand seals with newfound speed and accuracy. Complex jutsu are now within closer reach.",
    'FormTransformation': "The abstract concept of shaping chakra takes on a tangible reality. You can feel the potential for new forms.",
    'NatureTransformation': "You feel a deeper connection to the world itself, sensing how your chakra can influence its very nature.",
    'Genjutsu': "The line between reality and illusion blurs. You've gained a more profound insight into manipulating the senses.",
    // Academic
    'NinjutsuTheory': "The complex theories and principles of ninjutsu click into place, revealing a new layer of understanding.",
    // Jutsu (Generic for now)
    'Transformation Jutsu': "The technique feels less like a disguise and more like a second skin.",
    'Substitution Jutsu': "Your timing with the substitution becomes almost precognitive, a flicker of movement before danger even strikes.",
    'Clone Jutsu': "The chakra cost to form a clone lessens, and the illusion they project becomes more stable and lifelike.",
    // Default Fallback
    'default': "Your dedicated training has paid off. You feel a breakthrough in one of your skills."
};

// --- Academy Data ---
const ACADEMY_CLASS_BENEFITS = {
    strength: 0.05, agility: 0.05, stamina: 0.05, chakraPool: 0.05,
    intellect: 0.05, perception: 0.05, willpower: 0.05,
    morale: 1
};
export const REQUIRED_CLASSES_PER_WEEK = 3;
export const CLASS_CHANCE_PER_DAY = 0.5;

// --- Genin Narrative Events ---

//  For "Team Sparring" Directive
export const TEAM_SPARRING_EVENTS = [
    { name: "Sensei's Intervention", message: "During a heated spar, your Jonin-sensei effortlessly intervenes, pointing out a critical flaw in your stance.", outcomes: [ { condition: (char) => char.currentStats.intellect > 18, result: { narrative: "You immediately understand and adapt, earning a rare nod of approval. The lesson sticks with you.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 800 }, statChanges: { intellect: 0.1, morale: 5 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The criticism stings, but you know it's valuable. You spend the next hour drilling the corrected form.", xpGain: { group: 'physical', skill: 'Taijutsu', amount: 400 }, statChanges: { willpower: 0.1, morale: -2 }, cssClass: "event-message" } } ] },
    { name: "Synchronized Takedown", message: "You and a teammate attempt a combination maneuver you've been practicing.", outcomes: [ { condition: (char) => char.skills.social.Teamwork.level > 5, result: { narrative: "It works perfectly! Your timing is impeccable, and you flawlessly execute the takedown on your other teammate. The team's cohesion feels stronger than ever.", xpGain: { group: 'social', skill: 'Teamwork', amount: 1500 }, morale: 10, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "You mistime your move, bumping into your partner and ruining the technique. Your sensei makes you both run laps.", statChanges: { health: -5, morale: -5 }, cssClass: "event-message warning" } } ] },
];

//  For "Formation & Strategy Drills" Directive
export const FORMATION_DRILL_EVENTS = [
    { name: "Capture the Bell Test", message: "Your sensei initiates a surprise 'capture the bell' exercise, testing your ability to work together against a superior opponent.", outcomes: [ { condition: (char) => char.skills.social.Teamwork.level > char.skills.physical.Taijutsu.level, result: { narrative: "Realizing you can't win with brute force, you coordinate a clever diversion with your team, nearly succeeding. Your sensei is impressed by the strategy, if not the result.", xpGain: { group: 'social', skill: 'Teamwork', amount: 1200 }, statChanges: { intellect: 0.2, morale: 5 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "Your team makes individual, uncoordinated attacks, which your sensei easily counters. It's a humbling lesson in the importance of a unified plan.", xpGain: { group: 'social', skill: 'Teamwork', amount: 300 }, morale: -4, cssClass: "event-message" } } ] },
    { name: "Ambush Simulation", message: "Your team is tasked with setting up an effective ambush for your sensei in the woods.", outcomes: [ { condition: (char) => char.skills.subterfuge.Stealth.level > 5, result: { narrative: "Your position is perfect. You remain completely undetected until the trap is sprung, earning praise for your patience and stealth.", xpGain: { group: 'subterfuge', skill: 'Stealth', amount: 1000 }, statChanges: { perception: 0.1, morale: 5 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "A poorly placed foot snaps a twig, alerting your sensei to your position moments before the ambush. The element of surprise is lost.", morale: -3, cssClass: "event-message warning" } } ] },
];

//  For "Build Bonds with Teammates" Directive
export const BUILD_BONDS_EVENTS = [
    { name: "Ramen Night", message: "Your team decides to get ramen together after a long day of training.", outcomes: [ { condition: (char) => true, result: { narrative: "Over steaming bowls of noodles, you share stories and laugh. You learn something new about each of your teammates, strengthening your trust in them.", xpGain: { group: 'social', skill: 'Teamwork', amount: 900 }, morale: 15, cssClass: "event-message success" } } ] },
    { name: "A Teammate's Troubles", message: "You notice one of your teammates seems distracted and is struggling with a particular technique.", outcomes: [ { condition: (char) => char.currentStats.willpower > 27, result: { narrative: "You stay after training to help them, offering encouragement and a fresh perspective. They are grateful for your support, and your bond deepens.", xpGain: { group: 'social', skill: 'Teamwork', amount: 1200 }, statChanges: { willpower: 0.1 }, morale: 8, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "You consider saying something but decide it's not your place. The team's performance suffers slightly from their distraction.", morale: -2, cssClass: "event-message" } } ] },
];

//  For "Elemental Training" Directive
export const ELEMENTAL_TRAINING_EVENTS = [
    { name: "A Minor Breakthrough", message: "While focusing your elemental chakra, you have a sudden moment of insight.", outcomes: [ { condition: (char) => true, result: { narrative: (char) => `You instinctively perform a minor, unnamed technique! For a moment, the ${char.chakraAffinity.elements[0]}-natured chakra responds perfectly to your will. The experience is exhilarating.`, xpGain: { group: 'chakra', skill: 'NatureTransformation', amount: 2000 }, statChanges: { chakra: -10, morale: 10 }, cssClass: "event-message success" } } ] },
    { name: "Seeking Advice", message: "You seek out a village elder known for their mastery of your elemental nature.", outcomes: [ { condition: (char) => char.currentStats.intellect > 29, result: { narrative: "The elder shares a cryptic but profound piece of wisdom about the philosophy of your element. It fundamentally changes how you view your training.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 1000 }, statChanges: { intellect: 0.15, morale: 5 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The elder gives you a simple, practical exercise. It's not a revelation, but it is helpful.", xpGain: { group: 'chakra', skill: 'ChakraControl', amount: 500 }, cssClass: "event-message" } } ] },
];

//  For "Advanced Jutsu Research" Directive
export const ADVANCED_JUTSU_RESEARCH_EVENTS = [
    { name: "A Cryptic Scroll", message: "In the archives, you find a damaged scroll with an unusual hand seal sequence.", outcomes: [ { condition: (char) => char.currentStats.intellect > 60, result: { narrative: "After hours of cross-referencing, you decipher a fragment of the text. It seems to be part of a powerful B-Rank jutsu! The knowledge feels dangerous and exciting.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 2500 }, statChanges: { intellect: 0.2, morale: 5 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "The text is too damaged and the theory too advanced for you to make any sense of it. For now, it remains a mystery.", morale: -2, cssClass: "event-message" } } ] },
    { name: "The Archivist", message: "An old, stern archivist notices your interest in advanced texts.", outcomes: [ { condition: (char) => char.currentStats.willpower > 28, result: { narrative: "They test you with a series of sharp questions, which you answer respectfully and thoughtfully. Seeing your genuine desire to learn, they grant you access to a restricted section for one hour.", xpGain: { group: 'academic', skill: 'NinjutsuTheory', amount: 1500 }, statChanges: { willpower: 0.1, morale: 8 }, cssClass: "event-message success" } }, { condition: (char) => true, result: { narrative: "They eye you suspiciously and tell you to stick to the Genin-level scrolls. You are quietly escorted back to the main reading room.", morale: -4, cssClass: "event-message warning" } } ] },
];


