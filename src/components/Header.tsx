import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../lib/i18n';
import { Github, ChevronDown, Globe, Check } from './icons';
import { cn } from '../lib/utils';

export function Header() {
    const { currentLocale, changeLocale, locales } = useTranslation();
    const [isVisible, setIsVisible] = useState(true);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const lastScrollY = useRef(0);
    const langMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < 50) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY.current) {
                setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close language dropdown on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
                setIsLangOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLangOpen(false);
        };

        if (isLangOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isLangOpen]);

    const activeLocaleObj = locales.find(l => l.code === currentLocale) || locales[0];

    return (
        <header
            className={cn(
                "fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md transition-transform duration-300",
                isVisible ? "translate-y-0" : "-translate-y-full"
            )}
        >
            <div className="container mx-auto flex h-14 items-center justify-between px-4">
                {/* Brand */}
                <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <img src="/favicon.svg" alt="ImageWrangler Logo" className="h-7 w-7" />
                    <span className="font-display text-xl font-medium tracking-tight text-primary">
                        ImageWrangler
                    </span>
                </a>

                {/* Navigation actions */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Language Switcher Dropdown */}
                    <div className="relative" ref={langMenuRef}>
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-elevated text-xs font-medium transition-colors"
                            aria-expanded={isLangOpen}
                            aria-label="Select language"
                        >
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="hidden sm:inline">{activeLocaleObj.nativeName}</span>
                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isLangOpen && "rotate-180")} />
                        </button>

                        {isLangOpen && (
                            <div className="absolute right-0 mt-1.5 w-40 rounded-lg border border-border bg-card shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                                <div className="text-[10px] font-semibold text-muted-foreground px-2.5 py-1 uppercase tracking-wider">
                                    Language
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-0.5">
                                    {locales.map(loc => (
                                        <button
                                            key={loc.code}
                                            onClick={() => {
                                                changeLocale(loc.code);
                                                setIsLangOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition-colors",
                                                currentLocale === loc.code
                                                    ? "bg-primary text-primary-foreground font-semibold"
                                                    : "hover:bg-elevated text-foreground"
                                            )}
                                        >
                                            <span>{loc.nativeName}</span>
                                            {currentLocale === loc.code && (
                                                <Check className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* GitHub Repo */}
                    <a
                        href="https://github.com/Ashutoshgit47/ImageWrangler"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-elevated text-secondary-foreground transition-colors"
                        title="GitHub Repository"
                    >
                        <Github className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">GitHub</span>
                    </a>
                </div>
            </div>
        </header>
    );
}

export default Header;
