
import { createContext, useContext, useEffect, useState } from "react";
import { sendHttpReq } from "../lib/httpHandler";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function checkAuth() {
            try {
                const data = await sendHttpReq("users/me", "GET");

                if (isMounted) {
                    setUser(data?.user ?? null);
                }
            } catch (error) {
                if (isMounted) {
                    setUser(null);
                }

                // A 401 is normal when no valid session exists.
                if (!error.message?.includes("Authentication required") &&
                    !error.message?.includes("expired token")) {
                    console.error("Authentication check failed:", error);
                }
            } finally {
                if (isMounted) {
                    setIsAuthLoading(false);
                }
            }
        }

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, []);

    function loginUser(userData) {
        setUser(userData);
    }

    function logoutUser() {
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loginUser,
                logoutUser,
                isAuthLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
