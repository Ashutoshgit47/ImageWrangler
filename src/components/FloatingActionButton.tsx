import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { Plus, CheckSquare, FileDown, FolderDown, Layers, Trash2, FileUpload } from './icons';
import { useTranslation } from '../lib/i18n';

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
  const { t } = useTranslation();
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
      label: t('btn_add_images'),
      icon: FileUpload,
      onClick: () => handleAction(onAddImages),
      colorClass: 'bg-accent hover:bg-accent-soft text-accent-foreground',
      disabled: false,
    },
    {
      label: selectedCount === imagesCount ? t('btn_deselect_all') : t('btn_select_all'),
      icon: CheckSquare,
      onClick: () => handleAction(onSelectAll),
      colorClass: 'bg-card hover:bg-elevated text-foreground border border-border',
      disabled: false,
    },
    {
      label: t('btn_download_all'),
      icon: FileDown,
      onClick: () => handleAction(onDownloadAll),
      colorClass: 'bg-primary hover:bg-primary-hover text-primary-foreground',
      disabled: !allDone,
    },
    {
      label: isZipping ? t('zipping') : t('btn_zip_all'),
      icon: FolderDown,
      onClick: () => handleAction(onZipAll),
      colorClass: 'bg-secondary hover:bg-elevated text-secondary-foreground border border-border',
      disabled: !allDone || isZipping,
    },
    {
      label: t('btn_merge_all'),
      icon: Layers,
      onClick: () => handleAction(onMergeAll),
      colorClass: 'bg-accent hover:bg-accent-soft text-accent-foreground',
      disabled: imagesCount < 2 || isZipping,
    },
    {
      label: selectedCount > 0 ? t('btn_clear_selected') : t('btn_clear_all'),
      icon: Trash2,
      onClick: () => handleAction(onClearAll),
      colorClass: 'bg-destructive hover:bg-destructive-hover text-destructive-foreground',
      disabled: false,
    },
  ];

  return (
    <div ref={fabRef} className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-start gap-3">
      {isOpen && (
        <div className="flex flex-col gap-2 mb-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all duration-200 min-h-[44px]',
                  'hover:scale-105 active:scale-95',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                  item.colorClass
                )}
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
          'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 min-h-[48px] min-w-[48px]',
          'bg-primary text-primary-foreground',
          'hover:bg-primary-hover hover:shadow-xl hover:scale-110 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
        )}
        aria-label={isOpen ? t('fab_close') : t('fab_open')}
        aria-expanded={isOpen}
      >
        <Plus className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-45')} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-accent/20 backdrop-blur-sm -z-10 sm:hidden"
          onClick={closeMenu}
        />
      )}
    </div>
  );
}

export default FloatingActionButton;
