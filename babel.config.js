module.exports = {
    presets: [
      ['@babel/preset-env', {
        targets: {
          node: 'current',
          browsers: ['> 1%', 'last 2 versions']
        }
      }],
      '@babel/preset-react',
      '@babel/preset-typescript'
    ],
    plugins: [
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-transform-runtime'
    ],
    env: {
      test: {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-react',
          '@babel/preset-typescript'
        ]
      }
    }
  };