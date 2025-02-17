'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { logout, getAccessToken } from '@/lib/authUtils'
import API_ENDPOINTS from '@/lib/apiEndpoints'

interface User {
    username: string;
    email: string;
}

interface Profile {
    user: User;
    points: number;
    rank: number;
}

export default function Header() {
    const { isLoggedIn, setIsLoggedIn } = useAuth();
    const [userData, setProfileData] = useState<Profile | null>(null);
    const pathname = usePathname();

    const handleLogout = () => {
        logout();
        setIsLoggedIn(false);
        setProfileData(null);
    }

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = getAccessToken();
                if (!token) {
                    throw new Error('No access token available');
                }

                const response = await fetch(API_ENDPOINTS.MY_PROFILE, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                setProfileData(data);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setIsLoggedIn(false);
                setProfileData(null);
            }
        };

        fetchUserData();
    }, [pathname, isLoggedIn, setIsLoggedIn]);

    return (
        <header className="bg-white shadow-md">
            <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold">EduMed</Link>
                <div>
                    {userData ? (
                        <>
                            <Link href="/profile" className="mr-4">Profile</Link>
                            <button onClick={handleLogout} className="text-blue-500 hover:text-blue-700">LogOut</button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="mr-4">Login</Link>
                            <Link href="/register">Registration</Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    )
}