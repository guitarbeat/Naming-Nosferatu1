import os
import re

def resolve_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Pattern to match conflict blocks: <<<<<<< HEAD ... ======= ... >>>>>>> ...
    # We want to keep the HEAD part.
    # Note: DOTALL is needed to match newlines.
    pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> .*?\n', re.DOTALL)

    if not pattern.search(content):
        return False

    new_content = pattern.sub(r'\1\n', content)

    # Handle inline or different formatting if necessary, but start with standard blocks

    with open(filepath, 'w') as f:
        f.write(new_content)
    return True

root_dir = 'src'
count = 0
for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(('.ts', '.tsx')):
            filepath = os.path.join(dirpath, filename)
            if resolve_file(filepath):
                print(f"Resolved: {filepath}")
                count += 1

print(f"Total files resolved: {count}")
