import * as vscode from 'vscode';
import { t } from '../i18n';

const SEEN_KEY = 'anydiff.welcomeShown';

/**
 * Opens the "Getting started" walkthrough the first time the extension runs.
 *
 * The walkthrough itself is contributed declaratively in `package.json`
 * (`contributes.walkthroughs`), so this only decides *when* to show it.
 */
export async function maybeShowWelcome(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(SEEN_KEY, false)) {
    return;
  }
  await context.globalState.update(SEEN_KEY, true);

  try {
    await vscode.commands.executeCommand(
      'workbench.action.openWalkthrough',
      'anydiff.anydiff#anydiff.gettingStarted',
      false,
    );
  } catch {
    // The walkthrough API is unavailable in some hosts (e.g. older builds or
    // tests); fall back to a single informational message.
    void vscode.window.showInformationMessage(t('welcome.fallback'));
  }
}
