/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://desmulta.vercel.app',
  generateRobotsTxt: false,
  exclude: ['/admin', '/api'],
  robotsTxtOptions: {
    additionalSitemaps: [],
  },
};
