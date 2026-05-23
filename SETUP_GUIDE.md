# iOS Underground Telegram Mini App - Setup Guide

## Quick Start

This is a production-ready Telegram Mini App for iOS Underground featuring premium tech design, social links, and service information.

### Prerequisites
- Node.js 18+ and pnpm
- Git (optional)

### Installation

1. **Extract the ZIP file** to your desired location
2. **Navigate to the project directory**:
   ```bash
   cd ios-underground-tma
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Start development server**:
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:3000`

### Building for Production

```bash
pnpm build
```

This creates optimized production files in the `dist/` directory.

### Deployment

The app is ready to deploy to:
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Docker**: Build with `pnpm build` and serve `dist/public/`
- **Telegram Bot API**: Use the `dist/public/` folder as your web app URL

## Features

✨ **Premium Tech Aesthetic**
- Dark theme with blue-to-purple gradients
- Smooth animations and hover effects
- Glassmorphism design elements

🔗 **Integrated Social Links**
- Telegram channel
- YouTube channel
- ESign services

📱 **Responsive Design**
- Mobile-first approach
- Perfect for Telegram Mini App constraints
- Works on all screen sizes

## Customization

### Update Colors
Edit `/client/src/index.css` to modify the color palette:
```css
:root {
  --primary: oklch(0.55 0.25 263); /* Change primary color */
  --background: oklch(0.12 0.01 260); /* Change background */
}
```

### Update Content
Edit `/client/src/pages/Home.tsx` to:
- Change social links
- Update service information
- Modify featured content
- Add new sections

### Update Fonts
Edit `/client/index.html` to change Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;600;700&display=swap" rel="stylesheet" />
```

## Project Structure

```
ios-underground-tma/
├── client/
│   ├── public/          # Static files
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   ├── App.tsx      # Main app component
│   │   └── index.css    # Global styles
│   └── index.html       # HTML template
├── server/              # Backend server (optional)
├── package.json         # Dependencies
└── vite.config.ts       # Build configuration
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Type check with TypeScript
- `pnpm format` - Format code with Prettier

## Telegram Integration

To use this as a Telegram Mini App:

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Set the Web App URL to your deployed app URL
3. Users can open the app directly from Telegram

## Support & Resources

- **Main Website**: https://ios-underground.web.app/
- **ESign Services**: https://khoindvn.io.vn/
- **Telegram**: https://t.me/jhidios
- **YouTube**: https://youtube.com/@ios-underground

## License

All rights reserved © 2026 iOS Underground

## Notes

- The app uses React 19 with TypeScript
- Styling is done with Tailwind CSS 4
- UI components from shadcn/ui
- Responsive and mobile-optimized
- Dark theme by default

Enjoy your premium Telegram Mini App! 🚀
