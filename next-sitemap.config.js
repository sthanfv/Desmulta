/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://desmulta-ofi.vercel.app',
  generateRobotsTxt: false,
  exclude: ['/admin', '/api'],
  robotsTxtOptions: {
    additionalSitemaps: ['https://desmulta.com/sitemap-0.xml'],
  },
};
