module.exports = {
  title: 'Vue Camera Gestures',
  description:
    'Let users control your Vue app using AI, their camera, and gestures of their choice in just 1 line of HTML!',
  head: [
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
    ],
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api-reference/' },
    ],
    sidebar: 'auto',
    lastUpdated: 'Last Updated',
    repo: 'danielelkington/vue-camera-gestures',
    docsDir: 'docs',
    editLinks: true,
  }
}
