# Compound Miter Calculator

A professional web application for calculating precise compound miter angles for woodworking projects. Built with Next.js, React Three Fiber, and Tailwind CSS.

## Features

### Core Calculations
- **Compound Miter Angles**: Calculate blade tilt and miter gauge angles for any polygonal shape
- **Stock Width**: Determine minimum material width needed
- **Distance Across Flats**: Calculate narrowest width for even-sided polygons (important for clearance)
- **Interior Volume**: Estimate container capacity for planters and storage projects
- **Material Estimates**: Calculate board feet (imperial) or cubic meters (metric) with optional waste factor

### User Interface
- **Interactive 3D Visualization**: Real-time wireframe preview with material thickness toggle
- **Dual Unit Systems**: Full support for Imperial (inches/feet) and Metric (mm/cm) measurements
- **Project Types**: Customized calculations for General, Planter, Decorative, and Storage projects
- **Responsive Design**: Optimized for mobile, tablet, and desktop devices
- **Copy to Clipboard**: Quick copy functionality for all calculated values

### Smart Features
- **Conditional Displays**: Distance across flats only shown for even-sided polygons
- **Smart Volume Units**: Automatically selects appropriate units (gallons/quarts/liters)
- **Context-Aware Messages**: Helpful tips like "≈ 3 bags of potting soil" for planters
- **Material Presets**: Quick-select common material thicknesses
- **Persistent Preferences**: Remembers your unit preferences using localStorage

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **3D Graphics**: React Three Fiber + Three.js
- **State Management**: Zustand with persistence
- **Build**: Static export for edge deployment

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
\`\`\`bash
git clone <your-repo-url>
cd compound-miter-calculator
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Run the development server
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

This creates a static export in the `out` directory, ready for deployment to any static hosting service.

## Project Structure

```
compound-miter-calculator/
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Main application page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles with CSS variables
├── components/
│   ├── panels/                   # Main feature components
│   │   ├── InputPanel.tsx        # Input controls
│   │   ├── ResultsPanel.tsx      # Calculated results display
│   │   └── Visualization3D.tsx   # 3D wireframe preview
│   └── ui/                       # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── slider.tsx
├── lib/
│   ├── calculations/             # Calculation engines
│   │   ├── angles.ts             # Compound miter angle formulas
│   │   ├── volume.ts             # Interior volume calculations
│   │   └── materials.ts          # Board feet and lumber estimates
│   ├── utils/
│   │   ├── cn.ts                 # Class name utility
│   │   └── unitConversions.ts   # Unit conversion utilities
│   └── store.ts                  # Zustand state management
└── next.config.ts                # Next.js configuration (static export)
```

## Key Calculations

### Compound Miter Angles

For a regular polygon with `n` sides and side angle `α`:

**Blade Tilt (Bevel):**
```
β = arctan(tan(α) × sin(miter_angle))
```

**Miter Gauge Angle:**
```
γ = arctan(cos(α) × tan(miter_angle))
```

where `miter_angle = (180° - interior_angle) / 2`

### Distance Across Flats

For even-sided polygons only (4, 6, 8, etc.):
```
distance_across_flats = (diameter + 2 × thickness) × cos(180°/n)
```

This gives the **outer** measurement accounting for material thickness.

### Interior Volume

Uses truncated pyramid approximation:
```
V = (h/3) × (A₁ + A₂ + √(A₁ × A₂))
```

where:
- `A₁` = base area (accounting for material thickness)
- `A₂` = top area (adjusted for taper)
- `h` = project height

### Board Feet

```
board_feet = (length × width × thickness × quantity) / 144
```

with optional 10% waste factor

## Usage Tips

1. **Start with Project Type**: Choose General, Planter, Decorative, or Storage to get context-appropriate volume calculations

2. **Unit Selection**: The app automatically switches between inches/millimeters based on your unit system preference

3. **Material Thickness**: Use the preset dropdown for common lumber thicknesses, or enter a custom value

4. **Distance Across Flats**: This measurement only appears for even-sided shapes (4, 6, 8+ sides) as odd-sided polygons don't have parallel opposite sides

5. **3D Visualization**: Toggle "Show Material" to see how thickness affects the interior space

6. **Waste Factor**: Enable the 10% waste option to account for cutting errors and material defects

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Vercel will automatically detect Next.js and deploy with optimal settings

### Other Static Hosts

After running `npm run build`, deploy the contents of the `out` directory to:
- Netlify
- Cloudflare Pages
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS 14+, Android 9+)

## Future Enhancements

The PRD includes several features planned for future releases:
- Internationalization (i18n) with 7 languages
- URL state management for sharing configurations
- PDF export of calculations
- Material cost estimator
- Cut list generator
- AR visualization (mobile)

## License

MIT License - feel free to use this for your woodworking projects!

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## Acknowledgments

Built following modern web development best practices with a focus on:
- Type safety (TypeScript)
- Component reusability (shadcn/ui)
- Performance (static export)
- User experience (responsive design, helpful context)
