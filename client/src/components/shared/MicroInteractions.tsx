
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Heart, Star, ThumbsUp, Zap } from 'lucide-react';
import UIStandards from '@/config/ui-standards.config';

// Button Press Animation
interface ButtonPressProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const ButtonPress: React.FC<ButtonPressProps> = ({ 
  children, 
  onClick, 
  className = '',
  disabled = false 
}) => (
  <motion.button
    whileHover={disabled ? {} : { scale: 1.02 }}
    whileTap={disabled ? {} : { scale: 0.98 }}
    onClick={disabled ? undefined : onClick}
    className={`transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    disabled={disabled}
  >
    {children}
  </motion.button>
);

// Hover Lift Effect
interface HoverLiftProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
}

export const HoverLift: React.FC<HoverLiftProps> = ({ 
  children, 
  className = '',
  intensity = 'medium'
}) => {
  const intensityMap = {
    subtle: { y: -1, shadow: '0 4px 12px rgba(0, 0, 0, 0.15)' },
    medium: { y: -2, shadow: '0 8px 25px rgba(0, 0, 0, 0.2)' },
    strong: { y: -4, shadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }
  };

  return (
    <motion.div
      whileHover={{ 
        y: intensityMap[intensity].y,
        boxShadow: intensityMap[intensity].shadow
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`transition-all ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Success Ripple Animation
interface SuccessRippleProps {
  isVisible: boolean;
  onComplete?: () => void;
  color?: string;
}

export const SuccessRipple: React.FC<SuccessRippleProps> = ({ 
  isVisible, 
  onComplete,
  color = 'green'
}) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onAnimationComplete={onComplete}
      >
        <motion.div
          className={`w-32 h-32 border-4 border-${color}-500 rounded-full`}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className={`w-12 h-12 text-${color}-500`} />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Floating Heart Animation
interface FloatingHeartProps {
  isVisible: boolean;
  onComplete?: () => void;
  startPosition?: { x: number; y: number };
}

export const FloatingHeart: React.FC<FloatingHeartProps> = ({
  isVisible,
  onComplete,
  startPosition = { x: 0, y: 0 }
}) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className="fixed pointer-events-none z-50"
        style={{
          left: startPosition.x,
          top: startPosition.y
        }}
        initial={{ opacity: 1, scale: 0 }}
        animate={{ 
          opacity: 0, 
          scale: 1.5, 
          y: -100,
          x: Math.random() * 40 - 20
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
      >
        <Heart className="w-6 h-6 text-red-500 fill-current" />
      </motion.div>
    )}
  </AnimatePresence>
);

// Feedback Burst Animation
interface FeedbackBurstProps {
  type: 'like' | 'star' | 'zap';
  isVisible: boolean;
  onComplete?: () => void;
  position?: { x: number; y: number };
}

export const FeedbackBurst: React.FC<FeedbackBurstProps> = ({
  type,
  isVisible,
  onComplete,
  position = { x: 0, y: 0 }
}) => {
  const icons = {
    like: ThumbsUp,
    star: Star,
    zap: Zap
  };

  const colors = {
    like: 'text-blue-500',
    star: 'text-yellow-500',
    zap: 'text-purple-500'
  };

  const Icon = icons[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed pointer-events-none z-50"
          style={{
            left: position.x,
            top: position.y
          }}
          onAnimationComplete={onComplete}
        >
          {/* Main icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1.2, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Icon className={`w-8 h-8 ${colors[type]}`} />
          </motion.div>
          
          {/* Particles */}
          {Array.from({ length: 8 }, (_, i) => (
            <motion.div
              key={i}
              className={`absolute w-2 h-2 ${colors[type]} rounded-full`}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i * Math.PI * 2) / 8) * 40,
                y: Math.sin((i * Math.PI * 2) / 8) * 40
              }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Typewriter Sound Effect (visual)
interface TypewriterEffectProps {
  isActive: boolean;
  intensity?: number;
}

export const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
  isActive,
  intensity = 1
}) => (
  <AnimatePresence>
    {isActive && (
      <motion.div
        className="fixed bottom-4 right-4 pointer-events-none z-40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.6, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
      >
        <motion.div
          className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ 
            duration: 0.3 * intensity, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <motion.div
            className="w-2 h-2 bg-zinc-400 rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ 
              duration: 0.2 * intensity, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Slide in notification
interface SlideNotificationProps {
  isVisible: boolean;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  onClose?: () => void;
  duration?: number;
}

export const SlideNotification: React.FC<SlideNotificationProps> = ({
  isVisible,
  message,
  type = 'info',
  onClose,
  duration = 3000
}) => {
  const colors = {
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white'
  };

  React.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-4 right-4 z-50"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <div className={`${colors[type]} px-6 py-3 rounded-lg shadow-lg max-w-sm`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Loading dots with wave animation
export const LoadingWave: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-1 h-3',
    md: 'w-1.5 h-4',
    lg: 'w-2 h-5'
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div
          key={i}
          className={`${sizeClasses[size]} bg-zinc-400 rounded-full`}
          animate={{ scaleY: [1, 2, 1] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
};

// Pulse ring effect
interface PulseRingProps {
  isActive: boolean;
  color?: string;
  size?: number;
}

export const PulseRing: React.FC<PulseRingProps> = ({
  isActive,
  color = 'blue',
  size = 100
}) => (
  <AnimatePresence>
    {isActive && (
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          width: size,
          height: size,
          margin: 'auto'
        }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className={`absolute inset-0 border-2 border-${color}-500 rounded-full`}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6
            }}
          />
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

// Export all micro-interactions
export const MicroInteractions = {
  ButtonPress,
  HoverLift,
  SuccessRipple,
  FloatingHeart,
  FeedbackBurst,
  TypewriterEffect,
  SlideNotification,
  LoadingWave,
  PulseRing
};

export default MicroInteractions;
