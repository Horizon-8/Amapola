Option Explicit
Dim shell, files, folder, shortcut, iconPath
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
If Not files.FileExists(files.BuildPath(folder, "Amapola.exe")) Then
    MsgBox "Extrae todo el archivo ZIP antes de crear el acceso directo.", 48, "Amapola"
    WScript.Quit 1
End If
Set shortcut = shell.CreateShortcut(files.BuildPath(shell.SpecialFolders("Desktop"), "Amapola.lnk"))
shortcut.TargetPath = files.BuildPath(folder, "Amapola.exe")
shortcut.WorkingDirectory = folder
shortcut.Description = "Amapola - Alumnos y clases"
iconPath = files.BuildPath(folder, "windows\Amapola.ico")
If files.FileExists(iconPath) Then
    shortcut.IconLocation = iconPath & ",0"
Else
    shortcut.IconLocation = files.BuildPath(folder, "Amapola.exe") & ",0"
End If
shortcut.Save
MsgBox "Acceso directo creado en el escritorio. No muevas la carpeta de Amapola.", 64, "Amapola"
