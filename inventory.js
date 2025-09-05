// inventory.js - Manages character inventory logic for Shinobi's Vow

import { ITEMS } from './constants.js';

/**
 * Intelligently adds an item to the character's inventory, handling stacks.
 * @param {string} itemId - The ID of the item to add.
 * @param {number} quantity - The amount of the item to add.
 */
export function addItemToInventory(itemId, quantity) {
    const char = gameState.character;
    const itemData = ITEMS[itemId];
    if (!itemData) {
        console.error(`Item with ID ${itemId} not found.`);
        return;
    }

    let remainingQuantity = quantity;

    // First, try to fill existing stacks
    for (const stack of char.inventory) {
        if (stack.itemId === itemId && stack.quantity < itemData.maxStack) {
            const canAdd = itemData.maxStack - stack.quantity;
            const toAdd = Math.min(remainingQuantity, canAdd);
            stack.quantity += toAdd;
            remainingQuantity -= toAdd;
            if (remainingQuantity <= 0) break;
        }
    }

    // If there's still quantity left, create new stacks
    while (remainingQuantity > 0) {
        const toAdd = Math.min(remainingQuantity, itemData.maxStack);
        char.inventory.push({ itemId: itemId, quantity: toAdd });
        remainingQuantity -= toAdd;
    }
}

/**
 * Removes a specified quantity of an item from the inventory.
 * @param {string} itemId - The ID of the item to remove.
 *   @param {number} quantity - The amount to remove.
 * @returns {boolean} - True if the full quantity was removed, false if not enough items existed.
 */
export function removeItemFromInventory(itemId, quantity) {
    const char = gameState.character;
    if (!checkInventory(itemId, quantity)) {
        console.error(`Attempted to remove ${quantity} of ${itemId}, but not enough in inventory.`);
        return false;
    }

    let remainingToRemove = quantity;

    // Remove from stacks, starting from the end to handle partial stacks cleanly
    for (let i = char.inventory.length - 1; i >= 0; i--) {
        const stack = char.inventory[i];
        if (stack.itemId === itemId) {
            const toRemove = Math.min(remainingToRemove, stack.quantity);
            stack.quantity -= toRemove;
            remainingToRemove -= toRemove;
            if (stack.quantity <= 0) {
                char.inventory.splice(i, 1); // Remove empty stack
            }
            if (remainingToRemove <= 0) break;
        }
    }
    return true;
}

/**
 * Checks if the player has a certain quantity of an item.
 * @param {string} itemId - The ID of the item to check for.
 * @param {number} quantity - The required quantity.
 * @returns {boolean} - True if the player has enough, false otherwise.
 */
export function checkInventory(itemId, quantity) {
    const inventory = gameState.character.inventory;
    let totalQuantity = 0;
    for (const stack of inventory) {
        if (stack.itemId === itemId) {
            totalQuantity += stack.quantity;
        }
    }
    return totalQuantity >= quantity;
}