import * as vscode from 'vscode';

//workaround for string enum 
//https://stackoverflow.com/questions/15490560/create-an-enum-with-string-values-in-typescript
export type Component = "controller" | "view" | "style";


 /**
 * Open the controller, view or style file relative to the currently opened file
 * @param type {Component} what component to be opened - view, controller or style
 * @returns {TextDocument} Thenable that resolves TextDocument
 */
export function openComponent(type: Component): Thenable<vscode.TextDocument>{

    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const document = editor.document;

    const file_name = document.fileName;

    let config = vscode.workspace.getConfiguration("alloy");

    //the current file extension
    const currentFileExt = file_name.substring(file_name.lastIndexOf('.'), file_name.length) || file_name;

    //skip if we are trying to change to same file type
    if (currentFileExt === config[type]) { return; }

    //get the current file 'type' based on the extension
    const currentFileType = Object.keys(config).find(key => config[key] === currentFileExt);

    //map our folder names to the file 'type'
    let paths = {
        'view': 'views',
        'controller': 'controllers',
        'style': 'styles'
    };

    const regexExt = new RegExp(currentFileExt + "$");

    //set the new directory and create the new file path
    const regexDir = new RegExp(paths[currentFileType]);
    const newFile = file_name.replace(regexDir, paths[type]).replace(regexExt, config[type]);

    //If the new file is already opened, we will just focus on it, otherwise, open the new file
    let promise;
    const currentlyOpenedDoc = vscode.workspace.textDocuments.find(obj => obj.fileName === newFile);

    /**
     * If the document is already open in another editor, focus on that editor instead of opening a new doc.
     * However, the API doesn't currently track the viewColumn of all open docs, just the 'visible' editor/doc
     * (the active tab) in each column.  So we may be opening a new doc even though the same doc is 
     * in a hidden tab.
     * https://github.com/Microsoft/vscode/issues/15178
     */

    //default to current column
    var activeColumn = vscode.window.activeTextEditor.viewColumn;
    var allDocs = vscode.workspace.textDocuments.map((doc) => ({ fileName: doc.fileName, viewColumn: activeColumn }));

    //take the array of visible editors and map the visible doc in each to a column
    var editors = vscode.window.visibleTextEditors
        .map(editor => ({ fileName: editor.document.fileName, viewColumn: editor.viewColumn }))
        .sort((a, b) => a.viewColumn - b.viewColumn);

    //
    allDocs.forEach(function (mp, idx) {
        var c = editors.findIndex(e => e.fileName === mp.fileName)

        if (c > -1) {
            mp.viewColumn = c + 1;
        }

    });

    if (currentlyOpenedDoc) {
        //grab the column number for the currently opened doc
        var column = allDocs.find(col => col.fileName === currentlyOpenedDoc.fileName).viewColumn;
        promise = vscode.window.showTextDocument(currentlyOpenedDoc, column);

    } else {
        promise = vscode.workspace.openTextDocument(newFile)
            .then((doc: vscode.TextDocument) => vscode.window.showTextDocument(doc, activeColumn));
    }

    return promise
        .then(() => console.log("done"), (e) => console.error(e));
}