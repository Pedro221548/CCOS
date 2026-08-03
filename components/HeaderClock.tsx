import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

const HeaderClock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="hidden xl:flex items-center bg-slate-100 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <div className="text-xs font-mono font-black text-slate-600 dark:text-amber-500 tracking-widest flex items-center gap-3">
                <Clock size={14} className="text-blue-500" />
                {currentTime.toLocaleTimeString('pt-BR')}
                <span className="text-slate-300 dark:text-slate-800">|</span>
                <Calendar size={14} className="text-purple-500" />
                {currentTime.toLocaleDateString('pt-BR')}
            </div>
        </div>
    );
};

export default React.memo(HeaderClock);
