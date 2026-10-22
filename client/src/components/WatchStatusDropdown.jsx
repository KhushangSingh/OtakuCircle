import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from './icons';

const WatchStatusDropdown = ({ currentStatus, onStatusChange, disabled, isAdded, className, wrapperClass, direction = 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState(null);

    const updateMenuPosition = () => {
        if (!buttonRef.current || !isOpen) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const menuHeight = menuRef.current?.getBoundingClientRect().height || 96;
        const gap = 8;
        const openUp = direction === 'up' || (
            direction !== 'down' &&
            rect.bottom + menuHeight + gap > window.innerHeight &&
            rect.top - menuHeight - gap >= 0
        );

        setMenuPosition({
            left: rect.left + rect.width / 2,
            top: openUp ? rect.top - menuHeight - gap : rect.bottom + gap
        });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !menuRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        updateMenuPosition();
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);

        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [isOpen, direction]);

    const handleSelect = (e, status) => {
        e.stopPropagation();
        onStatusChange(status);
        setIsOpen(false);
    };

    const toggleMenu = (e) => {
        e.stopPropagation();
        if (disabled) return;
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                left: rect.left + rect.width / 2,
                top: direction === 'up' ? rect.top - 104 : rect.bottom + 8
            });
        }
        setIsOpen((open) => !open);
    };

    const displayText = isAdded ? "Added" : (currentStatus || "Watch Status");

    return (
        <div ref={dropdownRef} className={`relative ${wrapperClass || 'w-full'}`} onClick={(e) => e.stopPropagation()}>
            <button 
                type="button"
                disabled={disabled}
                ref={buttonRef}
                onClick={toggleMenu}
                className={`w-full flex items-center justify-between gap-1.5 py-2 px-4 rounded-xl text-xs font-bold backdrop-blur-sm transition-all shadow-lg border outline-none
                    ${disabled 
                        ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-green-500/20 cursor-default' 
                        : 'bg-white/10 hover:bg-white/20 border-white/30 text-white cursor-pointer'
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

            {isOpen && !disabled && createPortal(
                <div
                    ref={menuRef}
                    className="fixed left-0 w-32 py-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden transform -translate-x-1/2 animate-in fade-in"
                    style={{
                        left: menuPosition?.left || 0,
                        top: menuPosition?.top || 0
                    }}
                >
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
                </div>,
                document.body
            )}
        </div>
    );
};

export default WatchStatusDropdown;
