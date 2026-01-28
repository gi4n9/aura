"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";

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

  // Use useState to ensure supabase client is created only once
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  // Use ref to track user ID without causing re-renders
  const userIdRef = useRef<string | null>(initialUser?.id ?? null);
  // Track if component has mounted to prevent refresh on initial load
  const hasMountedRef = useRef(false);

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
          .from("profile")
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

  // Auth state listener with defensive guards to prevent infinite loops
  useEffect(() => {
    let isInitialEvent = true; // Skip the first event fired on subscription

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // GUARD 1: Skip the initial event that fires when subscription is created
      if (isInitialEvent) {
        isInitialEvent = false;
        setIsLoading(false);
        return;
      }

      const newUserId = session?.user?.id ?? null;

      // GUARD 2: Only update state if user ID actually changed
      if (newUserId !== userIdRef.current) {
        userIdRef.current = newUserId;
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }

      setIsLoading(false);

      // GUARD 3: Only refresh on EXPLICIT sign in/out, not token refresh or other events
      // And only after component has fully mounted
      if (hasMountedRef.current && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
        router.refresh();
      }
    });

    // Mark as mounted after a short delay to ensure hydration is complete
    setTimeout(() => {
      hasMountedRef.current = true;
    }, 100);

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
