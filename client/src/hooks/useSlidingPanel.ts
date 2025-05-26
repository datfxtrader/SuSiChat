
import { useState, useCallback, useEffect } from 'react';
import { UIStandards } from '@/config/ui-standards.config';

export interface SlidingPanelOptions {
  title?: string;
  content: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  theme?: 'dark' | 'light';
  onClose?: () => void;
  closable?: boolean;
  overlay?: boolean;
}

export interface SlidingPanelState extends SlidingPanelOptions {
  isOpen: boolean;
  id: string;
}

export const useSlidingPanel = () => {
  const [panelState, setPanelState] = useState<SlidingPanelState>({
    isOpen: false,
    id: '',
    content: null,
    width: 'md',
    theme: 'dark',
    closable: true,
    overlay: true
  });

  const openPanel = useCallback((options: SlidingPanelOptions) => {
    const panelId = `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setPanelState({
      ...options,
      isOpen: true,
      id: panelId,
      width: options.width || 'md',
      theme: options.theme || 'dark',
      closable: options.closable !== false,
      overlay: options.overlay !== false
    });
  }, []);

  const closePanel = useCallback(() => {
    setPanelState(prev => {
      if (prev.onClose) {
        prev.onClose();
      }
      return {
        ...prev,
        isOpen: false
      };
    });
  }, []);

  const updatePanel = useCallback((updates: Partial<SlidingPanelOptions>) => {
    setPanelState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelState.isOpen && panelState.closable) {
        closePanel();
      }
    };
    
    if (panelState.isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [panelState.isOpen, panelState.closable, closePanel]);

  // Get panel classes using UI standards
  const getPanelClasses = useCallback(() => {
    return UIStandards.utils.getSlidingPanelClasses(
      panelState.isOpen,
      panelState.width,
      panelState.theme
    );
  }, [panelState.isOpen, panelState.width, panelState.theme]);

  // Get panel theme
  const getPanelTheme = useCallback(() => {
    return UIStandards.utils.getSlidingPanelTheme(panelState.theme);
  }, [panelState.theme]);

  return {
    panelState,
    openPanel,
    closePanel,
    updatePanel,
    getPanelClasses,
    getPanelTheme,
    isOpen: panelState.isOpen
  };
};

export default useSlidingPanel;
