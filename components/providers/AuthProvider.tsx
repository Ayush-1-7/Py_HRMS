"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "employee";
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>({
        id: "mock-admin-id",
        name: "Administrator",
        email: "admin@elevatehr.com",
        role: "admin"
    });
    const [loading, setLoading] = useState(false);

    // useEffect removed - local session only for UI roles

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
