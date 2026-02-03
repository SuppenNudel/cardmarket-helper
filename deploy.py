import os
import zipfile
from gitignore_parser import parse_gitignore

# This script zips the current directory into 'cardmarket-assistant.zip',
# excluding files and directories specified in the '.deployignore' file.
# The zip is to be uploaded to https://addons.mozilla.org/en-US/developers/addons

def zip_directory(directory, zip_filename, ignore_file):
    # Parse the ignore file
    ignore_parser = parse_gitignore(ignore_file)

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Function to filter files and directories based on ignore list
        def ignore_filter(path):
            return ignore_parser(path)

        # Walk through directory and add files to ZIP
        for root, dirs, files in os.walk(directory):
            # Filter out ignored files and directories
            dirs[:] = [d for d in dirs if not ignore_filter(os.path.join(root, d))]
            files = [f for f in files if not ignore_filter(os.path.join(root, f))]

            for file in files:
                file_path = os.path.join(root, file)
                zipf.write(file_path, os.path.relpath(file_path, directory))

if __name__ == "__main__":
    directory = "."
    zip_filename = "cardmarket-helper.zip"
    ignore_file = ".deployignore"
    zip_directory(directory, zip_filename, ignore_file)
