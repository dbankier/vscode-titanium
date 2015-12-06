// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	var disposable = vscode.commands.registerCommand('extension.openRelativeJASTFiles', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const document = editor.document;
    if (document.languageId !== "javascript") { return ; }
    const file_name = document.fileName;
    const stss_file = file_name.replace(/controllers/, "styles").replace(/\.js$/,".stss");
    const jade_file = file_name.replace(/controllers/, "views").replace(/\.js$/,".jade");
    return vscode.commands.executeCommand("workbench.action.closeOtherEditors")
    .then(() => vscode.commands.executeCommand("workbench.action.splitEditor"))
    .then(() =>vscode.workspace.openTextDocument(stss_file))
    .then(doc=> vscode.window.showTextDocument(doc) )
    .then(() => vscode.commands.executeCommand("workbench.action.focusLeftEditor"))
    .then(() => new Promise((r,j) => setTimeout(r,1000)))
    .then(() => vscode.commands.executeCommand("workbench.action.splitEditor"))
    .then(() =>vscode.workspace.openTextDocument(jade_file))
    .then(doc=> vscode.window.showTextDocument(doc))
    .then(() => console.log("done"), (e) => console.error(e));
	});
	context.subscriptions.push(disposable);
}