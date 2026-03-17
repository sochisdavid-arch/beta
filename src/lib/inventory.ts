
"use client";

import { mockInventory } from './mock-data';

export interface InventoryItem {
    id: string;
    name: string;
    category: 'medicamento' | 'vacuna' | 'alimento';
    stock: number;
}

export interface FoodConsumptionRecord {
    id: string; // unique id for the record
    date: string;
    productId: string;
    productName: string;
    quantity: number;
    area: string; // e.g., 'Precebo Lote X', 'Ceba Lote Y'
}

export interface MedicalConsumptionRecord {
    id: string;
    date: string;
    productId: string;
    productName: string;
    category: 'medicamento' | 'vacuna';
    quantity: number;
    area: string; // e.g., 'Cerda PIG-001', 'Lote Precebo X'
}


export const getInventory = (): InventoryItem[] => {
    try {
        const storedInventory = typeof window !== 'undefined' ? localStorage.getItem('farmInventory') : null;
        if (storedInventory) {
            return JSON.parse(storedInventory);
        } else {
            // Initialize with mock data if nothing is in storage
            const initialInventory: InventoryItem[] = mockInventory.map((item) => ({ ...item }));
            if (typeof window !== 'undefined') {
                localStorage.setItem('farmInventory', JSON.stringify(initialInventory));
            }
            return initialInventory;
        }
    } catch (error) {
        console.error("Failed to read inventory from localStorage", error);
        return mockInventory.map((item) => ({ ...item })); // Fallback to mock data
    }
};

export const updateInventory = (inventory: InventoryItem[]): void => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem('farmInventory', JSON.stringify(inventory));
            window.dispatchEvent(new Event('storage'));
        }
    } catch (error) {
        console.error("Failed to write inventory to localStorage", error);
    }
};

export const deductFromStock = (
    productId: string, 
    quantityToDeduct: number,
    area?: string,
    consumptionDate?: string
): { success: boolean, newStock?: number, message?: string } => {
    
    if (!productId || quantityToDeduct <= 0) {
        return { success: false, message: 'ID de producto o cantidad inválidos.' };
    }

    const inventory = getInventory();
    const productIndex = inventory.findIndex(item => item.id === productId);

    if (productIndex === -1) {
        return { success: false, message: `Producto con ID ${productId} no encontrado.` };
    }

    const product = inventory[productIndex];

    if (product.stock < quantityToDeduct) {
        return { success: false, message: `No hay suficiente stock de ${product.name}. Stock: ${product.stock}, Necesario: ${quantityToDeduct}.` };
    }

    inventory[productIndex] = { ...product, stock: product.stock - quantityToDeduct };
    updateInventory(inventory);
    
    // Log consumption
    const consumptionKey = product.category === 'alimento' ? 'foodConsumptionHistory' : 'medicalConsumptionHistory';
    const history = JSON.parse(localStorage.getItem(consumptionKey) || '[]');
    
    const newRecord = {
        id: `consumo-${product.category}-${Date.now()}`,
        date: consumptionDate || new Date().toISOString(),
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: quantityToDeduct,
        area: area || 'Área no especificada',
    };

    history.unshift(newRecord);
    localStorage.setItem(consumptionKey, JSON.stringify(history));


    return { success: true, newStock: inventory[productIndex].stock };
};
