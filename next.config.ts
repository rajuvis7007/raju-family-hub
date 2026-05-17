import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './app/lib/supabase/image-loader.ts',
  },
};

export default nextConfig;
