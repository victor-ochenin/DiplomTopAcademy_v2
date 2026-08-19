import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  AnswerSchema,
  CheckResultSchema,
  WebviewMessageSchema,
  type WebviewMessage,
} from '../protocol';
import { loadCourseListAsync, loadCourseDetailsAsync } from '../data/courses';

// Приводит путь из webview к безопасному относительному пути: нормализует `\`,
// отклоняет абсолютные пути и любой `..`-сегмент (защита от чтения вне workspace).
function normalizeWorkspacePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split('/').includes('..')
  ) {
    throw new Error('Недопустимый путь к файлу');
  }
  return normalized;
}

export class NodomiaWebviewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    try {
      webviewView.webview.options = {
        // Разрешает выполнение js в WebviewView
        enableScripts: true,
        // Ограничение откуда будут грузиться файлы
        localResourceRoots: [this.context.extensionUri],
      };

      // Загрузка html
      webviewView.webview.html = await this.getHtmlContent(webviewView.webview);
    } catch (err) {
      console.error('Nodomia: failed to initialize webview', err);
      webviewView.webview.html = '<h1>Nodomia: failed to initialize</h1>';
      return;
    }

    // подписываемся на событие получения сообщений из webview где каждое обрабатываем через handleMessage
    webviewView.webview.onDidReceiveMessage(async (message) => {
      const parsed = WebviewMessageSchema.safeParse(message);
      if (!parsed.success) {
        console.warn(
          'Nodomia: invalid message from webview',
          parsed.error.issues,
        );
        return;
      }
      try {
        await this.handleMessage(parsed.data, webviewView);
      } catch (err) {
        console.error('Nodomia: unhandled error in message handler', err);
      }
    });
  }

  private async handleMessage(
    message: WebviewMessage,
    webviewView: vscode.WebviewView,
  ) {
    switch (message.type) {
      case 'ready':
        break;

      case 'loadProgress': {
        const saved = await this.getProgress();
        webviewView.webview.postMessage({ type: 'progress', payload: saved });
        break;
      }

      case 'saveProgress': {
        await this.context.globalState.update(
          'nodomia.progress',
          message.payload,
        );
        break;
      }

      // Запрос списка курсов для инициализации UI
      case 'getCourses': {
        try {
          const courses = await loadCourseListAsync();
          webviewView.webview.postMessage({
            type: 'courses',
            payload: courses,
          });
        } catch (err) {
          console.error('Nodomia: failed to load courses', err);
          webviewView.webview.postMessage({ type: 'courses', payload: [] });
        }
        break;
      }

      case 'getCourseDetails': {
        try {
          const course = await loadCourseDetailsAsync(message.payload);
          webviewView.webview.postMessage({
            type: 'courseDetails',
            payload: course,
          });
        } catch (err) {
          console.error('Nodomia: failed to load course details', err);
          webviewView.webview.postMessage({
            type: 'courseDetails',
            payload: null,
          });
        }
        break;
      }

      case 'askQuestion': {
        try {
          const res = await fetch('http://localhost:3001/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: message.payload.question,
              history: message.payload.history,
              requestId: message.payload.requestId,
            }),
          });
          if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
          }
          const data = AnswerSchema.safeParse(await res.json());
          if (!data.success) {
            throw new Error(
              `Server returned invalid answer: ${data.error.issues[0].message}`,
            );
          }
          webviewView.webview.postMessage({
            type: 'answer',
            requestId: message.payload.requestId,
            payload: data.data.answer,
          });
        } catch (err) {
          webviewView.webview.postMessage({
            type: 'ragError',
            requestId: message.payload.requestId,
            payload: err instanceof Error ? err.message : 'Unknown error',
          });
        }
        break;
      }

      case 'checkCode': {
        try {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders) {
            throw new Error('No workspace open');
          }

          let code: string;
          switch (message.payload.kind) {
            case 'project': {
              code = '';
              const missingFiles: string[] = [];
              for (const f of message.payload.expectedFiles) {
                const pattern = '**/' + f.replace(/\\/g, '/');
                const uris = await vscode.workspace.findFiles(
                  pattern,
                  '**/node_modules/**',
                  1,
                );
                if (uris.length === 0) {
                  missingFiles.push(f);
                  continue;
                }
                const bytes = await vscode.workspace.fs.readFile(uris[0]);
                code += `--- ${f} ---\n${new TextDecoder().decode(bytes)}\n\n`;
              }
              if (missingFiles.length > 0) {
                throw new Error(
                  `Не найдены файлы проекта: ${missingFiles.join(', ')}`,
                );
              }
              break;
            }
            case 'file': {
              const fullPath = vscode.Uri.joinPath(
                workspaceFolders[0].uri,
                normalizeWorkspacePath(message.payload.filePath),
              );
              const bytes = await vscode.workspace.fs.readFile(fullPath);
              code = new TextDecoder().decode(bytes);
              break;
            }
          }

          const res = await fetch('http://localhost:3001/api/check-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: message.payload.taskId,
              lessonId: message.payload.lessonId,
              code,
              kind: message.payload.kind,
            }),
          });
          if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
          }
          const result = CheckResultSchema.safeParse(await res.json());
          if (!result.success) {
            throw new Error(
              `Server returned invalid check result: ${result.error.issues[0].message}`,
            );
          }
          webviewView.webview.postMessage({
            type: 'checkResult',
            payload: result.data,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          const isServerDown = err instanceof TypeError;
          webviewView.webview.postMessage({
            type: 'checkResult',
            payload: {
              passed: false,
              feedback: isServerDown
                ? 'Сервер временно не работает, попробуйте позже'
                : msg,
            },
          });
        }
        break;
      }

      default:
        console.warn(
          `Nodomia: unknown message type: ${(message as any)?.type}`,
        );
    }
  }

  private async getProgress(): Promise<{
    completedTasks: Record<string, boolean>;
  }> {
    const empty = { completedTasks: {} };
    const global = this.context.globalState.get<{
      completedTasks: Record<string, boolean>;
    }>('nodomia.progress');
    if (global) {
      return global;
    }

    const legacy = this.context.workspaceState.get<{
      completedTasks: Record<string, boolean>;
    }>('nodomia.progress');
    if (
      legacy &&
      legacy.completedTasks &&
      Object.keys(legacy.completedTasks).length > 0
    ) {
      await this.context.globalState.update('nodomia.progress', legacy);
      await this.context.workspaceState.update('nodomia.progress', undefined);
      return legacy;
    }
    return empty;
  }

  private async getHtmlContent(webview: vscode.Webview): Promise<string> {
    try {
      const htmlPath = path.join(
        this.context.extensionUri.fsPath,
        'webview-ui',
        'index.html',
      );
      const html = await fs.promises.readFile(htmlPath, 'utf-8');

      // asWebviewUri Преобразует локальный `file://` URI в специальный URI, который VS Code может загружать внутри WebView.
      const mainJsUri = webview.asWebviewUri(
        vscode.Uri.joinPath(
          this.context.extensionUri,
          'dist',
          'webview',
          'main.js',
        ),
      );
      const mainCssUri = webview.asWebviewUri(
        vscode.Uri.joinPath(
          this.context.extensionUri,
          'dist',
          'webview',
          'main.css',
        ),
      );

      // Подставляем плейсхолдеры
      return html
        .replaceAll('{{mainJsUri}}', mainJsUri.toString())
        .replaceAll('{{mainCssUri}}', mainCssUri.toString())
        .replaceAll('{{cspSource}}', webview.cspSource);
    } catch (err) {
      console.error('Nodomia: failed to read webview index.html', err);
      return '<h1>Nodomia: failed to load UI</h1>';
    }
  }
}
