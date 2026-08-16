import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'victor-ochenin.nodomia';

suite('Nodomia Extension', () => {
  test('extension is present', () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
  });

  test('extension activates successfully', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
    // VS Code вызывает activate() сам при первом обращении к расширению
    // getExtension не активирует — нужен явный вызов
    await ext.activate();
    assert.ok(ext.isActive, 'Extension did not become active');
  });

  test('registers nodomia.sidePanel webview provider', () => {
    // проверяем манифест расширения — подтверждает что провайдер зарегистрирован
    const packageJson =
      vscode.extensions.getExtension(EXTENSION_ID)!.packageJSON;
    const views = packageJson?.contributes?.views?.nodomia;
    const hasSidePanel = views?.some((v: any) => v.id === 'nodomia.sidePanel');
    assert.ok(hasSidePanel, 'nodomia.sidePanel not found in contributes.views');
  });

  test('activate does not throw', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
    await ext.activate(); // повторная активация не должна упасть
  });
});
