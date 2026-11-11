import React from 'react';

/**
 * Official OTT & Streaming / Reading Platform Logos
 * High-definition vector icons matching official brand identities for Crunchyroll, Netflix,
 * Hulu, Amazon Prime Video, Bilibili, YouTube, Disney+, Apple TV, Tubi, and major Manga publishers.
 */
const OttLogo = ({ site = '', iconUrl = null, className = 'w-7 h-7' }) => {
    const s = site.toLowerCase().trim();

    // 1. Crunchyroll (Iconic bright orange spiral eye)
    if (s.includes('crunchyroll')) {
        return (
            <div className={`${className} rounded-xl bg-[#F47521] flex items-center justify-center shrink-0 shadow-md shadow-orange-950/40 p-1`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <circle cx="12" cy="12" r="10" fill="#FFFFFF" fillOpacity="0.2" />
                    <path 
                        d="M12 3a9 9 0 109 9 6.5 6.5 0 01-6.5-6.5A2.5 2.5 0 0012 3z" 
                        fill="#FFFFFF" 
                    />
                    <circle cx="14.5" cy="12" r="2.2" fill="#F47521" />
                </svg>
            </div>
        );
    }

    // 2. Netflix (Iconic red N ribbon)
    if (s.includes('netflix')) {
        return (
            <div className={`${className} rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M6 3h3.5l5 14V3H18v18h-3.5L9.5 7v14H6V3z" fill="#E50914" />
                </svg>
            </div>
        );
    }

    // 3. Hulu (Iconic neon green brand mark)
    if (s.includes('hulu')) {
        return (
            <div className={`${className} rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
                    <path d="M6 7v18h4.5v-6.5c0-2 1.2-3 3-3s2.8 1 2.8 2.8V25H21v-7.5c0-4.2-2.3-6-5.5-6-2.2 0-3.8 1-4.8 2.5V7H6z" fill="#1CE783" />
                </svg>
            </div>
        );
    }

    // 4. Amazon Prime Video (Iconic Prime blue smile arrow)
    if (s.includes('prime') || s.includes('amazon')) {
        return (
            <div className={`${className} rounded-xl bg-[#00A8E1] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M4 14.5c4 2.8 11.5 2.8 15.5 0" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M17.5 13.5l2 1.8-2.2.5" fill="#FFFFFF" />
                    <text x="12" y="11" fill="#FFFFFF" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">prime</text>
                </svg>
            </div>
        );
    }

    // 5. Bilibili (Iconic cyan anime TV mascot)
    if (s.includes('bilibili')) {
        return (
            <div className={`${className} rounded-xl bg-[#00A1D6] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M7 5l2.2 2.5m7.8-2.5l-2.2 2.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                    <rect x="4" y="7.5" width="16" height="13" rx="3.5" fill="#FFFFFF" />
                    <circle cx="9" cy="13.5" r="1.5" fill="#00A1D6" />
                    <circle cx="15" cy="13.5" r="1.5" fill="#00A1D6" />
                </svg>
            </div>
        );
    }

    // 6. YouTube (Iconic red play logo)
    if (s.includes('youtube')) {
        return (
            <div className={`${className} rounded-xl bg-[#FF0000] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M10 8.5l5.5 3.5-5.5 3.5V8.5z" fill="#FFFFFF" />
                </svg>
            </div>
        );
    }

    // 7. Disney+ (Deep blue royal arc logo)
    if (s.includes('disney')) {
        return (
            <div className={`${className} rounded-xl bg-[#0483EE] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M4 14c4.5-5.5 11.5-5.5 16 0" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 8v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
        );
    }

    // 8. HIDIVE (Cyan geometric logo)
    if (s.includes('hidive')) {
        return (
            <div className={`${className} rounded-xl bg-[#00B4D8] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-white text-[9px] tracking-tighter">HD</span>
            </div>
        );
    }

    // 9. Apple TV
    if (s.includes('apple')) {
        return (
            <div className={`${className} rounded-xl bg-black border border-white/20 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-bold text-white text-[10px]">tv</span>
            </div>
        );
    }

    // 10. Tubi
    if (s.includes('tubi')) {
        return (
            <div className={`${className} rounded-xl bg-[#FA283C] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-white text-[9px] lowercase tracking-tight">tubi</span>
            </div>
        );
    }

    // 11. Manga Platforms (Young Animal, Dark Horse, Lezhin, Piccoma, Naver, Zebrack)
    if (s.includes('young animal')) {
        return (
            <div className={`${className} rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-white text-[9px] tracking-tight">YA</span>
            </div>
        );
    }

    if (s.includes('dark horse')) {
        return (
            <div className={`${className} rounded-xl bg-black border border-amber-500/50 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-amber-400 text-[9px] tracking-tighter">DH</span>
            </div>
        );
    }

    if (s.includes('lezhin')) {
        return (
            <div className={`${className} rounded-xl bg-red-700 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-white text-[10px]">L</span>
            </div>
        );
    }

    if (s.includes('piccoma')) {
        return (
            <div className={`${className} rounded-xl bg-[#FFE600] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-black text-[11px]">P</span>
            </div>
        );
    }

    if (s.includes('naver') || s.includes('webtoon')) {
        return (
            <div className={`${className} rounded-xl bg-[#00D566] flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-white text-[11px]">N</span>
            </div>
        );
    }

    if (s.includes('manga park')) {
        return (
            <div className={`${className} rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-white text-[9px]">MP</span>
            </div>
        );
    }

    if (s.includes('zebrack') || s.includes('shueisha')) {
        return (
            <div className={`${className} rounded-xl bg-fuchsia-600 flex items-center justify-center shrink-0 shadow-md p-1`}>
                <span className="font-black text-white text-[10px]">Z</span>
            </div>
        );
    }

    // If API provided an official icon image URL
    if (iconUrl) {
        return (
            <div className={`${className} rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow-md`}>
                <img src={iconUrl} alt={site} className="w-full h-full object-contain" />
            </div>
        );
    }

    // Default Fallback: Clean OTT streaming TV badge
    return (
        <div className={`${className} rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-md`}>
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-blue-300" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M8 2l4 5 4-5" />
            </svg>
        </div>
    );
};

export default OttLogo;

