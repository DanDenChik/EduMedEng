"use client"

import React, { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/authUtils';
import API_ENDPOINTS from '@/lib/apiEndpoints';
import { Trophy, Medal, Award } from 'lucide-react';

interface User {
  username: string;
  email: string;
}

interface Profile {
  user: User;
  points: number;
  rank: number;
}

interface TopUser {
  user: User;
  points: number;
  rank: number;
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Trophy className="text-yellow-400" />;
  if (rank === 2) return <Medal className="text-gray-400" />;
  if (rank === 3) return <Award className="text-orange-400" />;
  return null;
};

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = getAccessToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const profileResponse = await fetch(API_ENDPOINTS.MY_PROFILE, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }
        const profileData = await profileResponse.json();
        setProfile(profileData);

        const topResponse = await fetch(API_ENDPOINTS.TOP_USERS);
        if (topResponse.ok) {
          const topData = await topResponse.json();
          setTopUsers(topData);
        } else {
          console.error('Failed to fetch top users');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load some profile data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>;
  if (!profile) return <div className="text-center py-8">No profile data available. Please try logging in again.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 font-semibold">Username</p>
            <p className="text-xl">{profile.user.username}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">Email</p>
            <p className="text-xl">{profile.user.email}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">Points</p>
            <p className="text-2xl font-bold text-blue-600">{profile.points}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">Rank</p>
            <p className="text-2xl font-bold text-green-600">#{profile.rank}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Top Users</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topUsers.length > 0 ? (
          topUsers.map((topUser, index) => (
            <div key={index} className={`bg-white shadow-md rounded-lg p-4 ${index < 3 ? 'border-2' : ''} ${index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-400' : index === 2 ? 'border-orange-400' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-semibold ${index < 3 ? 'text-xl' : ''}`}>{topUser.user.username}</span>
                <RankIcon rank={topUser.rank} />
              </div>
              <p className="text-gray-600">Rank: <span className="font-bold">{topUser.rank}</span></p>
              <p className="text-blue-600 font-bold text-xl mt-2">{topUser.points} points</p>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center py-4">No top users data available.</p>
        )}
      </div>
    </div>
  );
}