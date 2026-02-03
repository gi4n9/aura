"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

import { createClient } from "@/utils/supabase/client";

import { User } from "@supabase/supabase-js";

import { useRouter } from "next/navigation";

// Tạo Context
interface UserProfile {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  fullName?: string;
  email?: string;
  avatarUrl?: string;
}

const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}>({
  user: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => { },
});

export const AuthProvider = ({
  children,
  initialUser,
  initialProfile,
}: {
  children: React.ReactNode;
  initialUser: User | null;
  initialProfile: any | null;
}) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const userIdRef = useRef<string | null>(initialUser?.id ?? null);
  const hasMountedRef = useRef(false);

  // Hàm fetch profile riêng biệt để tái sử dụng
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("Profile")
        .select("id, role, fullName, email, avatarUrl")
        .eq("id", userId)
        .single();

      if (data && !error) {
        setProfile(data as UserProfile);
        return data as UserProfile;
      }
      return null;
    } catch (err) {
      console.error("Error fetching profile:", err);
      return null;
    }
  }, [supabase]);

  // Public refresh function
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  // Cập nhật profile khi initialProfile thay đổi (từ server)
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  // Auth state listener
  useEffect(() => {
    let isInitialEvent = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip initial event
      if (isInitialEvent) {
        isInitialEvent = false;
        setIsLoading(false);
        return;
      }

      const newUser = session?.user ?? null;
      const newUserId = newUser?.id ?? null;

      console.log(`[Auth] Event: ${event}, User: ${newUserId}`);

      // Kiểm tra xem user có thực sự thay đổi không
      if (newUserId !== userIdRef.current) {
        userIdRef.current = newUserId;
        setUser(newUser);

        // QUAN TRỌNG: Fetch profile ngay khi user thay đổi
        if (newUser) {
          setIsLoading(true);
          await fetchProfile(newUser.id);
          setIsLoading(false);
        } else {
          // User logged out
          setProfile(null);
        }
      }

      setIsLoading(false);

      // Refresh page để server components cập nhật
      if (hasMountedRef.current && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
        router.refresh();
      }
    });

    setTimeout(() => {
      hasMountedRef.current = true;
    }, 100);

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook để dùng ở các component con
export const useAuth = () => {
  return useContext(AuthContext);
};

