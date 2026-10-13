import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 一度表示した動的ページを 30 秒間クライアントで再利用する（既定は 0 秒 = 毎回サーバーで再描画）。
    // 保存後は各画面で router.refresh() / SWR の mutate を呼んでいるので、自分の変更は即反映される。
    staleTimes: { dynamic: 30 },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
