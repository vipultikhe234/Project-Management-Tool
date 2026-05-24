import os
import re

src_dir = r"D:\Projects\PHP Projects\Project Management System\web\src"
allowed_numbers = {50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950}

color_regex = re.compile(r'\b(?:bg|text|border|ring|stroke|fill|from|to|via|hover|focus|active|group-hover|dark:bg|dark:text|dark:border|placeholder)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(\d+)\b')

found_invalid = []

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css', '.html')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                matches = color_regex.findall(content)
                for num_str in matches:
                    num = int(num_str)
                    if num not in allowed_numbers:
                        found_invalid.append((os.path.relpath(path, src_dir), num_str))
            except Exception as e:
                print(f"Error reading {path}: {e}")

# Unique and print
unique_invalid = sorted(list(set(found_invalid)))
print("Found invalid colors:")
for path, color in unique_invalid:
    print(f"{path}: {color}")
