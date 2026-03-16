/**
 * ImageWrangler - FAQ Component
 * Static FAQ section with accordion
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const faqs = [
    {
        question: 'Are my images uploaded to a server?',
        answer:
            'No. ImageWrangler is a 100% client-side application. All image processing happens directly in your browser. Your files never leave your device.',
    },
    {
        question: 'Is ImageWrangler free to use?',
        answer:
            'Yes, ImageWrangler is completely free to use. There are no hidden costs, subscriptions, or advertisements.',
    },
    {
        question: 'What image formats are supported?',
        answer:
            'ImageWrangler supports reading and converting to JPG, PNG, WebP, and BMP. All processing happens locally in your browser.',
    },
    {
        question: 'Does this tool work offline?',
        answer:
            'Yes. After the initial page load, ImageWrangler can function completely offline. You can process images without an active internet connection.',
    },
    {
        question: 'How does the Merge All feature work?',
        answer:
            'Merge All combines all your loaded images into a single grid image. If you have 4 images, it creates a 2x2 grid. The merged result is added as a new image you can download.',
    },
    {
        question: 'What is Target File Size (Resize by Weight)?',
        answer:
            'This feature lets you specify a maximum file size in KB. ImageWrangler automatically adjusts the quality to fit your target size, useful for meeting upload limits.',
    },
    {
        question: 'Why would I export as BMP?',
        answer:
            'BMP is an uncompressed format that preserves every pixel exactly. It\'s useful when you need lossless quality or compatibility with older software.',
    },
    {
        question: 'Can I process multiple images at once?',
        answer:
            'Yes! You can drag and drop or select multiple images. Each image can have its own format, quality, and size settings. Download them all at once as a ZIP file.',
    },
    {
        question: 'Why can\'t I set a Target File Size for BMP images?',
        answer:
            'BMP is a lossless format, meaning it stores exact pixel data without compression. Unlike JPEG or WebP, we cannot lower its quality to reduce file size. To make a BMP smaller, you must reduce its dimensions (Resize).',
    },
    {
        question: 'Why can\'t I reduce the file size to a very low number?',
        answer:
            'Files have a minimum size limit based on their resolution. For example, a 4K image cannot be compressed to 5KB without becoming unrecognizable. If your target size is too low ("unreasonable"), we will produce the smallest possible file at the lowest safe quality setting.',
    },
    {
        question: 'Why is there a limit on how big I can make an image?',
        answer:
            'Browser safety. Processing massive images (e.g., 20,000+ pixels) requires gigabytes of RAM. To prevent your device from freezing or crashing, we limit the maximum output dimensions and file size to what your browser can safely handle.',
    },
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
                className="flex w-full items-center justify-between py-4 text-left text-lg font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                {question}
                <ChevronDown
                    className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-200",
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
                <p className="text-base text-muted-foreground">{answer}</p>
            </div>
        </div>
    );
}

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="w-full max-w-3xl mx-auto" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-3xl font-bold text-center mb-8">
                Frequently Asked Questions
            </h2>
            <div className="space-y-0">
                {faqs.map((faq, index) => (
                    <AccordionItem
                        key={index}
                        question={faq.question}
                        answer={faq.answer}
                        isOpen={openIndex === index}
                        onToggle={() => handleToggle(index)}
                    />
                ))}
            </div>
        </section>
    );
}

export default FAQ;
