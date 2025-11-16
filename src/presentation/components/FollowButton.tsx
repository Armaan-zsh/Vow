'use client';

import { useState } from 'react';

interface FollowButtonProps {
  userId: string;
}

export function FollowButton({ userId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement follow API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Failed to follow user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 font-black font-mono disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'LOADING...' : isFollowing ? 'FOLLOWING' : 'FOLLOW'}
    </button>
  );
}
