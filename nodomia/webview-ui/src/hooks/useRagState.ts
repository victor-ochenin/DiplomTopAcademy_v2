import { useCallback, useEffect, useRef, useState } from 'react';
import { useVsCodeApi } from './useVsCodeApi';

interface RagState {
  isOpen: boolean;
}

const DEFAULT_STATE: RagState = {
  isOpen: false,
};

// Хук состояния панели ассистента: хранит isOpen в useState и синхронизирует
// с VS Code через getState/setState, чтобы открытость панели переживала перезагрузку webview.
export function useRagState() {
  const { getState, setState } = useVsCodeApi();
  const [isOpen, setIsOpen] = useState(false);
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) {
      return;
    }
    const saved = getState() as Partial<RagState> | undefined;
    if (saved) {
      setIsOpen(saved.isOpen ?? DEFAULT_STATE.isOpen);
    }
    restored.current = true;
  }, [getState]);

  useEffect(() => {
    if (!restored.current) {
      return;
    }
    setState({ isOpen });
  }, [isOpen, setState]);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    togglePanel,
    closePanel,
  };
}
