import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PinAccount } from '../types';
import { StorageService } from '../services/storage';

export interface AuthContextType {
  profile: PinAccount | null;
  loading: boolean;
  loginWithPin: (pin: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  canInput: boolean;
  canEditOrDelete: boolean;
  canEdit: boolean; // Alias for canEditOrDelete
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PinAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(() => {
    const current = StorageService.getCurrentUser();
    setProfile(current);
  }, []);

  useEffect(() => {
    StorageService.init();
    refreshProfile();
    setLoading(false);
  }, [refreshProfile]);

  const loginWithPin = async (pin: string): Promise<{ error?: string }> => {
    const cleanPin = pin.trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      return { error: 'Vui lòng nhập đúng mã PIN gồm 4 chữ số.' };
    }

    // First query Cloud Firestore directly to ensure newest PIN is recognized across incognito tabs & devices
    let account = await StorageService.verifyPinFromCloud(cleanPin);
    if (!account) {
      account = StorageService.verifyPin(cleanPin);
    }

    if (!account) {
      return { error: 'Mã PIN không đúng hoặc chưa được phân quyền.' };
    }

    StorageService.setCurrentUser(account);
    setProfile(account);
    return {};
  };

  const signOut = async () => {
    StorageService.setCurrentUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';
  const canInput = profile?.role === 'admin' || profile?.role === 'nhap';
  const canEditOrDelete = profile?.role === 'admin';
  const canEdit = canEditOrDelete;

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        loginWithPin,
        signOut,
        isAdmin,
        canInput,
        canEditOrDelete,
        canEdit,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
