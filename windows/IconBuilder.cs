using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Collections.Generic;

// Converts the app artwork to standard 32-bit Windows icon frames.
internal static class IconBuilder
{
    private static byte[] Frame(Bitmap image)
    {
        int size = image.Width;
        int maskStride = ((size + 31) / 32) * 4;
        using (var output = new MemoryStream())
        using (var writer = new BinaryWriter(output))
        {
            writer.Write(40); writer.Write(size); writer.Write(size * 2);
            writer.Write((ushort)1); writer.Write((ushort)32); writer.Write(0);
            writer.Write(size * size * 4 + maskStride * size);
            writer.Write(0); writer.Write(0); writer.Write(0); writer.Write(0);
            for (int y = size - 1; y >= 0; y--)
                for (int x = 0; x < size; x++)
                {
                    Color pixel = image.GetPixel(x, y);
                    writer.Write(pixel.B); writer.Write(pixel.G);
                    writer.Write(pixel.R); writer.Write(pixel.A);
                }
            for (int y = size - 1; y >= 0; y--)
            {
                var mask = new byte[maskStride];
                for (int x = 0; x < size; x++)
                    if (image.GetPixel(x, y).A == 0)
                        mask[x / 8] |= (byte)(0x80 >> (x % 8));
                writer.Write(mask);
            }
            return output.ToArray();
        }
    }

    public static int Main(string[] args)
    {
        if (args.Length != 2) return 1;
        int[] sizes = { 16, 24, 32, 48, 64, 128, 256 };
        var frames = new List<byte[]>();
        using (var source = Image.FromFile(args[0]))
            foreach (int size in sizes)
                using (var image = new Bitmap(size, size, PixelFormat.Format32bppArgb))
                {
                    using (Graphics graphics = Graphics.FromImage(image))
                    {
                        graphics.Clear(Color.Transparent);
                        graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        graphics.CompositingQuality = CompositingQuality.HighQuality;
                        graphics.DrawImage(source, new Rectangle(0, 0, size, size));
                    }
                    frames.Add(Frame(image));
                }
        using (var output = File.Create(args[1]))
        using (var writer = new BinaryWriter(output))
        {
            writer.Write((ushort)0); writer.Write((ushort)1); writer.Write((ushort)sizes.Length);
            int offset = 6 + sizes.Length * 16;
            for (int i = 0; i < sizes.Length; i++)
            {
                writer.Write((byte)(sizes[i] == 256 ? 0 : sizes[i]));
                writer.Write((byte)(sizes[i] == 256 ? 0 : sizes[i]));
                writer.Write((byte)0); writer.Write((byte)0);
                writer.Write((ushort)1); writer.Write((ushort)32);
                writer.Write(frames[i].Length); writer.Write(offset);
                offset += frames[i].Length;
            }
            foreach (byte[] frame in frames) writer.Write(frame);
        }
        return 0;
    }
}
