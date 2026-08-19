import { useCallback, useEffect } from 'react';
import type { WebviewMessage, ExtensionMessage } from '../types/messages';

interface VsCodeApi<TState> {
  postMessage(message: WebviewMessage): void;
  getState(): TState | undefined;
  setState(state: TState): void;
}

declare function acquireVsCodeApi<TState>(): VsCodeApi<TState>;

let api: VsCodeApi<unknown> | undefined;

// Возвращает единственный экземпляр VsCodeApi. acquireVsCodeApi вызывается только один раз (ленивый singleton).
function getVsCodeApi(): VsCodeApi<unknown> {
  if (!api) {
    api = acquireVsCodeApi<unknown>();
  }
  return api;
}

// Хук-обёртка над VsCodeApi webview: даёт postMessage/getState/setState и
// подписывает onMessage на сообщения, приходящие из extension host.
export function useVsCodeApi<TState = unknown>(
  onMessage?: (message: ExtensionMessage) => void,
) {
  const vscode = getVsCodeApi();

  useEffect(() => {
    if (!onMessage) {
      return;
    }

    const listener = (event: MessageEvent) => {
      onMessage(event.data as ExtensionMessage);
    };

    window.addEventListener('message', listener);

    return () => {
      window.removeEventListener('message', listener);
    };
  }, [onMessage]);

  return {
    postMessage: useCallback(
      (message: WebviewMessage) => {
        vscode.postMessage(message);
      },
      [vscode],
    ),

    getState: useCallback(() => {
      return vscode.getState() as TState | undefined;
    }, [vscode]),

    setState: useCallback(
      (state: TState) => {
        vscode.setState(state as unknown);
      },
      [vscode],
    ),
  };
}
