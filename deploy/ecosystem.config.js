// PM2 : pm2 start deploy/ecosystem.config.js && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'pointage-pad',
      cwd: __dirname + '/../server',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      time: true,
    },
  ],
};
