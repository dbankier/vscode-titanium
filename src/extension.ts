// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {BuildOption, TiBuild} from './lib/TiBuild'


export function activate(context: vscode.ExtensionContext) {

  var project_flag = ' --project-dir "'  + vscode.workspace.rootPath +'"';
  console.log("activating")


	context.subscriptions.push(vscode.commands.registerCommand('extension.openAlloyFiles', () => {
    let config = vscode.workspace.getConfiguration("alloy")
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const document = editor.document;
    if (document.languageId !== "javascript") { return ; }
    const file_name = document.fileName;
    const regex = new RegExp(config['controller'] + "$");
    console.log(regex.toString());
    const style_file = file_name.replace(/controllers/, "styles").replace(regex, config["style"]);
    const view_file = file_name.replace(/controllers/, "views").replace(regex, config["view"]);
    return vscode.commands.executeCommand("workbench.action.closeOtherEditors")
    .then(() =>vscode.workspace.openTextDocument(style_file))
    .then((doc:vscode.TextDocument)=> vscode.window.showTextDocument(doc, 2, true) )

    .then(() =>vscode.workspace.openTextDocument(view_file))
    .then((doc:vscode.TextDocument)=> vscode.window.showTextDocument(doc, 3, true))
    .then(() => console.log("done"), (e) => console.error(e));
	}));

  context.subscriptions.push(vscode.commands.registerCommand('extension.tiBuild', () => {
    return new TiBuild(BuildOption.Normal).launch();
	}));
  context.subscriptions.push(vscode.commands.registerCommand('extension.tiBuildShadow', () => {
    return new TiBuild(BuildOption.Shadow).launch();
	}));
  context.subscriptions.push(vscode.commands.registerCommand('extension.tiBuildAppify', () => {
    return new TiBuild(BuildOption.Shadow).launch();
	}));
  context.subscriptions.push(vscode.commands.registerCommand('extension.tiClean', () => {
    return new TiBuild().clean();
	}));
}