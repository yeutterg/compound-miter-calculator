'use client';

import { InputPanel } from '@/components/panels/InputPanel';
import { ResultsPanel } from '@/components/panels/ResultsPanel';
import { Visualization3D } from '@/components/panels/Visualization3D';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
                Compound Miter Calculator
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Precise angle calculations for woodworking projects
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Two Column Layout: ALL Inputs Left, ALL Outputs Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - ALL INPUTS */}
          <div className="space-y-4 sm:space-y-6">
            <InputPanel />
          </div>

          {/* Right Column - ALL OUTPUTS */}
          <div className="space-y-4 sm:space-y-6">
            <ResultsPanel />
          </div>
        </div>

        {/* Full Width Bottom - 3D Visualization */}
        <div className="w-full">
          <Visualization3D />
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs sm:text-sm text-muted-foreground border-t pt-4 sm:pt-6">
          <p>
            Built with Next.js, React Three Fiber, and shadcn/ui
          </p>
          <p className="mt-1">
            All calculations performed client-side • No data collected
          </p>
        </div>
      </main>
    </div>
  );
}
