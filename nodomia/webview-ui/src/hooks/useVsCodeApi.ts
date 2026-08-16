import { useCallback, useEffect } from 'react';
import type { WebviewMessage, ExtensionMessage } from '../types/messages';

interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): Record<string, unknown> | undefined;
  setState(state: Record<string, unknown>): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let api: VsCodeApi | undefined;

// Возвращает единственный экземпляр VsCodeApi. acquireVsCodeApi вызывается только один раз (ленивый singleton).
function getVsCodeApi(): VsCodeApi {
  if (!api) {
    api = acquireVsCodeApi();
  }
  return api;
}

// Хук-обёртка над VsCodeApi webview: даёт postMessage/getState/setState и
// подписывает onMessage на сообщения, приходящие из extension host.
export function useVsCodeApi(onMessage?: (message: ExtensionMessage) => void) {
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
      return vscode.getState();
    }, [vscode]),

    setState: useCallback(
      (state: Record<string, unknown>) => {
        vscode.setState(state);
      },
      [vscode],
    ),
  };
}
