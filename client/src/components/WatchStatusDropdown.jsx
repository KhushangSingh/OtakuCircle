import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const WatchStatusDropdown = ({ currentStatus, onStatusChange, disabled, isAdded, className, wrapperClass }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (e, status) => {
        e.stopPropagation();
        onStatusChange(status);
        setIsOpen(false);
    };

    const displayText = isAdded ? "Added" : (currentStatus || "Watch Status");

    return (
        <div ref={dropdownRef} className={`relative ${wrapperClass || 'w-full'}`} onClick={(e) => e.stopPropagation()}>
            <button 
                type="button"
                disabled={disabled}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) setIsOpen(!isOpen);
                }}
                className={`w-full flex items-center justify-between gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-lg border outline-none
                    ${disabled 
                        ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-green-500/20 cursor-default' 
                        : 'bg-black/40 hover:bg-black/60 border-white/10 hover:border-white/20 text-zinc-300 cursor-pointer'
                    } ${className || ''}`}
            >
                {disabled ? (
                    <div className="flex items-center gap-1.5 justify-center w-full">
                        <Check size={14} strokeWidth={3} />
                        <span>{displayText}</span>
                    </div>
                ) : (
                    <>
                        <span className="flex-1 text-center truncate">{displayText}</span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {isOpen && !disabled && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-32 py-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden transform origin-top animate-in fade-in slide-in-from-top-2">
                    <button
                        type="button"
                        onClick={(e) => handleSelect(e, 'Watching')}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors hover:bg-white/10 flex items-center gap-2 ${currentStatus === 'Watching' ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-300'}`}
                    >
                        Watching
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSelect(e, 'Watched')}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors hover:bg-white/10 flex items-center gap-2 ${currentStatus === 'Watched' ? 'text-green-400 bg-green-500/10' : 'text-zinc-300'}`}
                    >
                        Watched
                    </button>
                </div>
            )}
        </div>
    );
};

export default WatchStatusDropdown;
