# Scroll-Driven Video About Page

A premium, immersive about page with 6 video sections that play smoothly on scroll.

## 🎬 Video Setup

### Required Videos
Place your videos in a `videos/` folder next to `index.html`:

```
about-page/
├── index.html
└── videos/
    ├── section1.mp4  (Logo section - center)
    ├── section2.mp4  (Content right - gradient right)
    ├── section3.mp4  (Content left - gradient left)
    ├── section4.mp4  (Content right - gradient right)
    ├── section5.mp4  (Content left - gradient left)
    └── section6.mp4  (Content right - gradient right)
```

### Video Specifications
Your videos are perfectly optimized:
- **Duration:** 3 seconds ✓
- **Frame Rate:** 60fps ✓
- **File Size:** Under 5MB ✓

### Recommended Video Encoding
For best scroll performance, encode with:
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 22 -r 60 -an output.mp4
```

## 🎯 How Scroll-Video Works

1. **Section Detection:** Each video section is tracked as you scroll
2. **Progress Mapping:** Scroll position within each section (0-100%) maps to video time (0-3 seconds)
3. **Frame Seeking:** Video `currentTime` updates smoothly based on scroll progress
4. **60fps Sync:** With 60fps videos, you get ~180 frames of smooth motion per section

### Scroll Behavior
- **One full viewport scroll** through a section = full video playback
- **Scroll up** = video plays backwards
- **Stop scrolling** = video pauses at current frame

## 📐 Page Structure

### Section 1: Hero/Logo
- Centered logo with radial gradient overlay
- Scroll indicator at bottom

### Sections 2-6: Content Sections
- Alternating left/right content placement
- Alternating gradient directions
- Title + description format

### Amenities Section
- Three-column grid (Retail Shops, The Club, Office Space Hub)
- Animated cards on scroll

### Footer
- 4-column layout with brand, navigation, and social links

## 🎨 Customization

### Colors (CSS Variables)
```css
:root {
    --color-bg: #0a0a0a;           /* Background */
    --color-text: #ffffff;          /* Primary text */
    --color-accent: #c9a962;        /* Gold accent */
    --color-accent-light: #e8d4a8;  /* Light gold */
}
```

### Fonts
- **Display:** Playfair Display (headings)
- **Body:** Outfit (paragraphs)

### Content
Edit the HTML to change:
- Logo text and tagline
- Section titles and descriptions
- Amenity names and descriptions
- Footer links and contact info

## 🚀 Deployment

1. Place files on any web server
2. Ensure videos are in the correct path
3. Test scroll performance

### Local Testing
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

## 📱 Responsive Design

- **Desktop:** Full side gradients, side-positioned content
- **Tablet:** Adjusted grid layouts
- **Mobile:** Bottom gradients, centered content, stacked amenities

## ⚡ Performance Tips

1. **Compress videos** with H.264 codec
2. **Preload videos** - already configured in HTML
3. **Use SSD hosting** for faster seek times
4. **Enable HTTP/2** on your server

## 🔧 Troubleshooting

### Videos not playing on scroll?
- Check video paths are correct
- Ensure videos are H.264 encoded (most compatible)
- Check browser console for errors

### Choppy scroll?
- Reduce video resolution if needed
- Ensure `preload="auto"` is set
- Close other browser tabs

### Videos show placeholder?
- Video files are missing or path is incorrect
- Check file names match exactly (case-sensitive)

---

Built with smooth scroll-driven video technology for an immersive experience.
