import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    loader: 'custom',
    loaderFile: './app/lib/supabase/image-loader.ts',
  },
};

export default nextConfig;
