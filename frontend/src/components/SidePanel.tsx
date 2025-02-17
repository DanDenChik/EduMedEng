import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Game {
    id: number;
    start_time: string;
    diagnosis: string | null;
    score: number | null;
}

interface SidePanelProps {
    games: Game[];
    currentGameId: number | null;
    onGameSelect: (gameId: number) => void;
    onNewGame: (difficulty: string) => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ games, currentGameId, onGameSelect, onNewGame }) => {
    const [difficulty, setDifficulty] = useState<string>('easy');

    const sortedGames = [...games].sort((a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    return (
        <div className="w-64 h-screen flex flex-col bg-gray-100 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 space-y-2">
                <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={() => onNewGame(difficulty)} className="w-full bg-blue-600 hover:bg-blue-700">
                    New Simulation
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto">
                <h2 className="px-4 py-2 text-lg font-semibold">Past Simulations</h2>
                {sortedGames.map((game) => (
                    <div
                        key={game.id}
                        className={`p-4 cursor-pointer hover:bg-gray-200 ${game.id === currentGameId ? 'bg-blue-100' : ''
                            }`}
                        onClick={() => onGameSelect(game.id)}
                    >
                        <div className="text-sm">Date: {new Date(game.start_time).toLocaleString()}</div>
                        <div className="text-sm">Diagnosis: {game.diagnosis || 'Not completed'}</div>
                        <div className="text-sm">Score: {game.score !== null ? game.score : 'No score'}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SidePanel;