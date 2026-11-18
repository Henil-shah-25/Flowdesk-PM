import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Blurred backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-graphite/20 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet with 32px radius */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white/75 backdrop-blur-[24px] border border-white/70 shadow-[0_20px_60px_rgba(30,35,40,0.14)] rounded-t-[32px] sm:rounded-[32px] overflow-hidden max-h-[85vh] flex flex-col z-10`}
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-graphite/20" />
            </div>

            {/* Header */}
            {(title || description) && (
              <div className="px-7 pt-6 pb-4 flex items-start justify-between border-b border-black/[0.06]">
                <div>
                  {title && (
                    <h3 className="text-xl font-normal tracking-tighter text-graphite">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-secondary mt-1 font-normal leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <IconButton
                  icon={<X size={16} />}
                  aria-label="Close dialog"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                />
              </div>
            )}

            {/* Content body */}
            <div className="p-7 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
