/**
 * ImageWrangler - FAQ Component
 * Dynamic FAQ section with accordion and multi-language support
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation, type TranslationKey } from '../lib/i18n';

interface FAQItem {
    qKey: TranslationKey;
    aKey: TranslationKey;
}

const FAQ_ITEMS: FAQItem[] = [
    { qKey: 'faq_q1', aKey: 'faq_a1' },
    { qKey: 'faq_q2', aKey: 'faq_a2' },
    { qKey: 'faq_q3', aKey: 'faq_a3' },
    { qKey: 'faq_q4', aKey: 'faq_a4' },
    { qKey: 'faq_q5', aKey: 'faq_a5' },
    { qKey: 'faq_q6', aKey: 'faq_a6' },
    { qKey: 'faq_q7', aKey: 'faq_a7' },
    { qKey: 'faq_q8', aKey: 'faq_a8' },
    { qKey: 'faq_q9', aKey: 'faq_a9' },
    { qKey: 'faq_q10', aKey: 'faq_a10' },
];

interface AccordionItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}

function AccordionItem({ question, answer, isOpen, onToggle }: AccordionItemProps) {
    return (
        <div className="border-b border-border">
            <button
                className="flex w-full items-center justify-between py-4 text-left text-base sm:text-lg font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <span className="pr-4">{question}</span>
                <ChevronDown
                    className={cn(
                        "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>
            <div
                className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-96 pb-4" : "max-h-0"
                )}
            >
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

export function FAQ() {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className="w-full max-w-3xl mx-auto scroll-mt-20" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl sm:text-3xl font-bold text-center mb-8">
                {t('faq_heading')}
            </h2>
            <div className="space-y-0">
                {FAQ_ITEMS.map((item, index) => (
                    <AccordionItem
                        key={index}
                        question={t(item.qKey)}
                        answer={t(item.aKey)}
                        isOpen={openIndex === index}
                        onToggle={() => handleToggle(index)}
                    />
                ))}
            </div>
        </section>
    );
}

export default FAQ;
