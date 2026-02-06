/**
 * useUserProfile Hook
 * 
 * Access and manage user profiles.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  userProfiles,
  type UserProfile,
} from '../lib/social/userProfiles';

export interface UseUserProfileResult {
  profile: UserProfile | null;
  following: string[];
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Omit<UserProfile, 'address' | 'joinedAt'>>) => void;
  follow: (targetAddress: string) => Promise<void>;
  unfollow: (targetAddress: string) => Promise<void>;
  isFollowing: (targetAddress: string) => boolean;
  getPublicProfile: (address: string) => Promise<import('../lib/social/userProfiles').PublicProfile | null>;
}

export function useUserProfile(walletAddress: string | null): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(userProfiles.getCurrentProfile());
  const [following, setFollowing] = useState<string[]>(userProfiles.getFollowing());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize profile when wallet connects
  useEffect(() => {
    if (walletAddress) {
      setIsLoading(true);
      try {
        const userProfile = userProfiles.initializeProfile(walletAddress);
        setProfile(userProfile);
        setFollowing(userProfiles.getFollowing());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    } else {
      setProfile(null);
      setFollowing([]);
    }

    // Subscribe to changes
    const unsubscribe = userProfiles.subscribe(() => {
      setProfile(userProfiles.getCurrentProfile());
      setFollowing(userProfiles.getFollowing());
    });

    return () => unsubscribe();
  }, [walletAddress]);

  const updateProfile = useCallback((updates: Partial<Omit<UserProfile, 'address' | 'joinedAt'>>) => {
    const updated = userProfiles.updateProfile(updates);
    if (updated) {
      setProfile(updated);
    }
  }, []);

  const follow = useCallback(async (targetAddress: string) => {
    await userProfiles.followUser(targetAddress);
    setFollowing(userProfiles.getFollowing());
  }, []);

  const unfollow = useCallback(async (targetAddress: string) => {
    await userProfiles.unfollowUser(targetAddress);
    setFollowing(userProfiles.getFollowing());
  }, []);

  const isFollowingUser = useCallback((targetAddress: string): boolean => {
    return userProfiles.isFollowing(targetAddress);
  }, []);

  const getPublicProfile = useCallback(async (address: string) => {
    return userProfiles.getPublicProfile(address);
  }, []);

  return {
    profile,
    following,
    isLoading,
    error,
    updateProfile,
    follow,
    unfollow,
    isFollowing: isFollowingUser,
    getPublicProfile,
  };
}

export default useUserProfile;
