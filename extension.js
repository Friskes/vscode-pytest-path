// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const clipboardy = require("clipboardy");
const path = require("path");

function getNestedWorkspaceFolder() {
    return vscode.workspace
        .getConfiguration("pytestPath")
        .get("workspaceFolder");
}

function getWorkspaceFolderPath() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const nestedWorkspaceFolder = getNestedWorkspaceFolder();
    if (nestedWorkspaceFolder) {
        return `${workspaceFolder.uri.fsPath}\\${nestedWorkspaceFolder}; `;
    }
    return `${workspaceFolder.uri.fsPath}; `;
}

function getTestCommandUnittestFromConfiguration() {
    return vscode.workspace
        .getConfiguration("pytestPath")
        .get("testCommandUnittest");
}

function getTestCommandPytestFromConfiguration() {
    return vscode.workspace
        .getConfiguration("pytestPath")
        .get("testCommandPytest");
}

function getPostfixCommandFromConfiguration() {
    return vscode.workspace
        .getConfiguration("pytestPath")
        .get("postfixCommand");
}

function getPythonPathLevelFromConfiguration() {
    return vscode.workspace
        .getConfiguration("pytestPath")
        .get("pythonPathLevel");
}

function getExcludePytestXdistFromCmdFromConfiguration() {
    return vscode.workspace
        .getConfiguration("pytestPath")
        .get("excludePytestXdistFromCmd");
}

