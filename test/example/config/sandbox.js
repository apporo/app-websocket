module.exports = {
  application: {
    enabled: true
  },
  plugins: {
    appWebsocket: {
    },
    appWebserver: {
      host: '0.0.0.0',
      port: 7878,
      verbose: false
    }
  }
};
