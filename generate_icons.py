
from PIL import Image, ImageDraw
import os

def create_app_icon(size, filename):
    # Create a new image with the specified size
    img = Image.new('RGBA', (size, size), (13, 110, 253, 255))  # Bootstrap primary blue
    draw = ImageDraw.Draw(img)
    
    # Draw a simple car icon
    # Car body
    car_width = int(size * 0.7)
    car_height = int(size * 0.4)
    car_x = (size - car_width) // 2
    car_y = (size - car_height) // 2
    
    # Main car body
    draw.rounded_rectangle([car_x, car_y, car_x + car_width, car_y + car_height], 
                          radius=int(size * 0.05), fill=(255, 255, 255, 255))
    
    # Windshield
    windshield_height = int(car_height * 0.6)
    windshield_y = car_y + int(car_height * 0.1)
    draw.rounded_rectangle([car_x + int(car_width * 0.1), windshield_y, 
                           car_x + car_width - int(car_width * 0.1), 
                           windshield_y + windshield_height], 
                          radius=int(size * 0.02), fill=(13, 110, 253, 255))
    
    # Wheels
    wheel_radius = int(size * 0.08)
    wheel_y = car_y + car_height - wheel_radius // 2
    # Left wheel
    draw.ellipse([car_x + int(car_width * 0.15) - wheel_radius, wheel_y - wheel_radius,
                  car_x + int(car_width * 0.15) + wheel_radius, wheel_y + wheel_radius],
                 fill=(50, 50, 50, 255))
    # Right wheel
    draw.ellipse([car_x + int(car_width * 0.85) - wheel_radius, wheel_y - wheel_radius,
                  car_x + int(car_width * 0.85) + wheel_radius, wheel_y + wheel_radius],
                 fill=(50, 50, 50, 255))
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created icon: {filename}")

def main():
    # Create icons directory if it doesn't exist
    os.makedirs('static/icons', exist_ok=True)
    
    # Icon sizes for PWA
    sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512]
    
    for size in sizes:
        filename = f'static/icons/icon-{size}x{size}.png'
        create_app_icon(size, filename)
    
    # Create favicon
    create_app_icon(32, 'static/icons/favicon.ico')
    
    # Create screenshots (placeholder)
    # Wide screenshot
    img_wide = Image.new('RGB', (1280, 720), (33, 37, 41))
    draw_wide = ImageDraw.Draw(img_wide)
    draw_wide.text((640, 360), "Oceny Kierowców", fill=(255, 255, 255), anchor="mm")
    img_wide.save('static/icons/screenshot-wide.png', 'PNG')
    
    # Narrow screenshot
    img_narrow = Image.new('RGB', (640, 1136), (33, 37, 41))
    draw_narrow = ImageDraw.Draw(img_narrow)
    draw_narrow.text((320, 568), "Oceny Kierowców", fill=(255, 255, 255), anchor="mm")
    img_narrow.save('static/icons/screenshot-narrow.png', 'PNG')
    
    print("All PWA icons generated successfully!")

if __name__ == '__main__':
    main()
