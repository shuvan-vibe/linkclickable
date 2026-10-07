import os
from PIL import Image, ImageDraw

def create_icon(size, path):
    img = Image.new('RGBA', (size, size), color = (0, 0, 0, 0)) # transparent
    d = ImageDraw.Draw(img)
    # Draw a blue rounded rectangle
    d.rounded_rectangle([(0, 0), (size, size)], radius=size//4, fill=(59, 130, 246))
    img.save(path)

os.makedirs('c:\\Projects\\clicklink\\icons', exist_ok=True)
create_icon(16, 'c:\\Projects\\clicklink\\icons\\icon16.png')
create_icon(48, 'c:\\Projects\\clicklink\\icons\\icon48.png')
create_icon(128, 'c:\\Projects\\clicklink\\icons\\icon128.png')
