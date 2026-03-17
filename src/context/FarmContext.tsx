
"use client";

// This file is intentionally left empty to remove the multi-farm functionality.
// You can safely delete this file.

import React, { createContext, useContext, ReactNode } from 'react';

const FarmContext = createContext<undefined>(undefined);

export const FarmProvider = ({ children }: { children: ReactNode }) => {
    return (
        <FarmContext.Provider value={undefined}>
            {children}
        </FarmContext.Provider>
    );
};

export const useFarms = () => {
    return {};
};
