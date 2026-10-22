import { forwardRef } from 'react';
import { Search } from './icons';

const SEARCH_BAR_CLASS = 'flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-5 py-3 transition-all duration-300 focus-within:bg-black/60 focus-within:border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]';

const SearchBar = forwardRef(({ value, onChange, onKeyDown, placeholder, className = '', autoFocus = false }, ref) => (
    <div ref={ref} className={`${SEARCH_BAR_CLASS} ${className}`}>
        <Search className="text-zinc-500 w-5 h-5 mr-3 transition-colors" />
        <input
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-zinc-500"
        />
    </div>
));

SearchBar.displayName = 'SearchBar';

export default SearchBar;
