import { forwardRef } from 'react';
import { Search } from './icons';

const SEARCH_BAR_CLASS = 'flex items-center bg-white/[0.08] backdrop-blur-md border border-white/20 rounded-full px-5 py-3 transition-all duration-300 focus-within:bg-white/[0.12] focus-within:border-white/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.08),0_4px_18px_rgba(0,0,0,0.18)]';

const SearchBar = forwardRef(({ value, onChange, onKeyDown, placeholder, className = '', autoFocus = false }, ref) => (
    <div ref={ref} className={`${SEARCH_BAR_CLASS} ${className}`}>
        <Search className="text-zinc-300 w-5 h-5 mr-3 transition-colors" />
        <input
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-zinc-300"
        />
    </div>
));

SearchBar.displayName = 'SearchBar';

export default SearchBar;
