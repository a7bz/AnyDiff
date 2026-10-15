import * as vscode from 'vscode';

/** Reads a file as UTF-8 text, preferring the open document when there is one. */
export async function readFileText(uri: vscode.Uri): Promise<string> {
  const open = vscode.workspace.textDocuments.find(
    (document) => document.uri.toString() === uri.toString(),
  );
  if (open) {
    return open.getText();
  }
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString('utf8');
}
