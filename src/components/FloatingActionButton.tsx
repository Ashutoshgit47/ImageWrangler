import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { Plus, X, CheckSquare, FileDown, FolderDown, Layers, Trash2, UploadCloud } from 'lucide-react';

interface FloatingActionButtonProps {
  imagesCount: number;
  selectedCount: number;
  isZipping: boolean;
  allDone: boolean;
  onSelectAll: () => void;
  onDownloadAll: () => void;
  onZipAll: () => void;
  onMergeAll: () => void;
  onClearAll: () => void;
  onAddImages: () => void;
}

export function FloatingActionButton({
  imagesCount,
  selectedCount,
  isZipping,
  allDone,
  onSelectAll,
  onDownloadAll,
  onZipAll,
  onMergeAll,
  onClearAll,
  onAddImages,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeMenu]);

  const handleAction = (action: () => void) => {
    action();
    closeMenu();
  };

  if (imagesCount === 0) {
    return null;
  }

  const menuItems = [
    {
      label: 'Add Images',
      icon: UploadCloud,
      onClick: () => handleAction(onAddImages),
      colorClass: 'bg-green-600 hover:bg-green-700 text-white',
      disabled: false,
    },
    {
      label: selectedCount === imagesCount ? 'Deselect All' : 'Select All',
      icon: CheckSquare,
      onClick: () => handleAction(onSelectAll),
      colorClass: 'bg-muted hover:bg-muted/80 text-foreground',
      disabled: false,
    },
    {
      label: 'Download All',
      icon: FileDown,
      onClick: () => handleAction(onDownloadAll),
      colorClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      disabled: !allDone,
    },
    {
      label: isZipping ? 'Zipping...' : 'ZIP All',
      icon: FolderDown,
      onClick: () => handleAction(onZipAll),
      colorClass: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
      disabled: !allDone || isZipping,
    },
    {
      label: 'Merge All',
      icon: Layers,
      onClick: () => handleAction(onMergeAll),
      colorClass: 'bg-accent hover:bg-accent/80 text-accent-foreground',
      disabled: imagesCount < 2 || isZipping,
    },
    {
      label: 'Clear All',
      icon: Trash2,
      onClick: () => handleAction(onClearAll),
      colorClass: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
      disabled: false,
    },
  ];

  return (
    <div ref={fabRef} className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-start gap-3">
      {isOpen && (
        <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-2 duration-200">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                  item.colorClass
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={toggleMenu}
        className={cn(
          'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          'bg-gradient-to-br from-primary to-accent text-primary-foreground',
          'hover:shadow-xl hover:scale-110 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
          isOpen && 'rotate-45'
        )}
        aria-label={isOpen ? 'Close menu' : 'Open actions menu'}
        aria-expanded={isOpen}
      >
        <Plus className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-45')} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 sm:hidden"
          onClick={closeMenu}
        />
      )}
    </div>
  );
}

export default FloatingActionButton;
