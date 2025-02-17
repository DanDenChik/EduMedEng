"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import API_ENDPOINTS from '@/lib/apiEndpoints';
import { getAccessToken, logout, refreshAccessToken } from '@/lib/authUtils';
import SidePanel from '@/components/SidePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isResultMessage?: boolean;
}

interface Chat {
  id: number;
  messages: Message[];
  is_finished: boolean;
  diagnosis: string | null;
  score: number | null;
  feedback: string | null;
  start_time: string;
}

const GameClient: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [pastGames, setPastGames] = useState<Chat[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkAuthentication = async () => {
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await axios.get(API_ENDPOINTS.MY_PROFILE, getAuthHeaders());
      loadPastGames();
    } catch (error) {
      console.error('Authentication error:', error);
      handleAuthError();
    }
  };

  const getAuthHeaders = () => {
    const token = getAccessToken();
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  };

  const handleAuthError = async () => {
    try {
      await refreshAccessToken();
      loadPastGames();
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      logout();
      setChat(null);
      setPastGames([]);
      setError('Authentication error. Please log in again.');
      router.push('/login');
    }
  };

  const loadPastGames = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get<Chat[]>(API_ENDPOINTS.PAST_GAMES, getAuthHeaders());
      setPastGames(response.data);
      if (response.data.length > 0) {
        setChat(response.data[0]);
      } else {
        setChat({
          id: 0,
          messages: [{
            id: 0,
            sender: 'patient',
            content: 'You have no active games yet. Click "New Game" in the side panel to start.',
            timestamp: new Date().toISOString()
          }],
          is_finished: false,
          diagnosis: null,
          score: null,
          feedback: null,
          start_time: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading past games:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await handleAuthError();
      } else {
        setError('Error loading past games. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadGame = async (gameId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get<Chat>(`${API_ENDPOINTS.CHATS}${gameId}/`, getAuthHeaders());
      setChat(response.data);
    } catch (error) {
      console.error('Error loading game:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleAuthError();
      } else {
        setError('Error loading game. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async (difficulty: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post<Chat>(
        API_ENDPOINTS.NEW_CHAT,
        { difficulty },
        getAuthHeaders()
      );
      setChat(response.data);
      setPastGames(prevGames => [response.data, ...prevGames]);
    } catch (error) {
      console.error('Error creating new chat:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleAuthError();
      } else {
        setError('Error creating new game. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (inputMessage.trim() === '' || !chat || chat.is_finished) return;

    setIsLoading(true);
    setError(null);

    // Create a temporary doctor message
    const tempDoctorMessage: Message = {
      id: Date.now(), // Temporary ID
      sender: 'doctor',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    // Immediately update local state
    setChat(prevChat => ({
      ...prevChat!,
      messages: [...prevChat!.messages, tempDoctorMessage]
    }));

    try {
      const response = await axios.post<Message>(
        API_ENDPOINTS.SEND_MESSAGE(chat.id),
        { content: inputMessage },
        getAuthHeaders()
      );

      // Update chat with patient response
      setChat(prevChat => ({
        ...prevChat!,
        messages: [...prevChat!.messages, response.data]
      }));

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await handleAuthError();
      } else {
        setError('Error sending message. Please try again.');
        setChat(prevChat => ({
          ...prevChat!,
          messages: prevChat!.messages.filter(msg => msg.id !== tempDoctorMessage.id)
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const endGame = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!chat || chat.is_finished) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post<{ score: number; feedback: string }>(
        API_ENDPOINTS.END_GAME(chat.id),
        { answer: diagnosis },
        getAuthHeaders()
      );

      const resultMessage: Message = {
        id: Date.now(),
        sender: 'system',
        content: `Game over. Diagnosis: ${diagnosis}. Score: ${response.data.score}. Feedback: ${response.data.feedback}`,
        timestamp: new Date().toISOString(),
        isResultMessage: true
      };

      const updatedChat = {
        ...chat,
        is_finished: true,
        diagnosis: diagnosis,
        score: response.data.score,
        feedback: response.data.feedback,
        messages: [...chat.messages, resultMessage]
      };

      await saveUpdatedChat(updatedChat);

      setChat(updatedChat);
      setPastGames(prevGames =>
        prevGames.map(game => game.id === chat.id ? updatedChat : game)
      );

      setDiagnosis('');
    } catch (error) {
      console.error('Error ending game:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleAuthError();
      } else {
        setError('Error ending game. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveUpdatedChat = async (updatedChat: Chat) => {
    try {
      await axios.put(`${API_ENDPOINTS.CHATS}${updatedChat.id}/`, updatedChat, getAuthHeaders());
    } catch (error) {
      console.error('Error saving updated chat:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleAuthError();
      } else {
        setError('Error saving game results. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    setChat(null);
    setPastGames([]);
    router.push('/login');
  };



  return (
    <div className="flex h-screen bg-gray-100">
      <SidePanel
        games={pastGames}
        currentGameId={chat?.id || null}
        onGameSelect={loadGame}
        onNewGame={createNewChat}
      />
      <div className="flex-grow flex flex-col overflow-hidden w-4/5">
        <div className="bg-white shadow-md p-4">
          <h1 className="text-2xl font-bold">Virtual Doctor's Office</h1>
        </div>
        <div className="flex-grow overflow-y-auto p-4">
          {chat && (
            <>
              {chat.messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.sender === 'doctor' ? 'text-right' : 'text-left'
                    }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${message.sender === 'doctor'
                      ? 'bg-blue-500 text-white'
                      : message.isResultMessage
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-black'
                      }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        {chat && !chat.is_finished && (
          <div className="p-4 bg-white border-t space-y-2">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Enter message..."
                className="flex-grow"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 w-32">
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </form>
            <form onSubmit={endGame} className="flex space-x-2">
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter your diagnosis"
                className="flex-grow"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 w-32">
                {isLoading ? 'Ending...' : 'End Game'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameClient;