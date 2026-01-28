"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";

import { createClient } from "@/utils/supabase/client";

import { User } from "@supabase/supabase-js";

import { useRouter } from "next/navigation";

// Tạo Context
interface UserProfile {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  fullName?: string;
  email?: string;
  avatarUrl?: string; // Standardize with DB field name
}

const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean
}>({
  user: null,
  profile: null,
  isLoading: true,
});

export const AuthProvider = ({
  children,
  initialUser,
  initialProfile,
}: {
  children: React.ReactNode;
  initialUser: User | null;
  initialProfile: any | null; // Using any to avoid complex type matching with Prisma dates
}) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (initialProfile) setProfile(initialProfile);
  }, [initialProfile]);

  // Fetch Profile side-effect
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profile") // Changed to lowercase 'profile'
          .select("*")
          .eq("id", user.id)
          .single();

        if (data && !error) {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, [user, supabase]);

  useEffect(() => {
    // 1. Lắng nghe sự thay đổi Auth từ Supabase (Realtime)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') setProfile(null); // Clear profile on logout
      setIsLoading(false);

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook để dùng ở các component con (Header, Profile...)
export const useAuth = () => {
  return useContext(AuthContext);
};