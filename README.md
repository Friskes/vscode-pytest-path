# pytest-path

## Features

#### This extension adds commands to easily copy `pytest` and `unittest` path to test (classes, methods, functions and files).

#### There is also the functionality of copying the `import statement` to an object and copying the `point path` to the object.

![Video example](https://raw.githubusercontent.com/Friskes/vscode-pytest-path/main/images/example.gif)

## Extension Settings

This extension contributes the following settings:

* `pytestPath.workspaceFolder`: The starting directory to which you will navigate using the cd command before running the test command (default: `""`)
* `pytestPath.testCommandUnittest`: The command to be used when copying the Unittest test command (default: `"python manage.py test"`)
* `pytestPath.testCommandPytest`: The command to be used when copying the Pytest test command (default: `"pytest"`)
* `pytestPath.postfixCommand`: The command that will be added at the very end of the main command (default: `""`)
* `pytestPath.pythonPathLevel`: Starting from the root (workspace folder, folder where vscode is open) of the project, at which level should the python path string start (default: `2`)
* `pytestPath.excludePytestXdistFromCmd`: Exclude the -n <workers> flag from the command, if it was passed, when running one function or one method via pytest, to increase the speed of the test (default: `true`)

## Getting started

Before you start working, you need to create a file in the root of your project: `.vscode/settings.json` in which you need to specify the settings for your project.

> If everything is already working for you, this step is optional.

```json
{
    // Specify the path to the directory from which you want to see the path to the test, for Django projects, if they use a nested directory, this is usually the case: "src" or "app" or ""
    "pytestPath.workspaceFolder": "src",
    // Specify the number of nodes of the path that need to be cut off on the left in order to get the correct path, select it experimentally.
    "pytestPath.pythonPathLevel": 2
}
```

## Release Notes

### 0.0.1

Initial release of pytest-path

---

### 0.0.2

Add logo image for extension preview

---

### 0.0.3

Fix abs path to workspace foler for macOS and Linux OS

---

### 0.0.4

Ignore unused files and dirs from extension

---

### 0.0.5

Return node_modules dependencies

---

### 0.0.6

Fix bug with three : char in pytest path

---
