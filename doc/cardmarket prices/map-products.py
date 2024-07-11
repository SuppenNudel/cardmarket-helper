import json

# Input and output file paths
input_file = 'products_singles_1.json'
output_file = 'mapped_products.json'

# Read input JSON data
with open(input_file, 'r') as f:
    data = json.load(f)

# Map products to their idProduct
products_map = {product['idProduct']: product for product in data['products']}

# Example usage: print product with idProduct 1
product_id = 1
if product_id in products_map:
    print(f"Product with idProduct {product_id}:")
    print(products_map[product_id])
else:
    print(f"No product found with idProduct {product_id}")

# Write the result to a new JSON file
with open(output_file, 'w') as f:
    json.dump(products_map, f, indent=2)

print(f"Mapped products have been written to {output_file}")
