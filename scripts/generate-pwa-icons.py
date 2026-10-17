#!/usr/bin/env python3
"""Generate dependency-free BAC-2027 PNG icons from a tiny bitmap wordmark."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps" / "web" / "public" / "icons"

COLORS = {
    "background": (11, 61, 46),
    "circle": (20, 107, 82),
    "surface": (221, 243, 234),
    "text": (11, 61, 46),
    "accent": (15, 118, 110),
}

GLYPHS = {
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "2": ["11110", "00001", "00001", "11110", "10000", "10000", "11111"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
}


def chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))


def save_png(path: Path, size: int, pixels: bytearray) -> None:
    rows = bytearray()
    stride = size * 3
    for y in range(size):
        rows.append(0)
        rows.extend(pixels[y * stride : (y + 1) * stride])
    header = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    path.write_bytes(header + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


def generate(size: int) -> bytearray:
    background = COLORS["background"]
    pixels = bytearray(background * (size * size))

    def paint(x: int, y: int, color: tuple[int, int, int]) -> None:
        if 0 <= x < size and 0 <= y < size:
            index = (y * size + x) * 3
            pixels[index : index + 3] = bytes(color)

    center = size / 2
    outer_radius = size * 0.34
    inner_radius = size * 0.282
    for y in range(size):
        for x in range(size):
            distance_squared = (x + 0.5 - center) ** 2 + (y + 0.5 - center) ** 2
            if distance_squared <= outer_radius**2:
                paint(x, y, COLORS["circle"])
            if distance_squared <= inner_radius**2:
                paint(x, y, COLORS["surface"])

    scale = max(5, size // 32)
    glyph_width = 5 * scale
    spacing = 2 * scale
    total_width = glyph_width * 3 + spacing * 2
    origin_x = (size - total_width) // 2
    origin_y = int(size * 0.36)

    for character_index, character in enumerate("B27"):
        glyph = GLYPHS[character]
        base_x = origin_x + character_index * (glyph_width + spacing)
        for row, pattern in enumerate(glyph):
            for column, bit in enumerate(pattern):
                if bit == "1":
                    for offset_y in range(scale):
                        for offset_x in range(scale):
                            paint(
                                base_x + column * scale + offset_x,
                                origin_y + row * scale + offset_y,
                                COLORS["text"],
                            )

    line_y = int(size * 0.65)
    line_start = int(size * 0.35)
    line_end = int(size * 0.65)
    line_width = max(4, size // 36)
    for y in range(line_y, line_y + line_width):
        for x in range(line_start, line_end):
            paint(x, y, COLORS["accent"])

    return pixels


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        save_png(OUTPUT / f"icon-{size}.png", size, generate(size))
        print(f"Generated icon-{size}.png")


if __name__ == "__main__":
    main()
