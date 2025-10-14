#!/usr/bin/env python3
"""
Generate test images for TwoUpInteractiveMode component tests.
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw
import os

# Create base directory
BASE_DIR = os.path.join(os.path.dirname(__file__), 'images')
os.makedirs(BASE_DIR, exist_ok=True)

def create_solid_background(width, height, color):
    """Create a solid color background."""
    return Image.new('RGB', (width, height), color)

def add_square(img, x, y, size, color):
    """Add a square to an image."""
    draw = ImageDraw.Draw(img)
    draw.rectangle([x, y, x + size, y + size], fill=color)
    return img

def add_circle(img, x, y, radius, color):
    """Add a circle to an image."""
    draw = ImageDraw.Draw(img)
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)
    return img

def add_triangle(img, x, y, size, color):
    """Add a triangle to an image."""
    draw = ImageDraw.Draw(img)
    points = [(x, y - size), (x - size, y + size), (x + size, y + size)]
    draw.polygon(points, fill=color)
    return img

def add_pixels(img, positions, color):
    """Add individual pixels at specified positions."""
    pixels = img.load()
    for x, y in positions:
        if 0 <= x < img.width and 0 <= y < img.height:
            pixels[x, y] = color
    return img

def create_checkerboard(width, height, square_size):
    """Create a checkerboard pattern."""
    img = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    for y in range(0, height, square_size):
        for x in range(0, width, square_size):
            if ((x // square_size) + (y // square_size)) % 2 == 0:
                draw.rectangle([x, y, x + square_size, y + square_size], fill=(0, 0, 0))
    
    return img

def create_diff_image(expected_img, actual_img, diff_positions, highlight_color=(255, 105, 180)):
    """Create a diff image showing differences with pink highlights."""
    # Get unified dimensions
    width = max(expected_img.width, actual_img.width)
    height = max(expected_img.height, actual_img.height)
    
    # Create base image from expected
    diff_img = Image.new('RGB', (width, height), (0, 0, 0))
    
    # Paste expected image
    diff_img.paste(expected_img, (0, 0))
    
    # Overlay actual image pixels where they exist
    if actual_img.size != (width, height):
        # For mismatched sizes, paste actual where it fits
        diff_img.paste(actual_img, (0, 0))
    
    # Add pink highlights for differences
    pixels = diff_img.load()
    for x, y in diff_positions:
        if 0 <= x < width and 0 <= y < height:
            pixels[x, y] = highlight_color
    
    return diff_img

def generate_diff_positions_for_shape(x, y, width, height):
    """Generate pixel positions for a rectangular area."""
    positions = []
    for py in range(y, min(y + height, 10000)):
        for px in range(x, min(x + width, 10000)):
            positions.append((px, py))
    return positions

# 1. Standard Set (1920×1080)
print("Generating standard set (1920×1080)...")
os.makedirs(os.path.join(BASE_DIR, 'standard'), exist_ok=True)

expected_std = create_solid_background(1920, 1080, (70, 130, 180))  # Blue
expected_std.save(os.path.join(BASE_DIR, 'standard', 'expected.png'))

actual_std = create_solid_background(1920, 1080, (70, 130, 180))
actual_std = add_square(actual_std, 1820, 50, 50, (255, 0, 0))  # Red square
actual_std.save(os.path.join(BASE_DIR, 'standard', 'actual.png'))

diff_positions = generate_diff_positions_for_shape(1820, 50, 50, 50)
diff_std = create_diff_image(expected_std, actual_std, diff_positions)
diff_std.save(os.path.join(BASE_DIR, 'standard', 'diff.png'))

# 2. Mismatched Dimensions
print("Generating mismatched dimensions set...")
os.makedirs(os.path.join(BASE_DIR, 'mismatched'), exist_ok=True)

expected_wide = create_solid_background(1000, 200, (34, 139, 34))  # Green
expected_wide.save(os.path.join(BASE_DIR, 'mismatched', 'expected-wide.png'))

actual_tall = create_solid_background(200, 900, (255, 140, 0))  # Orange
actual_tall.save(os.path.join(BASE_DIR, 'mismatched', 'actual-tall.png'))

# Diff for mismatched: unified 1000x900, show both colors with pink highlights
diff_mismatch = Image.new('RGB', (1000, 900), (34, 139, 34))
diff_mismatch.paste(actual_tall, (0, 0))
# Highlight the entire different area
diff_positions = []
for y in range(900):
    for x in range(1000):
        if x >= 200 or y >= 200:
            diff_positions.append((x, y))
diff_mismatch_img = create_diff_image(expected_wide, actual_tall, diff_positions)
diff_mismatch_img.save(os.path.join(BASE_DIR, 'mismatched', 'diff-mismatched.png'))

# 3. Portrait (600×1200)
print("Generating portrait set (600×1200)...")
os.makedirs(os.path.join(BASE_DIR, 'portrait'), exist_ok=True)

expected_portrait = create_solid_background(600, 1200, (128, 0, 128))  # Purple
expected_portrait.save(os.path.join(BASE_DIR, 'portrait', 'expected-portrait.png'))

actual_portrait = create_solid_background(600, 1200, (128, 0, 128))
actual_portrait = add_circle(actual_portrait, 100, 1100, 30, (255, 255, 0))  # Yellow circle
actual_portrait.save(os.path.join(BASE_DIR, 'portrait', 'actual-portrait.png'))

diff_positions = generate_diff_positions_for_shape(70, 1070, 60, 60)
diff_portrait = create_diff_image(expected_portrait, actual_portrait, diff_positions)
diff_portrait.save(os.path.join(BASE_DIR, 'portrait', 'diff-portrait.png'))

# 4. Landscape (1600×400)
print("Generating landscape set (1600×400)...")
os.makedirs(os.path.join(BASE_DIR, 'landscape'), exist_ok=True)

expected_landscape = create_solid_background(1600, 400, (0, 128, 128))  # Teal
expected_landscape.save(os.path.join(BASE_DIR, 'landscape', 'expected-landscape.png'))

actual_landscape = create_solid_background(1600, 400, (0, 128, 128))
actual_landscape = add_triangle(actual_landscape, 1200, 200, 40, (255, 0, 255))  # Magenta triangle
actual_landscape.save(os.path.join(BASE_DIR, 'landscape', 'actual-landscape.png'))

diff_positions = generate_diff_positions_for_shape(1160, 160, 80, 80)
diff_landscape = create_diff_image(expected_landscape, actual_landscape, diff_positions)
diff_landscape.save(os.path.join(BASE_DIR, 'landscape', 'diff-landscape.png'))

# 5. Detailed for Zoom (800×600)
print("Generating detailed set for zoom (800×600)...")
os.makedirs(os.path.join(BASE_DIR, 'detailed'), exist_ok=True)

expected_detailed = create_checkerboard(800, 600, 10)
expected_detailed.save(os.path.join(BASE_DIR, 'detailed', 'expected-detailed.png'))

actual_detailed = create_checkerboard(800, 600, 10)
actual_detailed = add_square(actual_detailed, 10, 10, 10, (0, 0, 255))  # Blue square
actual_detailed.save(os.path.join(BASE_DIR, 'detailed', 'actual-detailed.png'))

diff_positions = generate_diff_positions_for_shape(10, 10, 10, 10)
diff_detailed = create_diff_image(expected_detailed, actual_detailed, diff_positions)
diff_detailed.save(os.path.join(BASE_DIR, 'detailed', 'diff-detailed.png'))

# 6. Small Difference (1000×1000)
print("Generating small difference set (1000×1000)...")
os.makedirs(os.path.join(BASE_DIR, 'small-diff'), exist_ok=True)

expected_small = create_solid_background(1000, 1000, (255, 255, 255))  # White
expected_small.save(os.path.join(BASE_DIR, 'small-diff', 'expected-small-diff.png'))

actual_small = create_solid_background(1000, 1000, (255, 255, 255))
pixel_positions = [(50, 50), (950, 50), (50, 950), (950, 950), (500, 500)]
actual_small = add_pixels(actual_small, pixel_positions, (255, 0, 0))  # Red pixels
actual_small.save(os.path.join(BASE_DIR, 'small-diff', 'actual-small-diff.png'))

diff_small = create_diff_image(expected_small, actual_small, pixel_positions)
diff_small.save(os.path.join(BASE_DIR, 'small-diff', 'diff-small-diff.png'))

# 7. Large Difference (800×800)
print("Generating large difference set (800×800)...")
os.makedirs(os.path.join(BASE_DIR, 'large-diff'), exist_ok=True)

expected_large = create_solid_background(800, 800, (255, 0, 0))  # Red
expected_large.save(os.path.join(BASE_DIR, 'large-diff', 'expected-large-diff.png'))

actual_large = create_solid_background(800, 800, (0, 0, 255))  # Blue
actual_large.save(os.path.join(BASE_DIR, 'large-diff', 'actual-large-diff.png'))

# All pixels are different
diff_positions = [(x, y) for y in range(800) for x in range(800)]
diff_large = create_solid_background(800, 800, (255, 105, 180))  # All pink
diff_large.save(os.path.join(BASE_DIR, 'large-diff', 'diff-large-diff.png'))

# 8. Small Images (120×40)
print("Generating small button images (120×40)...")
os.makedirs(os.path.join(BASE_DIR, 'button'), exist_ok=True)

expected_button = create_solid_background(120, 40, (169, 169, 169))  # Gray
expected_button.save(os.path.join(BASE_DIR, 'button', 'expected-button.png'))

actual_button = create_solid_background(120, 40, (169, 169, 169))
actual_button = add_circle(actual_button, 100, 20, 5, (0, 255, 0))  # Green dot
actual_button.save(os.path.join(BASE_DIR, 'button', 'actual-button.png'))

diff_positions = generate_diff_positions_for_shape(95, 15, 10, 10)
diff_button = create_diff_image(expected_button, actual_button, diff_positions)
diff_button.save(os.path.join(BASE_DIR, 'button', 'diff-button.png'))

print("\nAll test images generated successfully!")
print(f"Images saved to: {BASE_DIR}")