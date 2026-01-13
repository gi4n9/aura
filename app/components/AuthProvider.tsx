"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";

import { createClient } from "@/utils/supabase/client";

import { User } from "@supabase/supabase-js";

import { useRouter } from "next/navigation";

// Tạo Context
const AuthContext = createContext<{ user: User | null; isLoading: boolean }>({
  user: null,
  isLoading: true,
});

export const AuthProvider = ({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) => {
  const [user, setUser] = useState<User | null>(initialUser);

  const [isLoading, setIsLoading] = useState(!initialUser);

  const supabase = createClient();

  const router = useRouter();

  useEffect(() => {
    // 1. Lắng nghe sự thay đổi Auth từ Supabase (Realtime)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);


      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook để dùng ở các component con (Header, Profile...)
export const useAuth = () => {
  return useContext(AuthContext);
};