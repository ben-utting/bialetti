import struct, zlib, math

def make_icon(size):
    pixels = [(0, 0, 0)] * (size * size)
    CX, CY = size / 2, size / 2
    RX = size * 0.295
    RY = size * 0.415
    ANGLE = math.radians(8)
    ca, sa = math.cos(ANGLE), math.sin(ANGLE)

    for y in range(size):
        for x in range(size):
            dx, dy = x - CX, y - CY
            xr =  dx * ca + dy * sa
            yr = -dx * sa + dy * ca
            dist2 = (xr / RX) ** 2 + (yr / RY) ** 2

            if dist2 > 1.0:
                continue

            idx = y * size + x
            t = 1.0 - dist2  # 1 = centre, 0 = edge

            # Warm rich brown, lightening toward centre
            r = int(58  + 95  * t)
            g = int(22  + 52  * t)
            b = int(4   + 16  * t)

            # Small highlight: upper-left quadrant
            hx = xr + RX * 0.30
            hy = yr + RY * 0.28
            hdist2 = (hx / (RX * 0.38)) ** 2 + (hy / (RY * 0.38)) ** 2
            if hdist2 < 1.0:
                hl = (1.0 - hdist2) * 0.42
                r = min(255, int(r + hl * 55))
                g = min(255, int(g + hl * 28))
                b = min(255, int(b + hl * 8))

            # S-shaped crease down the middle
            crease_cx = (size * 0.034) * math.sin(math.pi * yr / RY)
            crease_w  = size * 0.017
            cdist = abs(xr - crease_cx)
            if cdist < crease_w:
                factor = 0.28 + 0.38 * (cdist / crease_w)
                r = int(r * factor)
                g = int(g * factor)
                b = int(b * factor)

            pixels[idx] = (max(0, min(255, r)),
                           max(0, min(255, g)),
                           max(0, min(255, b)))
    return pixels

def save_png(path, size, pixels):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    sig  = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    raw  = b''.join(
        b'\x00' + bytes([v for px in pixels[y*size:(y+1)*size] for v in px])
        for y in range(size)
    )
    idat = chunk(b'IDAT', zlib.compress(raw, 6))
    iend = chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)
    print(f"  saved {path}  ({size}x{size})")

for size, name in [
    (512, 'icon-512.png'),
    (192, 'icon-192.png'),
    (180, 'apple-touch-icon.png'),
]:
    print(f"Rendering {size}x{size}…")
    save_png(f'/root/bialetti/{name}', size, make_icon(size))

print("Done.")
