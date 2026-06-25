import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { spring, staggerContainer, staggerItem } from '../../lib/motion';
import Magnetic from './Magnetic';

interface FloatingAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  /** Optional override classes for the action pill background. */
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FloatingAction[];
  mainIcon?: React.ReactNode;
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions,
  mainIcon,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute bottom-16 right-0 flex flex-col items-end gap-3"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                variants={staggerItem}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-3 rounded-full border border-white/10 px-4 py-3 text-white shadow-e3 dark:shadow-e3-dark backdrop-blur-xl ${
                  action.color || 'bg-gradient-to-br from-primary to-accent'
                }`}
              >
                {action.icon}
                <span className="whitespace-nowrap text-sm font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Magnetic strength={0.4}>
        <motion.button
          onClick={() => setIsOpen(o => !o)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-e3 dark:shadow-e3-dark"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={spring.snappy}
          aria-label={isOpen ? 'Close actions' : 'Open actions'}
        >
          {mainIcon || <Plus className="h-6 w-6" />}
        </motion.button>
      </Magnetic>
    </div>
  );
};

export default FloatingActionButton;
