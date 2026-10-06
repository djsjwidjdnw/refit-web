/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // refit-iq.com/android: the Android APK, for installing outside Google Play.
      //
      // Not an expo.dev link, because EAS deletes internal-distribution artifacts 14 days
      // after the build (the 15 Sept link died on 29 Sept). The file lives in the PUBLIC
      // Supabase bucket `downloads` instead. Public means readable: only the service key can
      // write to it, because no storage policy names this bucket.
      //
      // permanent: false (307) on purpose. Browsers cache a 308 indefinitely, and this
      // target changes every time a new APK goes up.
      //
      // To ship a new APK: upload it under a NEW versioned name rather than overwriting this
      // one, change `destination`, deploy. The project's global upload cap is 50 MB and the
      // APK is ~108 MB, so raise the cap for the upload and put it back afterwards
      // (Management API, PATCH /v1/projects/<ref>/config/storage, fileSizeLimit).
      {
        source: '/android',
        destination:
          'https://aqhnfhjcnpsffsifzlhp.supabase.co/storage/v1/object/public/downloads/android/ReFitIQ-1.5.0-5153245c.apk',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
