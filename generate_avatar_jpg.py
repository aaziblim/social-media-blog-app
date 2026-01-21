from PIL import Image, ImageDraw
import os

def create_default_avatar_jpg():
    # Create a 300x300 blue image
    img = Image.new('RGB', (300, 300), color='#1da1f2')
    d = ImageDraw.Draw(img)
    
    # Draw a white circle for the head
    d.ellipse([75, 50, 225, 200], fill='white')
    
    # Draw a white semi-circle for the body
    d.ellipse([25, 220, 275, 470], fill='white')
    
    # Ensure media directory exists
    os.makedirs('media', exist_ok=True)
    
    # Save as JPG
    path = os.path.join('media', 'default.jpg')
    img.save(path, 'JPEG')
    print(f"Created {path}")

if __name__ == "__main__":
    create_default_avatar_jpg()
