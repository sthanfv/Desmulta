/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://desmulta.com',
    generateRobotsTxt: true,
    exclude: ['/admin', '/api'],
    robotsTxtOptions: {
        additionalSitemaps: [
            'https://desmulta.com/sitemap-0.xml',
        ],
    },
}
