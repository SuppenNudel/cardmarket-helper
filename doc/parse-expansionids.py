import re
import json

##################################################################
# 
# Reads the dom part of cardmarkets html for Expansion options
# and puts it into a dict for javascript
# 
##################################################################

# Read the HTML content from options.txt
with open('options.txt', 'r') as file:
    html_text = file.read()

# Use a regular expression to extract value and text pairs
pattern = re.compile(r'<option value="(\d+)"[^>]*>([^<]+)</option>')
matches = pattern.findall(html_text)

# Create a dictionary from the matches with integer keys, omitting the entry with id = 0
options_dict = {int(value): text for value, text in matches if int(value) != 0}

# Sort the dictionary by keys
sorted_options_dict = dict(sorted(options_dict.items()))

# Convert the dictionary to a prettified JavaScript-compatible string
js_dict_lines = [f"    {k}: \"{v}\"" for k, v in sorted_options_dict.items()]
js_dict = "{\n" + ",\n".join(js_dict_lines) + "\n}"

# Write the resulting JavaScript dictionary to expansionids.js
with open('expansionids.js', 'w') as file:
    file.write(f"const expansionIds = {js_dict};\n")

print("Conversion complete. Check expansionids.js for the result.")
