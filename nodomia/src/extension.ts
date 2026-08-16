import * as vscode from 'vscode';
import { NodomiaWebviewProvider } from './webview/nodomiaWebviewProvider';
import { initCourses } from './data/courses';

export function activate(context: vscode.ExtensionContext) {
	try {
		//Передаем путь где лежит расширение для того чтобы в будущем понимать где лежат данные
		initCourses(context.extensionPath);
	} catch (err) {
		console.error('Nodomia: failed to initialize courses', err);
		vscode.window.showErrorMessage(
			'Nodomia: не удалось загрузить данные курсов. Некоторые функции могут быть недоступны.'
		);
	}

	try {
		// Создаем мост между React-фронтендом (который рендерится внутри WebView) и extension host'ом VS Code
		const provider = new NodomiaWebviewProvider(context);
		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider('nodomia.sidePanel', provider)
		);
	} catch (err) {
		console.error('Nodomia: failed to register webview provider', err);
		vscode.window.showErrorMessage(
			'Nodomia: не удалось инициализировать интерфейс. Расширение не будет работать.'
		);
	}
}
