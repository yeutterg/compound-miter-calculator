# Deployment Guide

## Build Status

✅ **Successfully built and tested**
- Static export generated in `out/` directory
- All TypeScript checks passed
- No runtime errors
- Total bundle size: ~391 KB (First Load JS)

## Quick Deploy

### Vercel (Recommended - 1 Click)

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: Compound Miter Calculator"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel will automatically detect Next.js and deploy

**That's it!** Your app will be live at `https://your-project.vercel.app`

### Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `out` directory:
```bash
npx netlify-cli deploy --dir=out --prod
```

Or use Netlify's drag-and-drop interface to upload the `out` folder.

### GitHub Pages

1. Build:
```bash
npm run build
```

2. Push the `out` directory to `gh-pages` branch:
```bash
npx gh-pages -d out
```

3. Enable GitHub Pages in repository settings

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `out`
   - Node version: 18+

### AWS S3 + CloudFront

1. Build:
```bash
npm run build
```

2. Upload to S3:
```bash
aws s3 sync out/ s3://your-bucket-name --delete
```

3. Configure CloudFront distribution to point to your S3 bucket

## Environment Setup

No environment variables required! The app is fully static and runs entirely client-side.

## Testing the Build Locally

```bash
# After building
cd out
python -m http.server 8000
# Or use any static server
npx serve
```

Open http://localhost:8000 to test the production build.

## Bundle Analysis

- **Main Page**: 391 KB (first load)
  - Includes React Three Fiber for 3D visualization
  - shadcn/ui components
  - Calculation engines

- **Subsequent navigations**: ~116 KB (shared chunks)

## Performance Notes

- Static export enables edge deployment
- All calculations run client-side (no API calls)
- 3D visualization lazy-loads
- Responsive images optimized
- CSS-in-JS minimized

## Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Post-Deployment Checklist

- [ ] Test all calculations with various inputs
- [ ] Verify 3D visualization loads correctly
- [ ] Check responsive design on mobile/tablet
- [ ] Test copy-to-clipboard functionality
- [ ] Verify unit conversions (imperial ↔ metric)
- [ ] Test distance across flats (even vs odd sides)
- [ ] Verify volume calculations for planters
- [ ] Check board feet estimates

## Custom Domain

### Vercel
Settings → Domains → Add your domain

### Netlify
Site settings → Domain management → Add custom domain

### Cloudflare Pages
Pages project → Custom domains → Set up custom domain

## Monitoring

Recommended (optional):
- Vercel Analytics (built-in)
- Google Analytics 4
- Plausible Analytics (privacy-friendly)

## Future Updates

To deploy updates:
```bash
git add .
git commit -m "Update description"
git push
```

Vercel/Netlify will automatically rebuild and deploy.

## Support

For issues or questions:
- Check the README.md
- Review calculation formulas in `/lib/calculations/`
- Test in dev mode: `npm run dev`

---

Happy woodworking! 🪚🔨
