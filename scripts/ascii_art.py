#!/usr/bin/env python3
"""Image → ASCII Art Converter for crawfish sprites"""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow 라이브러리가 필요합니다. 설치: pip install Pillow")
    sys.exit(1)

CHARSETS = {
    "standard":  " .:-=+*#%@",
    "dense":     " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    "blocks":    " ░▒▓█",
    "minimal":   " .oO@",
}


def image_to_ascii(image_path, width=120, charset="standard", invert=False, color=False):
    img = Image.open(image_path)
    aspect_ratio = img.height / img.width
    height = int(width * aspect_ratio * 0.45)
    img_resized = img.resize((width, height), Image.LANCZOS)
    img_rgb = img_resized.convert("RGB")
    img_gray = img_resized.convert("L")
    chars = CHARSETS.get(charset, CHARSETS["standard"])
    if invert:
        chars = chars[::-1]
    num_chars = len(chars)
    pixels = list(img_gray.getdata())
    rgb_pixels = list(img_rgb.getdata())
    lines = []
    for y in range(height):
        line = ""
        for x in range(width):
            idx = y * width + x
            brightness = pixels[idx]
            char_idx = int(brightness / 256 * num_chars)
            char_idx = min(char_idx, num_chars - 1)
            char = chars[char_idx]
            if color:
                r, g, b = rgb_pixels[idx]
                line += f"\033[38;2;{r};{g};{b}m{char}\033[0m"
            else:
                line += char
        lines.append(line)
    return "\n".join(lines)


def crop_and_convert(image_path, x, y, w, h, output_width=30, charset="blocks", color=False):
    """Crop a region from image and convert to ASCII"""
    img = Image.open(image_path)
    cropped = img.crop((x, y, x + w, y + h))
    # Save temp cropped
    tmp = "/tmp/crawfish_crop.png"
    cropped.save(tmp)
    return image_to_ascii(tmp, width=output_width, charset=charset, color=color)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("-w", "--width", type=int, default=120)
    parser.add_argument("-c", "--charset", default="standard", choices=CHARSETS.keys())
    parser.add_argument("-i", "--invert", action="store_true")
    parser.add_argument("--color", action="store_true")
    parser.add_argument("-o", "--output")
    parser.add_argument("--crop", help="x,y,w,h crop region")
    args = parser.parse_args()

    if not Path(args.image).exists():
        print(f"오류: 파일을 찾을 수 없습니다 → {args.image}")
        sys.exit(1)

    if args.crop:
        x, y, w, h = map(int, args.crop.split(","))
        result = crop_and_convert(args.image, x, y, w, h, args.width, args.charset, args.color)
    else:
        result = image_to_ascii(args.image, args.width, args.charset, args.invert, args.color)

    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
        print(f"저장 완료: {args.output}")
    else:
        print(result)