function getPythonPath(filePath, pPathSplitter) {
    const splittedPath = filePath.split(path.sep);
    if (
        splittedPath.length === 0 ||
        !splittedPath[splittedPath.length - 1].endsWith(".py")
    ) {
        return "";
    }

    const fileName = splittedPath.pop();

    if (pPathSplitter === ".") {
        var pythonPath =
            fileName !== "__init__.py"
                ? [fileName.substring(0, fileName.lastIndexOf("."))]
                : [];
    } else if (pPathSplitter === "/") {
        var pythonPath = [fileName];
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceName = workspaceFolder?.name;

    while (splittedPath.length > 0) {
        const currentDir = splittedPath.pop();
        if (workspaceName && currentDir === workspaceName) {
            pythonPath.unshift(currentDir);
            break;
        }
        pythonPath.unshift(currentDir);
    }

    let pythonPathLevel = getPythonPathLevelFromConfiguration();
    let fullPath = pythonPath.slice(pythonPathLevel).join(pPathSplitter);

    let embedded_library_path_prefix = "Lib.site-packages.";
    if (fullPath.startsWith(embedded_library_path_prefix)) {
        fullPath = fullPath.replace(embedded_library_path_prefix, "");
    }
    return fullPath
}

function parseSelections(selectionsSplitter, function_only = false) {
    return vscode.window.activeTextEditor.selections
        .map((s) => {
            let start = s.start;
            if (
                vscode.window.activeTextEditor.document
                    .lineAt(start.line)
                    .text.slice(start.character - 4, start.character - 1) === "def"
            ) {
                if (function_only) {
                    var className = "";
                } else {
                    // эта ветвь срабатывает если выделяют функцию в модуле или метод в классе
                    var _class = vscode.window.activeTextEditor.document
                        .getText()
                        .split("\n")
                        .slice(0, start.line)
                        .reverse()
                        .find((s) => s.match("(:?^|s)class"));

                    var is_class_method =
                        vscode.window.activeTextEditor.document
                            .lineAt(start.line)
                            .text.startsWith("    ") ||  // 4 space
                        vscode.window.activeTextEditor.document
                            .lineAt(start.line)
                            .text.startsWith("	");  // 1 tab

                    if (!_class || !is_class_method) {
                        var className = "";
                        selectionsSplitter = "";
                    } else {
                        var className = _class.split(" ")[1].split("(")[0];
                    }

                    if (className[className.length - 2] === ":") {
                        className = className.slice(0, className.length - 2);
                    }

                    className = className + selectionsSplitter;
                }
                return className + vscode.window.activeTextEditor.document.getText(s);
            } else if (
                vscode.window.activeTextEditor.document
                    .lineAt(start.line)
                    .text.slice(start.character - 6, start.character - 1) === "class"
            ) {
                // эта ветвь срабатывает когда выделяют чисто класс
                return vscode.window.activeTextEditor.document.getText(s);
            }
        })
        .filter((s) => {
            return !!s && !s.includes("\n") && !s.trim().includes(" ");
        });
}

function copyImportStatement(uri) {
    try {
        const filePath = uri
            ? uri.fsPath
            : vscode.window.activeTextEditor.document.fileName;
        const pythonPath = getPythonPath(filePath, ".");
        const selections = vscode.window.activeTextEditor.selections
            .map((s) => vscode.window.activeTextEditor.document.getText(s))
            .filter((s) => !!s && !s.includes("\n") && !s.trim().includes(" "));
        if (pythonPath && selections.length > 0) {
            const importStatement = generateImportStatement(pythonPath, selections);
            clipboardy.writeSync(importStatement);
        }
        if (pythonPath && selections.length == 0) {
            clipboardy.writeSync(pythonPath);
        }
    } catch (e) {
        console.log(e);
    }
}

function generateImportStatement(pythonPath, selections) {
    if (selections.length == 0) {
        return `import ${pythonPath}`;
    } else if (selections.length == 1) {
        const selection = selections[0].trim();
        return `from ${pythonPath} import ${selection}`;
    }
    const selection = selections.map((s) => `\t${s.trim()},`).join("\n");
    return `from ${pythonPath} import (\n${selection}\n)`;
}

function generatePath(
    pythonPath,
    selections,
    withCommand = false,
    testCommand,
    selectionsSplitter,
    postfixCommand
) {
    if (pythonPath && selections.length > 0) {
        return generatePathWithSelection(
            pythonPath,
            selections,
            withCommand,
            testCommand,
            selectionsSplitter,
            postfixCommand
        );
    }
    if (pythonPath && selections.length == 0) {
        return generatePathWithoutSelection(
            pythonPath,
            withCommand,
            testCommand,
            postfixCommand
        );
    }
}

function generatePathWithSelection(
    pythonPath,
    selections,
    withCommand = false,
    testCommand,
    selectionsSplitter,
    postfixCommand
) {
    if (selections.length == 0) {
        return withCommand
            ? `${testCommand} ${pythonPath}${postfixCommand}`
            : `${pythonPath}${postfixCommand}`;
    } else if (selections.length == 1) {
        const selection = selections[0].trim();
        return withCommand
            ? `${testCommand} ${pythonPath}${selectionsSplitter}${selection}${postfixCommand}`
            : `${pythonPath}${selectionsSplitter}${selection}${postfixCommand}`;
    }
    if (withCommand) {
        return selections
            .map(
                (s) => `${pythonPath}${selectionsSplitter}${s.trim()}${postfixCommand}`
            )
            .join(" ");
    } else {
        return `${testCommand} ${selections
            .map(
                (s) => `${pythonPath}${selectionsSplitter}${s.trim()}${postfixCommand}`
            )
            .join(" ")}`;
    }
}

function generatePathWithoutSelection(
    pythonPath,
    withCommand = false,
    testCommand,
    postfixCommand
) {
    return withCommand
        ? `${testCommand} ${pythonPath}${postfixCommand}`
        : `${pythonPath}${postfixCommand}`;
}

function copyTestPath(
    uri,
    withCommand,
    testCommand = "",
    pPathSplitter = ".",
    postfixCommand = "",
    function_only = false
) {
    try {
        const filePath = uri
            ? uri.fsPath
            : vscode.window.activeTextEditor.document.fileName;
        const pythonPath = getPythonPath(filePath, pPathSplitter);
        const selectionsSplitter = pPathSplitter === "/" ? "::" : ".";
        const selections = parseSelections(selectionsSplitter, function_only);

        let excludePytestXdistFromCmd =
            getExcludePytestXdistFromCmdFromConfiguration();
        if (excludePytestXdistFromCmd) {
            if (selections.length !== 0) {
                const hasDoubleColon = selections[0].includes("::");
                const startsWithUppercase = /^[a-zа-я]/.test(selections[0].trim());
                var itsPytest = (hasDoubleColon || (!hasDoubleColon && startsWithUppercase));
            } else {
                var itsPytest = pythonPath.endsWith(".py");
            };
            if (itsPytest) {
                // remove pytest-xdist multi workers if its run only one pytest function
                testCommand = testCommand.replace(/\s*-n\s+(?:\d+|\w+)/, "");
            };
        }

        const pathStatement = withCommand
            ? generatePath(
                pythonPath,
                selections,
                true,
                testCommand,
                selectionsSplitter,
                postfixCommand
            )
            : generatePath(
                pythonPath,
                selections,
                false,
                testCommand,
                selectionsSplitter,
                postfixCommand
            );
        clipboardy.writeSync(pathStatement);
    } catch (e) {
        console.log(e);
    }
}

function getPostfixCommand() {
    let postfixCommand = getPostfixCommandFromConfiguration();
    if (postfixCommand) {
        postfixCommand = `; ${postfixCommand}`;
    }
    return postfixCommand;
}

function copyPointPathToObjectStatement(uri) {
    copyTestPath(uri, false);
}

function copyPathToUnittestClassStatement(uri) {
    let testCommandUnittest = getTestCommandUnittestFromConfiguration();
    testCommandUnittest = "cd " + getWorkspaceFolderPath() + testCommandUnittest;  // override
    copyTestPath(uri, true, testCommandUnittest, ".", getPostfixCommand());
}

function copyPathToPytestClassStatement(uri) {
    let testCommandPytest = getTestCommandPytestFromConfiguration();
    testCommandPytest = "cd " + getWorkspaceFolderPath() + testCommandPytest; // override
    copyTestPath(uri, true, testCommandPytest, "/", getPostfixCommand());
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let pointPathToObjectWithoutCommand = vscode.commands.registerCommand(
        "extension.copyPointPathToObjectStatement",
        copyPointPathToObjectStatement
    );
    let pathToUnittestClassWithCommand = vscode.commands.registerCommand(
        "extension.copyPathToUnittestClassStatement",
        copyPathToUnittestClassStatement
    );
    let pathToPytestClassWithCommand = vscode.commands.registerCommand(
        "extension.copyPathToPytestClassStatement",
        copyPathToPytestClassStatement
    );
    let importStatement = vscode.commands.registerCommand(
        "extension.copyImportStatement",
        copyImportStatement
    );
    context.subscriptions.push(pointPathToObjectWithoutCommand);
    context.subscriptions.push(pathToUnittestClassWithCommand);
    context.subscriptions.push(pathToPytestClassWithCommand);
    context.subscriptions.push(importStatement);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
    activate,
    deactivate,
};
