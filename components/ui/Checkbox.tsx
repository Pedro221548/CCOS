import React from 'react';
import { Check, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  label,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 18,
  };

  return (
    <label
      className={`flex items-center gap-3 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
          ref={(el) => {
            if (el) el.indeterminate = indeterminate;
          }}
        />
        <div
          className={`${sizeClasses[size]} rounded border-2 transition-all duration-200 flex items-center justify-center ${
            checked || indeterminate
              ? 'bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
              : 'bg-slate-800/50 border-slate-700 group-hover:border-slate-500'
          }`}
        >
          <AnimatePresence mode="wait">
            {indeterminate ? (
              <motion.div
                key="indeterminate"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Minus size={iconSize[size]} className="text-slate-950 stroke-[4]" />
              </motion.div>
            ) : checked ? (
              <motion.div
                key="checked"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check size={iconSize[size]} className="text-slate-950 stroke-[3]" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      {label && (
        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
