using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Amapola")]
[assembly: AssemblyDescription("Gestión local de alumnos y clases")]
[assembly: AssemblyVersion("0.5.0.0")]

internal static class Launcher
{
    [STAThread]
    private static int Main()
    {
        string folder = AppDomain.CurrentDomain.BaseDirectory;
        string node = Path.Combine(folder, "runtime", "node.exe");
        string server = Path.Combine(folder, "app", "server.mjs");
        try
        {
            if (!File.Exists(node) || !File.Exists(server))
                throw new Exception("Extrae primero todo el archivo ZIP. Mantén Amapola.exe junto a las carpetas app y runtime.");
            var info = new ProcessStartInfo(node, "\"" + server + "\" --open --background");
            info.WorkingDirectory = folder;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.WindowStyle = ProcessWindowStyle.Hidden;
            // Launch independently from any developer environment on this PC.
            info.EnvironmentVariables.Remove("NODE_OPTIONS");
            info.EnvironmentVariables.Remove("NODE_PATH");
            using (var process = Process.Start(info))
            {
                if (process.WaitForExit(4000) && process.ExitCode != 0)
                    throw new Exception("No se pudo iniciar Amapola. Consulta amapola.log en la carpeta de datos indicada en la guía.");
            }
            return 0;
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "Amapola", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
