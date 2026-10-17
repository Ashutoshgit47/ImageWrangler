import React from 'react';
import { useTranslation } from '../lib/i18n';
import { Github, Globe, Heart, ShieldCheck, Cpu, Code2, ExternalLink, Coffee } from 'lucide-react';

export function AboutDev() {
    const { t } = useTranslation();

    return (
        <section id="about-dev" className="w-full max-w-3xl mx-auto my-12 md:my-16 scroll-mt-20">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card/90 to-elevated p-6 sm:p-8 shadow-xl relative overflow-hidden">
                {/* Background glow accent */}
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-primary to-accent p-1 shadow-lg shadow-primary/20">
                            <div className="w-full h-full rounded-[14px] bg-card flex items-center justify-center overflow-hidden">
                                <span className="text-3xl font-extrabold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                                    A
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Developer Info */}
                    <div className="flex-1 text-center sm:text-left space-y-3">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                <Code2 className="w-3 h-3" />
                                {t('about_dev_role')}
                            </div>
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                {t('about_dev_name')}
                            </h3>
                            <p className="text-sm text-accent font-medium">
                                {t('about_dev_subtitle')}
                            </p>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('about_dev_bio')}
                        </p>

                        {/* Value propositions */}
                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                                <span>Zero-Data-Leak</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Cpu className="w-4 h-4 text-primary shrink-0" />
                                <span>Client-Side WebWorkers</span>
                            </div>
                        </div>

                        {/* Social and links buttons */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-3">
                            <a
                                href="https://github.com/Ashutoshgit47"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all duration-200 hover:scale-105 shadow-sm"
                            >
                                <Github className="w-4 h-4" />
                                <span>{t('about_dev_github')}</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>

                            <a
                                href="https://ashutosh47.pages.dev/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-105 shadow-md shadow-primary/25"
                            >
                                <Globe className="w-4 h-4" />
                                <span>{t('about_dev_portfolio')}</span>
                                <ExternalLink className="w-3 h-3 opacity-80" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Donation and support */}
                <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-destructive animate-pulse" />
                        <span>{t('about_dev_support')}</span>
                    </p>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        <a
                            href="https://ko-fi.com/ashutosh47"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#18181b] hover:bg-[#27272a] text-[#ff5e5b] border border-[#ff5e5b]/40 hover:border-[#ff5e5b] transition-all duration-200 shadow-sm hover:scale-105"
                        >
                            <Coffee className="w-3.5 h-3.5 text-[#ff5e5b]" />
                            <span>Ko-fi</span>
                        </a>
                        <a
                            href="https://buymeachai.ezee.li/ashutosh47"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#18181b] hover:bg-[#27272a] text-amber-400 border border-amber-500/40 hover:border-amber-400 transition-all duration-200 shadow-sm hover:scale-105"
                        >
                            <Coffee className="w-3.5 h-3.5 text-amber-400" />
                            <span>Buy Me A Chai</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AboutDev;
