import os

directories = [
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components'
]

for d in directories:
    for filename in os.listdir(d):
        if filename.endswith('.jsx'):
            file_path = os.path.join(d, filename)
            with open(file_path, 'r') as f:
                content = f.read()

            new_content = content.replace('uppercase tracking-tighter', 'uppercase tracking-widest')
            new_content = new_content.replace('uppercase tracking-tight', 'uppercase tracking-wider')
            new_content = new_content.replace(' tracking-tighter', ' tracking-normal')
            new_content = new_content.replace(' tracking-tight', ' tracking-normal')

            if new_content != content:
                with open(file_path, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filename}")

